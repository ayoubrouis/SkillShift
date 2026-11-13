import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { groqChat } from '@/lib/openaiClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Ollama integration removed – using Groq instead

const DEMAND_THRESHOLD = 0.6 // skills above this demand get 7 checkpoints
const NUM_CHECKPOINTS_LOW = 5
const NUM_CHECKPOINTS_HIGH = 7


function sanitizeJsonString(str: string): string {
  let inString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (inString) {
      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === '\\') {
        result += char;
        escaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else {
        const code = char.charCodeAt(0);
        if (code < 32) {
          if (char === '\n') result += '\\n';
          else if (char === '\r') result += '\\r';
          else if (char === '\t') result += '\\t';
          else {
            result += '\\u' + code.toString(16).padStart(4, '0');
          }
        } else {
          result += char;
        }
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }
  return result;
}

async function callGroq(skillName: string, category: string, numCheckpoints: number): Promise<any> {
  const prompt = `Generate a learning roadmap for the skill "${skillName}" (category: ${category}) with exactly ${numCheckpoints} checkpoints from beginner to advanced. Keep content brief (2-3 sentences per section).

Each checkpoint needs:
- title: short name
- description: 1 sentence overview
- content: plain text with sections separated by double newlines:
  Learn:
  (2-3 sentences of core concepts)

  Practice:
  (2-3 sentences describing an exercise)

  Resources:
  (what to search on YouTube/GitHub)

  For the FINAL checkpoint only, replace Resources with:
  Project:
  (mini-project with problem, requirements, deliverables)
- is_final: true only for the last checkpoint
- quizzes: exactly 3 questions, 4 options each (just the text, no a/b/c/d prefix), answer is 0-based index

Return ONLY valid JSON:
{"checkpoints":[{"title":"...","description":"...","content":"...","is_final":false,"quizzes":[{"question":"...","options":["text","text","text","text"],"answer":0}]}]}`;
  const messages = [{ role: 'system' as const, content: 'You output ONLY valid JSON. No markdown, no code fences, no explanation.' }, { role: 'user' as const, content: prompt }];
  const response = await groqChat(messages);
  // groqChat returns plain text; attempt to extract JSON object
  const s = response.indexOf('{');
  const e = response.lastIndexOf('}');
  let jsonStr = response;
  if (s >= 0 && e > s) jsonStr = response.slice(s, e + 1);
  
  // Sanitize the raw JSON string before parsing to handle raw control characters (like literal newlines)
  const sanitizedJsonStr = sanitizeJsonString(jsonStr);
  return JSON.parse(sanitizedJsonStr);
}


function normalizeContent(cp: any): string {
  const raw = cp.content
  if (typeof raw === 'string' && raw.length > 0) return raw
  if (typeof raw === 'object' && raw !== null) {
    const parts: string[] = []
    const sections: [string, string][] = [
      ['Learn', raw.Learn || raw.learn || raw['📖 Learn'] || ''],
      ['Practice', raw.Practice || raw.practice || raw['✏️ Practice'] || ''],
      ['Resources', raw.Resources || raw.resources || raw['🔗 Resources'] || ''],
    ]
    if (cp.is_final) {
      sections[2] = ['Project', raw.Project || raw.project || raw['🚀 Project'] || '']
    }
    for (const [label, text] of sections) {
      if (text) parts.push(`${label}:\n${text}`)
    }
    return parts.join('\n\n')
  }
  return String(raw || '')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { skill_id } = body

    if (!skill_id) {
      return NextResponse.json({ error: 'skill_id is required' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('roadmap_templates')
      .select('id')
      .eq('skill_id', skill_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: 'Roadmap already exists', template_id: existing.id })
    }

    const { data: skill } = await supabase
      .from('skills')
      .select('name, category, demand_score')
      .eq('id', skill_id)
      .single()

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
    }

    const demandScore = skill.demand_score ?? 0
    const checkpointCount = demandScore >= DEMAND_THRESHOLD ? NUM_CHECKPOINTS_HIGH : NUM_CHECKPOINTS_LOW

    const result = await callGroq(skill.name, skill.category, checkpointCount);
    const cps = result.checkpoints || []

    const { data: template } = await supabase
      .from('roadmap_templates')
      .insert({ skill_id })
      .select()
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    for (let ci = 0; ci < cps.length; ci++) {
      const cp = cps[ci]
      const content = normalizeContent(cp)
      const { data: cpRec } = await supabase
        .from('roadmap_checkpoints')
        .insert({
          template_id: template.id,
          step_index: ci,
          title: cp.title || `Step ${ci + 1}`,
          description: cp.description || '',
          content,
          is_final: cp.is_final || ci === cps.length - 1,
        })
        .select()
        .single()

      if (!cpRec) continue

      const quizzes = cp.quizzes || []
      for (const qq of quizzes) {
        await supabase.from('checkpoint_quizzes').insert({
          checkpoint_id: cpRec.id,
          question: qq.question || '',
          options: JSON.stringify(qq.options || ['A', 'B', 'C', 'D']),
          answer: qq.answer ?? 0,
        })
      }
    }

    return NextResponse.json({
      message: 'Roadmap generated',
      template_id: template.id,
      checkpoints_count: cps.length,
      demand_score: demandScore,
      checkpoint_tier: checkpointCount === NUM_CHECKPOINTS_HIGH ? 'advanced' : 'standard',
    })
  } catch (error: any) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
