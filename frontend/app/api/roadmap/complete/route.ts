import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, skill_id, access_token } = body

    if (!user_id || !skill_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Auth check using provided access token
    const { data: { user } } = await supabase.auth.getUser(access_token)
    if (!user || user.id !== user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: max 10 completions per day
    const dayAgo = new Date(Date.now() - 86400000).toISOString()
    const { count: recentCompletions } = await supabase
      .from('user_skills')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('acquired_at', dayAgo)

    if ((recentCompletions || 0) >= 10) {
      return NextResponse.json({ error: 'Max 10 skill completions per day' }, { status: 429 })
    }

    // Get roadmap template
    const { data: template } = await supabase
      .from('roadmap_templates')
      .select('id')
      .eq('skill_id', skill_id)
      .maybeSingle()

    if (!template) {
      return NextResponse.json({ error: 'No roadmap for this skill' }, { status: 404 })
    }

    // Get total checkpoint count
    const { count: totalSteps } = await supabase
      .from('roadmap_checkpoints')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', template.id)

    // Get user progress
    const { data: progress } = await supabase
      .from('user_roadmaps')
      .select('passed_steps')
      .eq('user_id', user_id)
      .eq('skill_id', skill_id)
      .maybeSingle()

    const passedCount = (progress?.passed_steps || []).length

    if (passedCount < (totalSteps || 0)) {
      return NextResponse.json({
        error: `Complete all ${totalSteps} checkpoints first (${passedCount}/${totalSteps} done)`
      }, { status: 400 })
    }

    // Mark roadmap as completed
    const { data: updated } = await supabase
      .from('user_roadmaps')
      .update({ completed_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('skill_id', skill_id)
      .select()
      .single()

    // Add skill to user_skills (marks it as acquired)
    const { error: insertError } = await supabase
      .from('user_skills')
      .upsert({
        user_id,
        skill_id,
        source: 'roadmap',
      }, { onConflict: 'user_id,skill_id' })

    if (insertError) {
      console.error('user_skills insert error:', insertError)
    }

    return NextResponse.json({
      success: true,
      message: 'Skill acquired!',
      progress: updated,
    })
  } catch (error: any) {
    console.error('Roadmap complete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
