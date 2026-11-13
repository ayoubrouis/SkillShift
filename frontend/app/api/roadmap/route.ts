import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const skillId = searchParams.get('skill_id')
    const userId = searchParams.get('user_id')

    if (!skillId) {
      return NextResponse.json({ error: 'skill_id is required' }, { status: 400 })
    }

    // Get roadmap template for this skill
    const { data: template } = await supabase
      .from('roadmap_templates')
      .select('id')
      .eq('skill_id', skillId)
      .maybeSingle()

    if (!template) {
      return NextResponse.json({ error: 'No roadmap found for this skill' }, { status: 404 })
    }

    // Get checkpoints with quizzes
    const { data: checkpoints } = await supabase
      .from('roadmap_checkpoints')
      .select('id, step_index, title, description, content, is_final')
      .eq('template_id', template.id)
      .order('step_index', { ascending: true })

    // Get quizzes for each checkpoint
    const checkpointIds = (checkpoints || []).map(c => c.id)
    const { data: quizzes } = await supabase
      .from('checkpoint_quizzes')
      .select('id, checkpoint_id, question, options, answer')
      .in('checkpoint_id', checkpointIds)

    const quizzesByCheckpoint: Record<string, any[]> = {}
    for (const q of quizzes || []) {
      if (!quizzesByCheckpoint[q.checkpoint_id]) quizzesByCheckpoint[q.checkpoint_id] = []
      quizzesByCheckpoint[q.checkpoint_id].push({
        id: q.id,
        question: q.question,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      })
    }

    // Attach quizzes to checkpoints (without answers for client)
    const checkpointsWithQuizzes = (checkpoints || []).map(cp => ({
      ...cp,
      quizzes: quizzesByCheckpoint[cp.id] || [],
    }))

    // Get user progress
    let progress = null
    if (userId) {
      const { data: prog } = await supabase
        .from('user_roadmaps')
        .select('current_step, passed_steps, completed_at')
        .eq('user_id', userId)
        .eq('skill_id', skillId)
        .maybeSingle()
      progress = prog
    }

    return NextResponse.json({
      template_id: template.id,
      checkpoints: checkpointsWithQuizzes,
      progress,
    })
  } catch (error: any) {
    console.error('Roadmap GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
