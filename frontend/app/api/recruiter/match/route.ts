import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_id, access_token } = body

    if (!job_id || !access_token) {
      return NextResponse.json({ error: 'job_id and access_token required' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (me?.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Only recruiters can match' }, { status: 403 })
    }

    // Get the job listing with extracted skills
    const { data: job } = await supabase
      .from('job_listings')
      .select('id, title, extracted_skills, recruiter_id')
      .eq('id', job_id)
      .single()

    if (!job || job.recruiter_id !== user.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    let requiredSkills: string[] = []
    try {
      requiredSkills = typeof job.extracted_skills === 'string'
        ? JSON.parse(job.extracted_skills)
        : job.extracted_skills || []
    } catch { requiredSkills = [] }

    if (requiredSkills.length === 0) {
      return NextResponse.json({ matches: [], message: 'No skills extracted for this job yet. Try editing and re-saving.' })
    }

    // Get all JOB_SEEKER users with their skills
    const { data: seekerUsers } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'JOB_SEEKER')
      .limit(200)

    const seekerIds = (seekerUsers || []).map(u => u.id)

    const { data: resumes } = await supabase
      .from('resumes')
      .select('id, student_id')
      .in('student_id', seekerIds)

    const resumeIds = (resumes || []).map(r => r.id)
    const studentIdToResumeId = new Map((resumes || []).map(r => [r.student_id, r.id]))

    const { data: resumeSkills } = await supabase
      .from('resume_skills')
      .select('resume_id, skill_id')
      .in('resume_id', resumeIds)

    const skillIds = [...new Set((resumeSkills || []).map(rs => rs.skill_id))]
    const { data: allSkills } = await supabase
      .from('skills')
      .select('id, name')
      .in('id', skillIds)
    const skillNameMap = new Map((allSkills || []).map(s => [s.id, s.name]))

    // Build user->skills map
    const userSkillsMap = new Map<string, string[]>()
    for (const rs of resumeSkills || []) {
      const sid = [...studentIdToResumeId.entries()].find(([, rid]) => rid === rs.resume_id)?.[0]
      if (!sid) continue
      if (!userSkillsMap.has(sid)) userSkillsMap.set(sid, [])
      const name = skillNameMap.get(rs.skill_id)
      if (name) userSkillsMap.get(sid)!.push(name)
    }

    // Compute match scores
    const reqLower = requiredSkills.map(s => s.toLowerCase())
    const matches = (seekerUsers || []).map(u => {
      const userSkills = userSkillsMap.get(u.id) || []
      const userLower = userSkills.map(s => s.toLowerCase())
      const matched = reqLower.filter(r => userLower.some(us => us.includes(r) || r.includes(us)))
      const score = requiredSkills.length > 0 ? matched.length / requiredSkills.length : 0
      return {
        candidate_id: u.id,
        full_name: u.full_name,
        email: u.email,
        matched_skills: matched,
        matched_count: matched.length,
        total_required: requiredSkills.length,
        score: Math.round(score * 100),
      }
    }).filter(m => m.score > 0).sort((a, b) => b.score - a.score)

    // Log matches — delete existing then insert fresh
    await supabase.from('match_logs').delete()
      .eq('recruiter_id', user.id)
      .eq('listing_id', job_id)

    for (const m of matches) {
      await supabase.from('match_logs').insert({
        recruiter_id: user.id,
        student_id: m.candidate_id,
        listing_id: job_id,
        status: 'MATCHED',
        matched_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ matches, job_title: job.title, required_skills: requiredSkills })
  } catch (error: any) {
    console.error('Match error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
