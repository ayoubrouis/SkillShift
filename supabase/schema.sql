-- SkillShift 2026 - Simplified Schema
-- Only essential columns, removed unused attributes

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('JOB_SEEKER', 'RECRUITER', 'ADMIN');
CREATE TYPE parsing_status AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');
CREATE TYPE skill_category AS ENUM ('Programming', 'ML', 'Cloud', 'DevOps', 'Data', 'Cybersecurity', 'Soft Skills');
CREATE TYPE source_type AS ENUM ('KAGGLE', 'MANUAL', 'GITHUB');

-- USERS - Essential only
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'JOB_SEEKER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tutorial_completed BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_users_email ON users(email);

-- SKILLS - Essential only
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    normalized_name TEXT NOT NULL UNIQUE,
    category skill_category NOT NULL DEFAULT 'Programming',
    frequency INTEGER NOT NULL DEFAULT 1,
    avg_salary NUMERIC DEFAULT 0,
    demand_score NUMERIC DEFAULT 0
);
CREATE INDEX idx_skills_name ON skills(name);

-- RESUMES - Essential only
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_url TEXT,
    raw_text TEXT DEFAULT '',
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    parsing_status parsing_status NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX idx_resumes_student ON resumes(student_id);

-- RESUME_SKILLS - Essential only
CREATE TABLE resume_skills (
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency TEXT DEFAULT 'Intermediate',
    PRIMARY KEY (resume_id, skill_id)
);

-- JOB_LISTINGS - Essential only
CREATE TABLE job_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    company_name TEXT,
    salary_clean NUMERIC,
    region TEXT,
   remote_type TEXT DEFAULT 'Onsite',
    source source_type NOT NULL DEFAULT 'MANUAL',
    description TEXT DEFAULT '',
    extracted_skills JSONB DEFAULT '[]',
    recruiter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_listings_title ON job_listings(title);

-- LISTING_SKILLS - For job-skill matching
CREATE TABLE listing_skills (
    listing_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (listing_id, skill_id)
);

-- ROADMAP_TEMPLATES - Learning paths for each skill
CREATE TABLE roadmap_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(skill_id)
);

-- ROADMAP_CHECKPOINTS - Ordered steps within a roadmap
CREATE TABLE roadmap_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES roadmap_templates(id) ON DELETE CASCADE,
    step_index INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    is_final BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, step_index)
);

-- CHECKPOINT_QUIZZES - Quiz questions for each checkpoint
CREATE TABLE checkpoint_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkpoint_id UUID NOT NULL REFERENCES roadmap_checkpoints(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    answer INT NOT NULL
);

-- USER_ROADMAPS - Tracks user progress through roadmaps
CREATE TABLE user_roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    current_step INT DEFAULT 0,
    passed_steps TEXT[] DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, skill_id)
);

-- USER_SKILLS - Skills acquired through roadmaps (not resume parsing)
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    source TEXT DEFAULT 'roadmap',
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);

-- RATE_LIMITS - Track user action counts for rate limiting
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    count INT DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MATCH_LOGS - Recruiter matching
CREATE TABLE match_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES job_listings(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'PENDING',
    matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read on skills and job_listings
CREATE POLICY skills_select_public ON skills FOR SELECT USING (true);
CREATE POLICY job_listings_select_public ON job_listings FOR SELECT USING (true);

-- Allow service role to insert/update skills and job_listings
CREATE POLICY skills_insert_service ON skills FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY skills_update_service ON skills FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY job_listings_insert_service ON job_listings FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY job_listings_update_service ON job_listings FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);

-- Admin helper function (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN');
$$;

-- Admin policies
CREATE POLICY "Admins can read all users" ON users FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all users" ON users FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete users" ON users FOR DELETE USING (public.is_admin());
CREATE POLICY "Admins can read resumes" ON resumes FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can delete roadmap_templates" ON roadmap_templates FOR DELETE USING (public.is_admin());
CREATE POLICY "Admins can delete roadmap_checkpoints" ON roadmap_checkpoints FOR DELETE USING (public.is_admin());
CREATE POLICY "Admins can delete checkpoint_quizzes" ON checkpoint_quizzes FOR DELETE USING (public.is_admin());
CREATE POLICY "Admins can delete user_roadmaps" ON user_roadmaps FOR DELETE USING (public.is_admin());
CREATE POLICY "Admins can delete match_logs" ON match_logs FOR DELETE USING (public.is_admin());
CREATE POLICY "Admins can delete notifications" ON notifications FOR DELETE USING (public.is_admin());

-- User-owned data policies
CREATE POLICY resumes_own ON resumes FOR ALL USING (auth.uid() = student_id);
CREATE POLICY resume_skills_own ON resume_skills FOR ALL USING (
    EXISTS (SELECT 1 FROM resumes r WHERE r.id = resume_id AND r.student_id = auth.uid())
);
CREATE POLICY roadmap_templates_select ON roadmap_templates FOR SELECT USING (true);
CREATE POLICY roadmap_checkpoints_select ON roadmap_checkpoints FOR SELECT USING (true);
CREATE POLICY checkpoint_quizzes_select ON checkpoint_quizzes FOR SELECT USING (true);
CREATE POLICY user_roadmaps_own ON user_roadmaps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY user_skills_own ON user_skills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY match_logs_access ON match_logs FOR SELECT USING (
    auth.uid() = recruiter_id OR auth.uid() = student_id
);
CREATE POLICY notifications_own ON notifications FOR ALL USING (auth.uid() = user_id);
