import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type UserRole = 'JOB_SEEKER' | 'RECRUITER' | 'ADMIN'
export type ParsingStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'
export type SkillCategory = 'Programming' | 'ML' | 'Cloud' | 'DevOps' | 'Data' | 'Cybersecurity' | 'Soft Skills'
export type SourceType = 'MANUAL' | 'KAGGLE' | 'GITHUB'

export interface User {
    id: string
    email: string
    full_name: string
    role: UserRole
    created_at: string
    tutorial_completed: boolean
}

export interface Skill {
    id: string
    name: string
    normalized_name: string
    category: SkillCategory
    frequency: number
    avg_salary: number
    demand_score: number
}

export interface Resume {
    id: string
    student_id: string
    raw_text: string
    upload_date: string
    parsing_status: ParsingStatus
}

export interface ResumeSkill {
    resume_id: string
    skill_id: string
    proficiency: string
}

export interface JobListing {
    id: string
    title: string
    company_name: string | null
    salary_clean: number | null
    region: string | null
    remote_type: string
    source: SourceType
    description: string
    extracted_skills: string[]
    recruiter_id: string | null
    is_active: boolean
    fetched_at: string
}

export interface ListingSkill {
    listing_id: string
    skill_id: string
    is_required: boolean
}

export interface Star {
    id: string
    universe_id: string
    skill_id: string
    star_type: string
    size: number
    activated_at: string | null
}

export interface StarWithSkill extends Star {
    skill: Skill | Skill[] | null
}

export interface Notification {
    id: string
    user_id: string
    title: string
    message: string
    is_read: boolean
    created_at: string
}

export interface Checkpoint {
    id: string
    template_id: string
    step_index: number
    title: string
    description: string
    content: string
    is_final: boolean
}

export interface Quiz {
    id: string
    checkpoint_id: string
    question: string
    options: string[]
    answer: number
}

export interface UserRoadmap {
    id: string
    user_id: string
    skill_id: string
    current_step: number
    passed_steps: string[]
    started_at: string
    completed_at: string | null
}
