import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const candidateId = req.nextUrl.searchParams.get('candidate_id')
    if (!candidateId) return NextResponse.json({ error: 'Missing candidate_id' }, { status: 400 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const [skillsRes, userSkillsRes, resumeRes, userRes] = await Promise.all([
      admin.from('skills').select('id, name, normalized_name, category, demand_score, avg_salary, frequency'),
      admin.from('user_skills').select('skill_id').eq('user_id', candidateId),
      admin.from('resumes').select('id').eq('student_id', candidateId).eq('parsing_status', 'DONE').order('upload_date', { ascending: false }).limit(1).maybeSingle(),
      admin.from('users').select('id, full_name, email').eq('id', candidateId).single(),
    ])

    let resumeSkillIds: string[] = []
    if (resumeRes.data) {
      const rsRes = await admin.from('resume_skills').select('skill_id').eq('resume_id', resumeRes.data.id)
      resumeSkillIds = (rsRes.data || []).map((r: any) => r.skill_id)
    }

    return NextResponse.json({
      skills: skillsRes.data || [],
      userSkills: userSkillsRes.data || [],
      resumeSkills: resumeSkillIds,
      user: userRes.data,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
