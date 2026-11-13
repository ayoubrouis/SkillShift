import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('access_token')

    if (!accessToken) {
      return NextResponse.json({ error: 'access_token required' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: jobs } = await supabase
      .from('job_listings')
      .select('id, title, company_name, description, extracted_skills, created_at')
      .eq('recruiter_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ jobs: jobs || [] })
  } catch (error: any) {
    console.error('Jobs GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, access_token } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'title and description are required' }, { status: 400 })
    }
    if (!access_token) {
      return NextResponse.json({ error: 'access_token required' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: me } = await supabase.from('users').select('role, full_name').eq('id', user.id).single()
    if (me?.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Only recruiters can post jobs' }, { status: 403 })
    }

    // Extract skills via AI (HuggingFace)
    let extractedSkills: string[] = []
    try {
      const skillRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/extract-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description }),
      })
      const skillData = await skillRes.json()
      extractedSkills = skillData.skills || []
    } catch (e) {
      console.error('Skill extraction failed (non-fatal):', e)
    }

    const { data: job } = await supabase
      .from('job_listings')
      .insert({
        title,
        company_name: me.full_name || 'Unknown Company',
        description,
        extracted_skills: extractedSkills,
        source: 'MANUAL',
        recruiter_id: user.id,
        is_active: true,
      })
      .select()
      .single()

    return NextResponse.json({ job, extracted_skills: extractedSkills })
  } catch (error: any) {
    console.error('Jobs POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('id')
    const accessToken = searchParams.get('access_token')

    if (!jobId || !accessToken) {
      return NextResponse.json({ error: 'id and access_token required' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: me } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (me?.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Only recruiters can delete jobs' }, { status: 403 })
    }

    const { data: job } = await supabase
      .from('job_listings')
      .select('id, recruiter_id')
      .eq('id', jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.recruiter_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own jobs' }, { status: 403 })
    }

    const { error } = await supabase.from('job_listings').delete().eq('id', jobId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Jobs DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
