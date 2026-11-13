import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, skill_id, checkpoint_id, quiz_id, selected_answer, access_token } = body

    if (!user_id || !skill_id || !checkpoint_id || quiz_id === undefined || selected_answer === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Auth check using provided access token
    const { data: { user } } = await supabase.auth.getUser(access_token)
    if (!user || user.id !== user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: max 100 quiz submissions per hour
    const hourAgo = new Date(Date.now() - 3600000).toISOString()
    const { count: recentCount } = await supabase
      .from('rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('action', 'quiz_submit')
      .gte('window_start', hourAgo)

    if ((recentCount || 0) >= 100) {
      return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
    }

    // Log this submission (best-effort, errors ignored)
    try {
      await supabase.from('rate_limits').insert({
        user_id,
        action: 'quiz_submit',
        window_start: new Date().toISOString(),
      })
    } catch {}

    // Get correct answer
    const { data: quiz } = await supabase
      .from('checkpoint_quizzes')
      .select('answer')
      .eq('id', quiz_id)
      .single()

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    const correct = selected_answer === quiz.answer
    let progress = null
    let completed = false

    if (correct) {
      // Get or create user roadmap progress
      const { data: existing } = await supabase
        .from('user_roadmaps')
        .select('id, current_step, passed_steps')
        .eq('user_id', user_id)
        .eq('skill_id', skill_id)
        .maybeSingle()

      if (existing) {
        // Update progress: add checkpoint_id to passed_steps if not already there
        const passed = existing.passed_steps || []
        if (!passed.includes(checkpoint_id)) {
          passed.push(checkpoint_id)
        }
        const { data: updated } = await supabase
          .from('user_roadmaps')
          .update({
            passed_steps: passed,
            current_step: passed.length,
          })
          .eq('id', existing.id)
          .select()
          .single()
        progress = updated
      } else {
        // Create new progress
        const { data: created } = await supabase
          .from('user_roadmaps')
          .insert({
            user_id,
            skill_id,
            current_step: 1,
            passed_steps: [checkpoint_id],
          })
          .select()
          .single()
        progress = created
      }
    }

    return NextResponse.json({
      correct,
      progress,
      completed,
    })
  } catch (error: any) {
    console.error('Roadmap advance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
