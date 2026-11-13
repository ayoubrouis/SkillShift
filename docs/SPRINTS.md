# SkillShift — Sprint Breakdown

## Sprint 0: Infrastructure & Market Skills Preparation

**Goal:** Set up the development environment, database, and populate the skills catalog.

### Deliverables
- Project scaffolding (Next.js + TypeScript + Tailwind)
- Supabase project creation and configuration
- Database schema (all 14 tables)
- RLS policies configuration
- Skills catalog populated from market data
- Ollama AI setup and integration

### Diagram
```
Admin → Browse Skills (manage the skill catalog)
```

---

## Sprint 1: Authentication, Onboarding & Resume

**Goal:** Enable users to create accounts, authenticate, and upload resumes for skill extraction.

### Deliverables
- User registration and login (Supabase Auth)
- Password reset flow
- First-time user onboarding tutorial
- Resume PDF upload and parsing
- AI-powered skill extraction from resumes
- Skill confirmation/review interface

### New Classes
`User`, `JobSeeker`, `Recruiter`, `Admin`, `Resume`, `Skill`

### User Stories
- As a visitor, I can register and log in to access the platform
- As a user, I can reset my password if I forget it
- As a job seeker, I can go through an onboarding tutorial
- As a job seeker, I can upload my resume and have my skills extracted automatically

### Use Cases
```
Account: Authentication, Reset Password
Job Seeker: Onboarding, Upload Resume → Review Skills
```

---

## Sprint 2: 3D Skill Universe

**Goal:** Visualize job seeker skills as an interactive 3D galaxy.

### Deliverables
- 3D universe rendering with Three.js
- 7 skill galaxies (Programming, ML, Cloud, DevOps, Data, Cybersecurity, Soft Skills)
- Skill stars positioned by category and demand score
- Acquired skills glow white with cosmic string connections
- Hover labels, detail panels (demand score, avg salary, frequency)
- Read-only mode for recruiter viewing

### New Classes
`Star`

### User Stories
- As a job seeker, I can explore my skills in a 3D universe
- As a job seeker, I can click a skill star to see details
- As a recruiter, I can view a candidate's universe in read-only mode

### Use Cases
```
View Universe → Explore Stars
```

---

## Sprint 3: Learning Roadmaps & Star Activation

**Goal:** Generate personalized learning roadmaps and activate skill stars upon completion.

### Deliverables
- AI-generated learning roadmaps (via Ollama)
- Checkpoint-based roadmap progression
- Quiz system at each checkpoint
- Star activation when a skill is mastered
- Rate-limited quiz submissions (server-side validation)

### New Classes
`Roadmap`, `Checkpoint`, `Quiz`

### User Stories
- As a job seeker, I can generate a learning roadmap for any skill
- As a job seeker, I can complete checkpoints step by step
- As a job seeker, I can take quizzes to test my knowledge
- As a job seeker, I can activate a star when I master a skill

### Use Cases
```
Generate Roadmap → Complete Steps → Take Quiz → Activate Star
```

---

## Sprint 4: Recruiter & Admin Dashboards

**Goal:** Enable recruiters to post jobs and match candidates, and admins to manage the platform.

### Deliverables
- Recruiter candidate search and filtering
- Job posting with AI skill extraction
- Candidate matching with percentage scores
- In-app notification system
- Candidate universe read-only view
- Admin dashboard with statistics and charts (Recharts)
- Admin user management (search, role filter, delete)
- Admin skills management (inline editing)
- Admin roadmap management (inline checkpoint/quiz editing)
- Browse skills catalog

### New Classes
`JobListing`, `MatchLog`, `Notification`

### User Stories
- As a recruiter, I can post a job and have skills automatically extracted
- As a recruiter, I can find matching candidates based on skill overlap
- As a recruiter, I can notify matched candidates
- As a recruiter, I can view a candidate's skill universe
- As a job seeker, I can receive and view notifications from recruiters
- As an admin, I can view platform statistics and charts
- As an admin, I can manage users, skills, and roadmaps

### Use Cases
```
Recruiter: Post Job → Match Candidates → Notify Candidate, View Candidate Universe
Admin: View Dashboard, Manage Users, Manage Roadmaps, Browse Skills
Job Seeker: View Notifications
```
