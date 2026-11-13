import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { resume_id, skills } = await request.json();

    if (!resume_id || !Array.isArray(skills)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Clear existing resume skills
    const { error: deleteError } = await supabase
      .from('resume_skills')
      .delete()
      .eq('resume_id', resume_id);

    if (deleteError) {
      console.error('Error deleting existing skills:', deleteError);
      return NextResponse.json({ error: 'Failed to update skills' }, { status: 500 });
    }

    // Add new skills
    for (const skillData of skills) {
      const { name, category } = skillData;

      // Ensure skill exists in skills table (case-insensitive match)
      const { data: existingSkill } = await supabase
        .from('skills')
        .select('id')
        .ilike('name', name)
        .maybeSingle();

      let skillId = existingSkill?.id;

      if (!skillId) {
        // Create new skill
        const { data: newSkill, error: skillError } = await supabase
          .from('skills')
          .insert({
            name,
            normalized_name: name.toLowerCase().replace(/\s+/g, '_'),
            category: category || 'Programming'
          })
          .select('id')
          .single();

        if (skillError) {
          console.error('Error creating skill:', skillError);
          continue;
        }
        skillId = newSkill.id;
      }

      // Add to resume_skills
      const { error: resumeSkillError } = await supabase
        .from('resume_skills')
        .insert({
          resume_id,
          skill_id: skillId,
          proficiency: 'Intermediate'
        });

      if (resumeSkillError) {
        console.error('Error adding resume skill:', resumeSkillError);
      }
    }

    return NextResponse.json({ success: true, skills_updated: skills.length });
  } catch (error: any) {
    console.error('Update resume skills error:', error);
    return NextResponse.json(
      { error: 'Failed to update resume skills: ' + error.message },
      { status: 500 }
    );
  }
}