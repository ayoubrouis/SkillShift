import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const accessToken = searchParams.get('access_token')

    if (!accessToken) {
      return NextResponse.json({ error: 'access_token required' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (me?.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Only recruiters can view candidates' }, { status: 403 })
    }

    // 1. Get all JOB_SEEKER users
    const { data: seekerUsers } = await supabase
      .from('users')
      .select('id, full_name, email, created_at')
      .eq('role', 'JOB_SEEKER')
      .limit(200)

    // 2. Get all resumes for these users
    const seekerIds = (seekerUsers || []).map(u => u.id)
    const { data: resumes } = await supabase
      .from('resumes')
      .select('id, student_id')
      .in('student_id', seekerIds)

    const resumeIds = (resumes || []).map(r => r.id)
    const studentIdToResumeId = new Map((resumes || []).map(r => [r.student_id, r.id]))

    // 3. Get all resume_skills for these resumes
    const { data: resumeSkills } = await supabase
      .from('resume_skills')
      .select('resume_id, skill_id, proficiency')
      .in('resume_id', resumeIds)

    // 4. Get skill names
    const skillIds = [...new Set((resumeSkills || []).map(rs => rs.skill_id))]
    const { data: allSkills } = await supabase
      .from('skills')
      .select('id, name')
      .in('id', skillIds)
    const skillNameMap = new Map((allSkills || []).map(s => [s.id, s.name]))

    // 5. Build skill map per user
    const userSkillsMap = new Map<string, { name: string; proficiency: string }[]>()
    for (const rs of resumeSkills || []) {
      const sid = [...studentIdToResumeId.entries()].find(([, rid]) => rid === rs.resume_id)?.[0]
      if (!sid) continue
      if (!userSkillsMap.has(sid)) userSkillsMap.set(sid, [])
      userSkillsMap.get(sid)!.push({ name: skillNameMap.get(rs.skill_id) || rs.skill_id, proficiency: rs.proficiency })
    }

    // 6. Build candidate list
    let candidates = (seekerUsers || []).map(u => {
      const skills = userSkillsMap.get(u.id) || []
      const skillNames = skills.map(s => s.name.toLowerCase())
      if (search && !skillNames.some(n => n.includes(search.toLowerCase())) &&
          !u.full_name?.toLowerCase().includes(search.toLowerCase())) {
        return null
      }
      return { id: u.id, full_name: u.full_name, email: u.email, created_at: u.created_at, skills, skill_count: skills.length }
    }).filter(Boolean)

    candidates.sort((a: any, b: any) => b.skill_count - a.skill_count)

    return NextResponse.json({ candidates })
  } catch (error: any) {
    console.error('Candidates error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
