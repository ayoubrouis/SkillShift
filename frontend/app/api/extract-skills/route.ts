import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { groqChat } from '@/lib/openaiClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: 'Text must be at least 10 characters' }, { status: 400 })
    }

    const prompt = `Extract skill names/keywords from this job description. Return ONLY a JSON array of strings — the skill names. No explanation, no markdown.

Job description:
${text.slice(0, 3000)}`

    const result = await groqChat([
      { role: 'system', content: 'You output ONLY valid JSON arrays of skill names. No explanation, no markdown.' },
      { role: 'user', content: prompt }
    ], { maxTokens: 256 });

    let content = (result || '[]').trim()
    const s = content.indexOf('[')
    const e = content.lastIndexOf(']')
    if (s >= 0 && e > s) content = content.slice(s, e + 1)

    let skills: string[] = []
    try { skills = JSON.parse(content) } catch { skills = [] }
    if (!Array.isArray(skills)) skills = []

    skills = [...new Set(skills.map((s: string) => s.trim()).filter(Boolean))]

    const { data: knownSkills } = await supabase.from('skills').select('name')
    const knownNames = new Set((knownSkills || []).map(s => s.name.toLowerCase()))

    const matched = skills.filter(s => knownNames.has(s.toLowerCase()))
    const unmatched = skills.filter(s => !knownNames.has(s.toLowerCase()))

    return NextResponse.json({ skills: matched, suggested: unmatched })
  } catch (error: any) {
    console.error('Extract skills error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
