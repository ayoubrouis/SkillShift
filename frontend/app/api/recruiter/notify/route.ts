import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidate_id, job_id, message, access_token } = body

    if (!candidate_id || !access_token) {
      return NextResponse.json({ error: 'candidate_id and access_token required' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: me } = await supabase.from('users').select('role, full_name').eq('id', user.id).single()
    if (me?.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Only recruiters can send notifications' }, { status: 403 })
    }

    // Insert notification for the candidate
    const title = `New opportunity from ${me.full_name || 'a recruiter'}`
    const msg = message || `You have been matched with a job opportunity. Check your dashboard for details.`

    await supabase.from('notifications').insert({
      user_id: candidate_id,
      title,
      message: msg,
      is_read: false,
    })

    // Also log in match_logs if a job_id was provided
    if (job_id) {
      const { data: existing } = await supabase
        .from('match_logs')
        .select('id')
        .eq('recruiter_id', user.id)
        .eq('student_id', candidate_id)
        .eq('listing_id', job_id)
        .maybeSingle()

      if (!existing) {
        await supabase.from('match_logs').insert({
          recruiter_id: user.id,
          student_id: candidate_id,
          listing_id: job_id,
          status: 'NOTIFIED',
        })
      } else {
        await supabase.from('match_logs').update({ status: 'NOTIFIED' }).eq('id', existing.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Notify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
