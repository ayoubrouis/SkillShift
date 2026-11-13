import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { groqChat } from '@/lib/openaiClient';
import { PDFParse } from 'pdf-parse';
import path from 'path';
import { pathToFileURL } from 'url';

// Skills are pre-seeded from the 528-skills dataset (scripts/seed_skills.py).
// This route matches extracted skills against existing seeded skills by name.
// If a skill is not found in the 528, a new entry is created (frequency: 1).

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize PDF worker
try {
  const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
  const workerUrl = pathToFileURL(workerPath).href;
  PDFParse.setWorker(workerUrl);
} catch (error) {
  console.error('Failed to initialize PDF worker:', error);
}

interface ExtractedSkill {
  name: string;
  category: string;
  source: 'ai' | 'keyword';
}

async function extractTextFromPDF(base64Data: string): Promise<{ text: string; pages: number }> {
  let parser: PDFParse | null = null;
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    return {
      text: textResult.text || '',
      pages: textResult.pages?.length || 1,
    };
  } catch (error: any) {
    console.error('pdf-parse failed:', error);
    throw new Error(`PDF parsing failed: ${error.message || error}`);
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s\-\+\#\.]/g, ' ');
}

function skillExistsInText(skillName: string, text: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedSkill = normalizeText(skillName);
  
  const skillVariations = [
    normalizedSkill,
    normalizedSkill.replace(/\s+/g, ''),
    normalizedSkill.replace(/[\.\-\+]/g, ''),
    normalizedSkill.replace(/js$/i, 'javascript'),
    normalizedSkill.replace(/ts$/i, 'typescript'),
    normalizedSkill.replace(/ml$/i, 'machine learning'),
  ];
  
  for (const variation of skillVariations) {
    const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedVariation}\\b`, 'i');
    if (regex.test(normalizedText)) {
      return true;
    }
  }
  
  return false;
}

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

/**
 * Use Groq (cloud LLM) to extract skills from resume text.
 * Replaces the old Ollama vision-based approach.
 */
async function extractSkillsWithAI(resumeText: string): Promise<ExtractedSkill[]> {
  console.log('Extracting skills with Groq AI...');

  const prompt = `You are a skill extraction expert. Analyze this resume text and list ALL technical skills, tools, frameworks, programming languages, and professional competencies mentioned.

Return ONLY a JSON array of objects with "name" and "category" fields. Categories should be one of: Programming, ML, Cloud, DevOps, Data, Cybersecurity, Soft Skills.

Example: [{"name":"Python","category":"Programming"},{"name":"TensorFlow","category":"ML"}]

Resume text:
${resumeText.slice(0, 4000)}`;

  try {
    const messages = [
      { role: 'system' as const, content: 'You output ONLY valid JSON arrays. No markdown, no code fences, no explanation.' },
      { role: 'user' as const, content: prompt }
    ];
    const response = await groqChat(messages);

    // Extract JSON array from response
    let content = response.trim();
    const s = content.indexOf('[');
    const e = content.lastIndexOf(']');
    if (s >= 0 && e > s) content = content.slice(s, e + 1);

    const sanitized = sanitizeJsonString(content);
    const parsed = JSON.parse(sanitized);
    if (!Array.isArray(parsed)) return [];


    const skills: ExtractedSkill[] = parsed
      .filter((item: any) => item.name && typeof item.name === 'string')
      .map((item: any) => ({
        name: item.name.trim(),
        category: item.category || categorizeSkill(item.name),
        source: 'ai' as const
      }));

    console.log(`Groq AI extracted ${skills.length} skills`);
    return skills;
  } catch (error) {
    console.error('Groq AI extraction error:', error);
    return [];
  }
}

function extractSkillsFromText(text: string): ExtractedSkill[] {
  const skillPatterns: { pattern: RegExp; name: string }[] = [
    { pattern: /\bpython\b/gi, name: 'Python' },
    { pattern: /\bR\b/gi, name: 'R' },
    { pattern: /\bjava(?!script)/gi, name: 'Java' },
    { pattern: /\bjavascript\b|\bjs\b/gi, name: 'JavaScript' },
    { pattern: /\btypescript\b|\bts\b/gi, name: 'TypeScript' },
    { pattern: /\bc\+\+\b/gi, name: 'C++' },
    { pattern: /\bc#\b/gi, name: 'C#' },
    { pattern: /\b(react|reactjs|react\.js)\b/gi, name: 'React' },
    { pattern: /\b(vue|vuejs|vue\.js)\b/gi, name: 'Vue.js' },
    { pattern: /\bangular\b/gi, name: 'Angular' },
    { pattern: /\bhtml5?\b/gi, name: 'HTML' },
    { pattern: /\bcss3?\b/gi, name: 'CSS' },
    { pattern: /\b(django|flask|fastapi)\b/gi, name: 'Python' },
    { pattern: /\b(express|expressjs)\b/gi, name: 'Express.js' },
    { pattern: /\b(node|nodejs)\b/gi, name: 'Node.js' },
    { pattern: /\b(mysql|postgresql|postgres)\b/gi, name: 'PostgreSQL' },
    { pattern: /\bmongodb\b/gi, name: 'MongoDB' },
    { pattern: /\bredis\b/gi, name: 'Redis' },
    { pattern: /\bsqlite\b/gi, name: 'SQLite' },
    { pattern: /\bsql\b/gi, name: 'SQL' },
    { pattern: /\b(aws|amazon web services)\b/gi, name: 'AWS' },
    { pattern: /\bazure\b/gi, name: 'Azure' },
    { pattern: /\b(gcp|google cloud)\b/gi, name: 'GCP' },
    { pattern: /\bdocker\b/gi, name: 'Docker' },
    { pattern: /\bkubernetes\b/gi, name: 'Kubernetes' },
    { pattern: /\bk8s\b/gi, name: 'Kubernetes' },
    { pattern: /\b(jenkins|terraform|ansible|gitlab)\b/gi, name: 'DevOps' },
    { pattern: /\bgithub actions\b/gi, name: 'GitHub Actions' },
    { pattern: /\b(linux|unix|ubuntu)\b/gi, name: 'Linux' },
    { pattern: /\b(git|github|bitbucket)\b/gi, name: 'Git' },
    { pattern: /\btensorflow\b/gi, name: 'TensorFlow' },
    { pattern: /\bpytorch\b/gi, name: 'PyTorch' },
    { pattern: /\bkeras\b/gi, name: 'Keras' },
    { pattern: /\bpandas\b/gi, name: 'Pandas' },
    { pattern: /\bnumpy\b/gi, name: 'NumPy' },
    { pattern: /\bscikit-learn\b/gi, name: 'Scikit-learn' },
    { pattern: /\bsklearn\b/gi, name: 'Scikit-learn' },
    { pattern: /\bmachine learning\b/gi, name: 'Machine Learning' },
    { pattern: /\bdeep learning\b/gi, name: 'Deep Learning' },
    { pattern: /\bai\b/gi, name: 'AI' },
    { pattern: /\bnlp\b/gi, name: 'NLP' },
    { pattern: /\bcomputer vision\b/gi, name: 'Computer Vision' },
    { pattern: /\btableau\b/gi, name: 'Tableau' },
    { pattern: /\bpower ?bi\b/gi, name: 'Power BI' },
    { pattern: /\bexcel\b/gi, name: 'Excel' },
    { pattern: /\bstatistical analysis\b/gi, name: 'Statistical Analysis' },
    { pattern: /\bstatistics\b/gi, name: 'Statistics' },
    { pattern: /\b(figma|sketch|adobe)\b/gi, name: 'Figma' },
    { pattern: /\b(jira|agile|scrum|kanban)\b/gi, name: 'Agile' },
  ];

  const foundSkills = new Map<string, ExtractedSkill>();
  
  for (const { pattern, name } of skillPatterns) {
    if (pattern.test(text)) {
      if (!foundSkills.has(name)) {
        foundSkills.set(name, { name, category: categorizeSkill(name), source: 'keyword' });
      }
    }
  }
  
  return Array.from(foundSkills.values());
}

function categorizeSkill(skillName: string): string {
  const name = skillName.toLowerCase();
  
  const categories: Record<string, string[]> = {
    'Programming': ['python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'react', 'vue', 'angular', 'html', 'css', 'svelte', 'next', 'tailwind', 'node', 'express', 'django', 'flask', 'fastapi', 'spring', 'rails', 'laravel', 'jira', 'agile', 'scrum'],
    'ML': ['tensorflow', 'pytorch', 'pandas', 'numpy', 'machine learning', 'ml', 'ai', 'nlp', 'deep learning', 'keras'],
    'Cloud': ['aws', 'azure', 'gcp', 'google cloud', 'amazon'],
    'DevOps': ['docker', 'kubernetes', 'git', 'linux', 'jenkins', 'terraform', 'ansible', 'github actions'],
    'Data': ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'sql', 'postgres', 'tableau', 'power bi', 'excel', 'statistics', 'statistical', 'data analysis'],
    'Cybersecurity': ['security', 'cybersecurity', 'penetration', 'ethical hacking'],
    'Soft Skills': ['figma', 'sketch', 'adobe', 'photoshop', 'communication', 'leadership']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => name.includes(kw))) {
      return category;
    }
  }

  return 'Programming';
}

function mergeAndValidateSkills(
  aiSkills: ExtractedSkill[],
  textSkills: ExtractedSkill[],
  actualText: string
): ExtractedSkill[] {
  const validatedSkills = new Map<string, ExtractedSkill>();
  
  console.log(`Merging ${aiSkills.length} AI + ${textSkills.length} text skills`);
  
  // AI skills are verified against the actual resume text
  for (const skill of aiSkills) {
    if (skillExistsInText(skill.name, actualText)) {
      validatedSkills.set(skill.name.toLowerCase(), {
        ...skill,
        category: skill.category || categorizeSkill(skill.name),
        source: 'ai'
      });
      console.log(`✓ AI skill verified in text: ${skill.name}`);
    } else {
      console.log(`✗ AI skill NOT in text (filtered): ${skill.name}`);
    }
  }
  
  // Text/keyword skills always pass
  for (const skill of textSkills) {
    const key = skill.name.toLowerCase();
    if (!validatedSkills.has(key)) {
      validatedSkills.set(key, {
        ...skill,
        category: skill.category || categorizeSkill(skill.name)
      });
      console.log(`+ Text skill added: ${skill.name}`);
    }
  }
  
  return Array.from(validatedSkills.values());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resume_id, file_data, file_type } = body;

    if (!resume_id || !file_data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (file_type !== 'pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    console.log('='.repeat(50));
    console.log('Starting resume parsing...');
    
    console.log('Step 1: Extracting text from PDF...');
    const textResult = await extractTextFromPDF(file_data);
    console.log(`  - Extracted ${textResult.text.length} characters, ${textResult.pages} pages`);
    
    if (!textResult.text || textResult.text.trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    console.log('Step 2: Extracting skills with Groq AI...');
    const aiSkills = await extractSkillsWithAI(textResult.text);
    
    console.log('Step 3: Extracting skills from text (keyword fallback)...');
    const textSkills = extractSkillsFromText(textResult.text);
    
    console.log('Step 4: Merging and validating skills...');
    const mergedSkills = mergeAndValidateSkills(
      aiSkills,
      textSkills,
      textResult.text
    );
    
    const finalSkills = mergedSkills.map(skill => ({
      name: skill.name,
      category: skill.category || categorizeSkill(skill.name),
      source: skill.source
    }));
    
    console.log(`Final result: ${finalSkills.length} skills extracted`);
    console.log('Skills:', finalSkills.map(s => `${s.name} (${s.source})`));
    console.log('='.repeat(50));

    await supabase
      .from('resumes')
      .update({ parsing_status: 'DONE' })
      .eq('id', resume_id);

    for (const skill of finalSkills) {
      try {
        const { data: existingSkill } = await supabase
          .from('skills')
          .select('id')
          .ilike('name', skill.name)
          .maybeSingle();

        let skillId = existingSkill?.id;

        if (!skillId) {
          const { data: newSkill, error: skillError } = await supabase
            .from('skills')
            .insert({
              name: skill.name,
              normalized_name: skill.name.toLowerCase().replace(/\s+/g, '_'),
              category: skill.category,
              frequency: 1
            })
            .select('id')
            .single();

          if (skillError) {
            console.error(`Failed to create skill "${skill.name}":`, skillError);
            continue;
          }
          skillId = newSkill?.id;
        }

        if (skillId) {
          const { error: rsError } = await supabase
            .from('resume_skills')
            .insert({
              resume_id: resume_id,
              skill_id: skillId,
              proficiency: 'Intermediate'
            });

          if (rsError) {
            console.error(`Failed to link skill "${skill.name}" to resume:`, rsError);
          }
        }
      } catch (e) {
        console.error('Skill processing error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      skills_extracted: finalSkills.length,
      resume_id: resume_id,
      pages_processed: textResult.pages,
      skills: finalSkills
    });

  } catch (error: any) {
    console.error('Resume parser error:', error);
    
    try {
      const body = await request.json();
      if (body.resume_id) {
        await supabase
          .from('resumes')
          .update({ parsing_status: 'FAILED' })
          .eq('id', body.resume_id);
      }
    } catch {}

    return NextResponse.json(
      { error: error.message || 'Failed to parse resume' },
      { status: 500 }
    );
  }
}