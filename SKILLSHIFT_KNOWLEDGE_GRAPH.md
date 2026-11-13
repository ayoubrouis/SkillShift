# SKILLSHIFT — Complete Knowledge Graph

> A career navigation platform connecting **Job Seekers** and **Recruiters** via AI-powered skill extraction, 3D skill visualization, and intelligent candidate matching.

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema & Relationships](#3-database-schema--relationships)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Page Route Map](#5-page-route-map)
6. [API Route Map](#6-api-route-map)
7. [JOB_SEEKER: Full User Flow](#7-job_seeker-full-user-flow)
8. [RECRUITER: Full User Flow](#8-recruiter-full-user-flow)
9. [ADMIN: Full User Flow](#9-admin-full-user-flow)
10. [Page-by-Page Deep Dive](#10-page-by-page-deep-dive)
11. [API Route Deep Dive](#11-api-route-deep-dive)
12. [Business Logic: Skill Extraction](#12-business-logic-skill-extraction)
13. [Business Logic: Recruiter Matching](#13-business-logic-recruiter-matching)
14. [Business Logic: Roadmap Generation & Learning](#14-business-logic-roadmap-generation--learning)
15. [3D Universe Visualization](#15-3d-universe-visualization)
16. [Data Flow Diagrams](#16-data-flow-diagrams)

---

## 1. ARCHITECTURE OVERVIEW

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js 16 App (React 19)                       │  │
│  │                                                                    │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────────┐  │  │
│  │  │  Pages  │ │ Layouts  │ │  Components   │ │ 3D Universe      │  │  │
│  │  │ (14 pg) │ │ (root)   │ │ (Navigation)  │ │ (R3F + Three.js) │  │  │
│  │  └────┬────┘ └──────────┘ └──────────────┘ └──────────────────┘  │  │
│  │       │                                                           │  │
│  │  ┌────▼──────────────────────────────────────────────────────┐   │  │
│  │  │             Next.js API Routes (Serverless)               │   │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │   │  │
│  │  │  │ Resume/     │  │ Recruiter/  │  │ Roadmap/         │  │   │  │
│  │  │  │ Skills API  │  │ Jobs API    │  │ Learning API     │  │   │  │
│  │  │  └──────┬──────┘  └──────┬──────┘  └───────┬──────────┘  │   │  │
│  │  └─────────┼───────────────┼──────────────────┼──────────────┘   │  │
│  └────────────┼───────────────┼──────────────────┼───────────────────┘  │
│               │               │                  │                      │
└────────────────┼───────────────┼──────────────────┼──────────────────────┘
                 │               │                  │
    ┌────────────▼───┐   ┌──────▼──────┐   ┌───────▼──────────┐
    │  Supabase DB   │   │ Supabase    │   │  External AI      │
    │  (PostgreSQL)  │   │ Auth (JWT)  │   │  Services         │
    │  14 tables     │   │ + RLS       │   │                   │
    │  RLS enabled   │   │             │   │  Groq API         │
    │                │   │             │   │  (llama-3.3-70b)  │
    │                │   │             │   │  HuggingFace      │
    │                │   │             │   │  (flan-t5-base)   │
    └────────────────┘   └─────────────┘   └───────────────────┘
```

**Key Architecture Patterns:**
- **Next.js Full-Stack Monolith** — frontend and backend in one codebase
- **App Router** — file-based routing for pages and API endpoints
- **Server Components** by default — client components only where interactivity needed
- **Service Role Pattern** — API routes use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for cross-user operations
- **Client-side Supabase queries** — use anon key with JWT (user-scoped via RLS)
- **On-demand AI generation** — roadmaps generated lazily (not pre-seeded)

---

## 2. TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js | 16.1.6 |
| **UI Library** | React | 19.2.3 |
| **Language** | TypeScript | (latest) |
| **Styling** | Tailwind CSS | 4.x |
| **3D Graphics** | Three.js + @react-three/fiber + @react-three/drei | latest |
| **Charts** | Recharts | latest |
| **Icons** | Lucide React | latest |
| **Database** | Supabase (PostgreSQL) | cloud |
| **Auth** | Supabase Auth | JWT-based |
| **AI - Resume Parse** | Groq API (llama-3.3-70b-versatile) | via OpenAI SDK |
| **AI - Skill Extract** | HuggingFace Inference (google/flan-t5-base) | via @huggingface/inference |
| **AI - Roadmap Gen** | Groq API (llama-3.3-70b-versatile) | via OpenAI SDK |
| **PDF Parsing** | pdf-parse (pdfjs-dist) | latest |
| **File Upload** | react-dropzone | latest |
| **Animations** | framer-motion | latest |
| **State/Data** | zustand + react-redux + immer | latest |

---

## 3. DATABASE SCHEMA & RELATIONSHIPS

### Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USERS                                              │
│  id (PK) │ email │ full_name │ role │ created_at │ tutorial_completed           │
└──────────┬──────────────────────────────────────────────────────────────────────┘
           │
           │ (student_id)
           ▼
     ┌─────────────────────┐       ┌──────────────────────┐
     │      RESUMES        │       │    USER_ROADMAPS     │
     │ id (PK)             │       │ id (PK)              │
     │ student_id (FK) ────┼───┐   │ user_id (FK) ────────┤
     │ file_url            │   │   │ skill_id (FK) ───────┤
     │ raw_text            │   │   │ current_step          │
     │ upload_date         │   │   │ passed_steps (TEXT[]) │
     │ parsing_status      │   │   │ started_at            │
     └──────────┬──────────┘   │   │ completed_at          │
                │              │   └──────────────────────┘
                │ (resume_id)  │
                ▼              │   ┌──────────────────────┐
     ┌─────────────────────┐   │   │     USER_SKILLS      │
     │    RESUME_SKILLS    │   │   │ id (PK)              │
     │ resume_id (FK) ─────┼───┤   │ user_id (FK) ────────┤
     │ skill_id (FK) ──────┼───┼───│ skill_id (FK) ───────┤
     │ proficiency         │   │   │ source               │
     └──────────┬──────────┘   │   │ acquired_at          │
                │              │   └──────────────────────┘
                │ (skill_id)   │
                ▼              │
     ┌─────────────────────┐   │   ┌──────────────────────┐
     │       SKILLS        │   │   │    NOTIFICATIONS     │
     │ id (PK)             │   │   │ id (PK)              │
     │ name                │   │   │ user_id (FK) ────────┤
     │ normalized_name     │   │   │ title                │
     │ category            │   │   │ message              │
     │ frequency           │   │   │ is_read              │
     │ avg_salary          │   │   │ created_at           │
     │ demand_score        │   │   └──────────────────────┘
     └──────────┬──────────┘
                │                 ┌──────────────────────┐
                │ (skill_id)      │    RATE_LIMITS       │
                ▼                 │ id (PK)              │
     ┌─────────────────────┐      │ user_id (FK) ────────┤
     │  ROADMAP_TEMPLATES  │      │ action               │
     │ id (PK)             │      │ count                │
     │ skill_id (FK) ──────┼───┐  │ window_start         │
     │ UNIQUE(skill_id)    │   │  └──────────────────────┘
     └──────────┬──────────┘   │
                │ (template_id)│  ┌──────────────────────┐
                ▼              │  │     MATCH_LOGS       │
     ┌─────────────────────┐   │  │ id (PK)              │
     │ ROADMAP_CHECKPOINTS │   │  │ recruiter_id (FK) ───┤
     │ id (PK)             │   │  │ student_id (FK) ─────┤
     │ template_id (FK) ───┼───┤  │ listing_id (FK)      │
     │ step_index          │   │  │ status               │
     │ title               │   │  │ matched_at           │
     │ description         │   │  └──────────────────────┘
     │ content             │   │
     │ is_final            │   │  ┌──────────────────────┐
     └──────────┬──────────┘   │  │    JOB_LISTINGS      │
                │ (checkpoint) │  │ id (PK)              │
                ▼              │  │ title                │
     ┌─────────────────────┐   │  │ company_name         │
     │ CHECKPOINT_QUIZZES  │   │  │ description          │
     │ id (PK)             │   │  │ extracted_skills     │
     │ checkpoint_id (FK) ─┼───┘  │ recruiter_id (FK) ───┤
     │ question            │      │ is_active            │
     │ options (JSONB)     │      │ source               │
     │ answer (INT)        │      │ created_at           │
     └─────────────────────┘      └──────────┬───────────┘
                                             │
                                             │ (listing_id)
                                             ▼
                                   ┌──────────────────────┐
                                   │    LISTING_SKILLS    │
                                   │ listing_id (FK)      │
                                   │ skill_id (FK)        │
                                   │ is_required          │
                                   └──────────────────────┘
```

### Table Summary

| # | Table | RLS? | Purpose |
|---|-------|------|---------|
| 1 | `users` | YES | All users (JOB_SEEKER, RECRUITER, ADMIN) |
| 2 | `skills` | NO | Master catalog of ~528 skills with market data |
| 3 | `resumes` | YES | Uploaded resume records per user |
| 4 | `resume_skills` | YES | Junction: which skills per resume |
| 5 | `job_listings` | NO | Job postings by recruiters |
| 6 | `listing_skills` | NO | Junction: required skills per job |
| 7 | `roadmap_templates` | YES (SELECT public) | AI-generated learning path per skill (1:1) |
| 8 | `roadmap_checkpoints` | YES (SELECT public) | Individual learning steps in a roadmap |
| 9 | `checkpoint_quizzes` | YES (SELECT public) | Quiz questions per checkpoint |
| 10 | `user_roadmaps` | YES | User progress through a roadmap |
| 11 | `user_skills` | YES | Skills acquired by completing roadmaps |
| 12 | `rate_limits` | NO | Rate limiting for quiz submissions |
| 13 | `match_logs` | YES | Recruiter-candidate-job match records |
| 14 | `notifications` | YES | In-app notifications |

---

## 4. USER ROLES & PERMISSIONS

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  JOB_SEEKER  │     │   RECRUITER  │     │    ADMIN     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ Upload Resume│     │ Post Jobs    │     │ View Stats   │
│ View 3D      │     │ Match        │     │ Manage Users │
│  Universe    │     │  Candidates  │     │ Manage       │
│ Learn Skills │     │ View         │     │  Skills      │
│  via Roadmap │     │  Candidate   │     │ Manage       │
│ Take Quizzes │     │  Universe    │     │  Roadmaps    │
│ Get Notified │     │ Send Notifs  │     │ Delete Data  │
│  by Recruit  │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

**RLS Access Rules:**
- Users read/write their **own** data (resumes, skills, roadmaps, notifications)
- Recruiters access candidate data via **service-role API routes** (not direct DB queries)
- Admins bypass normal RLS via `public.is_admin()` SECURITY DEFINER function
- Skills, job listings are **public read** (no RLS on SELECT)

---

## 5. PAGE ROUTE MAP

```
                      ┌─────────────┐
                      │  / (Home)    │
                      │  Landing    │
                      └──────┬──────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐  ┌───▼────┐  ┌─────▼──────┐
       │  /register  │  │ /login │  │ /forgot-   │
       │  Sign Up    │  │ Sign In│  │  password  │
       └─────────────┘  └───┬────┘  └─────┬──────┘
                            │              │
                            │       ┌──────▼────────┐
                            │       │ /reset-password│
                            │       └───────────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
       ┌──────▼──────┐  ┌──▼───────┐  ┌───▼──────────┐
       │ Role:       │  │ Role:    │  │ Role: ADMIN  │
       │ JOB_SEEKER  │  │ RECRUITER│  │              │
       └──────┬──────┘  └──┬───────┘  ┌──────▼───────┐
              │            │          │  /dashboard   │
       ┌──────▼──────┐    │          │  /admin       │
       │ /onboarding │    │          └───────────────┘
       │ (first time)│    │
       └──────┬──────┘    │
              │           │
       ┌──────▼──────┐    │
       │ /upload-    │    │
       │  resume     │    │
       └──────┬──────┘    │
              │           │
       ┌──────▼──────┐    │
       │ /skills-    │    │
       │  review     │    │
       └──────┬──────┘    │
              │           │
       ┌──────▼──────┐  ┌─▼───────────┐
       │ /universe   │  │ /recruiter  │
       │ 3D Skill    │  │ Dashboard   │
       │ Universe    │  │ (Candidates,│
       └──────┬──────┘  │  Jobs,      │
              │         │  Post Job)  │
       ┌──────▼──────┐  └─────────────┘
       │ /roadmap    │
       │ Learning    │  ┌────────────────┐
       │ Roadmap     │  │ /notifications │
       └─────────────┘  └────────────────┘
```

### Complete Page Inventory

| Route | Page Component | Auth? | Role Restriction | User Sees |
|-------|---------------|-------|-----------------|-----------|
| `/` | `app/page.tsx` | No | All | Landing page OR role-based dashboard link |
| `/login` | `app/login/page.tsx` | No | Anonymous only | Login form with admin toggle |
| `/register` | `app/register/page.tsx` | No | Anonymous only | Registration form |
| `/forgot-password` | `app/forgot-password/page.tsx` | No | Anonymous only | Email input for reset |
| `/reset-password` | `app/reset-password/page.tsx` | No | Valid token only | New password form |
| `/onboarding` | `app/onboarding/page.tsx` | Yes | JOB_SEEKER | Onboarding video |
| `/upload-resume` | `app/upload-resume/page.tsx` | Yes | JOB_SEEKER | PDF upload + AI parsing |
| `/skills-review` | `app/skills-review/page.tsx` | Yes | JOB_SEEKER | Review/edit extracted skills |
| `/universe` | `app/universe/page.tsx` | Yes | JOB_SEEKER / RECRUITER | 3D interactive skill galaxy |
| `/roadmap` | `app/roadmap/page.tsx` | Yes | JOB_SEEKER | Learning path with quizzes |
| `/recruiter` | `app/recruiter/page.tsx` | Yes | RECRUITER only | Candidates, Jobs, Matching |
| `/notifications` | `app/notifications/page.tsx` | Yes | Any auth'd | Notification inbox |
| `/dashboard` | `app/dashboard/page.tsx` | Yes | ADMIN only | Summary stats + charts |
| `/admin` | `app/admin/page.tsx` | Yes | ADMIN only | Full management panel |

---

## 6. API ROUTE MAP

```
┌──────────────────────────────────────────────────────────────────────┐
│                        API ROUTES (12 total)                        │
│                                                                      │
│  ┌─────────────────────┐    ┌───────────────────────────────────┐   │
│  │  RESUME/SKILLS      │    │  RECRUITER                       │   │
│  │                     │    │                                   │   │
│  │ POST /api/parse-    │    │ GET  /api/recruiter/candidates   │   │
│  │   resume            │    │ GET  /api/recruiter/jobs          │   │
│  │                     │    │ POST /api/recruiter/jobs          │   │
│  │ POST /api/extract-  │    │ POST /api/recruiter/match         │   │
│  │   skills            │    │ POST /api/recruiter/notify        │   │
│  │                     │    └───────────────────────────────────┘   │
│  │ POST /api/update-   │                                            │
│  │   resume-skills     │    ┌───────────────────────────────────┐   │
│  │                     │    │  ROADMAP/LEARNING                │   │
│  │ GET  /api/candidate-│    │                                   │   │
│  │   universe          │    │ GET  /api/roadmap                 │   │
│  └─────────────────────┘    │ POST /api/roadmap/generate        │   │
│                              │ POST /api/roadmap/advance         │   │
│                              │ POST /api/roadmap/complete        │   │
│                              └───────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Complete API Endpoint Inventory

| # | Method | Route | Auth | Purpose | Key External Calls |
|---|--------|-------|------|---------|-------------------|
| 1 | POST | `/api/parse-resume` | Service Key | Parse PDF resume → extract skills via AI + keyword | **Groq** (llama-3.3-70b) |
| 2 | POST | `/api/extract-skills` | Service Key | Extract skills from text | **HuggingFace** (flan-t5-base) |
| 3 | POST | `/api/update-resume-skills` | Service Key | Save edited skill list to resume | None |
| 4 | GET | `/api/candidate-universe` | Service Key | Fetch candidate's skills + resume for read-only view | None |
| 5 | GET | `/api/roadmap` | Service Key | Fetch roadmap with checkpoints + quizzes + progress | None |
| 6 | POST | `/api/roadmap/generate` | Service Key | AI-generate a learning roadmap for a skill | **Groq** (llama-3.3-70b) |
| 7 | POST | `/api/roadmap/advance` | Service Key | Submit quiz answer → update progress (rate-limited) | None |
| 8 | POST | `/api/roadmap/complete` | Service Key | Mark roadmap done → insert into user_skills | None |
| 9 | GET | `/api/recruiter/jobs` | Service Key | List recruiter's job postings | None |
| 10 | POST | `/api/recruiter/jobs` | Service Key | Create job + extract skills | HuggingFace (via internal call) |
| 11 | POST | `/api/recruiter/match` | Service Key | Match candidates to job by skills | None |
| 12 | POST | `/api/recruiter/notify` | Service Key | Send notification to candidate | None |

---

## 7. JOB_SEEKER: FULL USER FLOW

```
                    ┌──────────────┐
                    │  VISITOR     │
                    │  (Anonymous) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         [View Home]  [Register]   [Login]
         (Landing)       │            │
                         │            │
                         ▼            │
                    [Register Form]   │
                    (email, password, │
                     full name, role) │
                         │            │
                         └─────┬──────┘
                               │
                               ▼  ┌───────────────────┐
                          [Login] │ On first login    │
                               │  │ (tutorial_complete│
                               │  │  = false)         │
                               │  └────────┬──────────┘
                               ▼           ▼
                    ┌──────────────────────────────┐
                    │      ONBOARDING              │
                    │  (Watch intro video)         │
                    │  Click "Initialize Universe" │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      UPLOAD RESUME           │
                    │  (Drag-drop PDF)             │
                    │                               │
                    │  Client side:                 │
                    │  1. Insert resume record      │
                    │     (parsing_status=PROCESSING)│
                    │  2. POST /api/parse-resume    │
                    │     ├─ Extract PDF text       │
                    │     ├─ AI extracts skills     │
                    │     │  (Groq llama-3.3-70b)   │
                    │     ├─ Keyword match skills   │
                    │     │  (50+ regex patterns)   │
                    │     ├─ Merge + validate       │
                    │     └─ Save to DB             │
                    │  3. Redirect to skills-review │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      SKILLS REVIEW           │
                    │  (resume_id from URL params) │
                    │                               │
                    │  Shows: extracted skills      │
                    │  Can: add/remove skills       │
                    │  On confirm:                  │
                    │  1. POST /api/update-resume-skills
                    │  2. Set tutorial_completed=true
                    │  3. Redirect to /universe     │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────────┐
                    │      3D SKILL UNIVERSE                  │
                    │  (Interactive WebGL Galaxy)             │
                    │                                          │
                    │  Shows:                                  │
                    │  - Acquired skills = WHITE stars         │
                    │    (from resume_skills + user_skills)    │
                    │  - Unacquired skills = COLORED stars     │
                    │    (grouped by 7 categories = galaxies)  │
                    │                                          │
                    │  Click a star → Skill Detail Panel:      │
                    │  - Demand score, avg salary, frequency   │
                    │  - "Start Learning Roadmap" button       │
                    │    (if not acquired)                     │
                    │  - "View Roadmap" button                 │
                    │    (if already started)                  │
                    │                                          │
                    │  Read-only mode (?viewUserId=...):       │
                    │  - For recruiter viewing candidate        │
                    │  - Fetches via /api/candidate-universe    │
                    └──────────────┬──────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────────────┐
                    │     LEARNING ROADMAP                    │
                    │  (skill_id from URL params)              │
                    │                                          │
                    │  1. GET /api/roadmap → check exists      │
                    │  2. If 404 → POST /api/roadmap/generate  │
                    │     (Groq generates 5 checkpoints,       │
                    │      3 quizzes each, saves to DB)         │
                    │  3. Shows:                               │
                    │     ┌─────────────────────────────────┐  │
                    │     │ Sidebar: Checkpoint Timeline    │  │
                    │     │  🔒 Locked (future)           │  │
                    │     │  🔓 Unlocked (current)        │  │
                    │     │  ✅ Completed (passed)        │  │
                    │     │                                │  │
                    │     │ Main: Checkpoint Content       │  │
                    │     │  - Learn section               │  │
                    │     │  - Practice section            │  │
                    │     │  - Resources section           │  │
                    │     │  - Project (final checkpoint)  │  │
                    │     │                                │  │
                    │     │ Quiz Modal (on advance):       │  │
                    │     │  3 multiple-choice questions    │  │
                    │     │  POST /api/roadmap/advance      │  │
                    │     │  (rate-limited: max 100/hr)     │  │
                    │     └─────────────────────────────────┘  │
                    │                                          │
                    │  4. All 5 checkpoints done →              │
                    │     "Mark as Acquired" button             │
                    │     POST /api/roadmap/complete            │
                    │     (max 10 completions per day)          │
                    │     → skill added to user_skills          │
                    │     → star turns WHITE in Universe        │
                    └──────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    NOTIFICATIONS             │
                    │  (accessible from bell icon  │
                    │   in universe)               │
                    │                               │
                    │  Shows: recruiter messages    │
                    │  Auto-marks as read           │
                    │  Can delete                   │
                    └──────────────────────────────┘
```

---

## 8. RECRUITER: FULL USER FLOW

```
                    ┌──────────────┐
                    │  REGISTER as │
                    │  RECRUITER   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────────────────────────┐
                    │     RECRUITER DASHBOARD          │
                    │  (/recruiter)                    │
                    │                                   │
                    │  3 Tabs:                          │
                    │  ┌─────────────────────────────┐  │
                    │  │ TAB 1: CANDIDATES           │  │
                    │  │  - Search by name/skill     │  │
                    │  │  - Lists all JOB_SEEKERs    │  │
                    │  │    sorted by skill count     │  │
                    │  │  - Each candidate shows      │  │
                    │  │    skill tags                │  │
                    │  │  - Click to view their       │  │
                    │  │    3D Universe (read-only)   │  │
                    │  │    → /universe?viewUserId=.. │  │
                    │  │    → fetches via             │  │
                    │  │     /api/candidate-universe  │  │
                    │  └─────────────────────────────┘  │
                    │  ┌─────────────────────────────┐  │
                    │  │ TAB 2: MY JOBS              │  │
                    │  │  - Lists recruiter's jobs   │  │
                    │  │  - Each job shows:           │  │
                    │  │    • Title, company, date    │  │
                    │  │    • Extracted skills tags   │  │
                    │  │    • "Match Candidates" btn  │  │
                    │  │                              │  │
                    │  │  Match process:              │  │
                    │  │  POST /api/recruiter/match   │  │
                    │  │  1. Fetch job's extracted    │  │
                    │  │     skills                   │  │
                    │  │  2. Fetch all JOB_SEEKERs    │  │
                    │  │  3. Fetch all their resumes  │  │
                    │  │     + resume_skills          │  │
                    │  │  4. For each candidate:      │  │
                    │  │     fuzzy match skills       │  │
                    │  │     score = (matched/total)  │  │
                    │  │            × 100             │  │
                    │  │  5. Sort by score DESC       │  │
                    │  │  6. Log matches in           │  │
                    │  │     match_logs table         │  │
                    │  │  7. Display results:         │  │
                    │  │     name, email, skills,     │  │
                    │  │     score % + "Notify" btn   │  │
                    │  │                              │  │
                    │  │  Notify process:             │  │
                    │  │  POST /api/recruiter/notify  │  │
                    │  │  - Insert notification in    │  │
                    │  │    notifications table       │  │
                    │  │  - Update match_logs status  │  │
                    │  └─────────────────────────────┘  │
                    │  ┌─────────────────────────────┐  │
                    │  │ TAB 3: POST NEW JOB         │  │
                    │  │  - Form: title + description│  │
                    │  │  - On submit:               │  │
                    │  │    POST /api/recruiter/jobs  │  │
                    │  │    1. Verify RECRUITER role  │  │
                    │  │    2. Call /api/extract-     │  │
                    │  │       skills internally      │  │
                    │  │       (HuggingFace AI parses │  │
                    │  │        job description)      │  │
                    │  │    3. Insert into            │  │
                    │  │       job_listings           │  │
                    │  │    4. Return created job +   │  │
                    │  │       extracted skills       │  │
                    │  └─────────────────────────────┘  │
                    └──────────────────────────────────┘
```

---

## 9. ADMIN: FULL USER FLOW

```
                    ┌──────────────┐
                    │  LOGIN as    │
                    │  ADMIN       │
                    │  (toggle in  │
                    │   login page)│
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
     ┌──────────────────┐    ┌──────────────────────┐
     │   /dashboard     │    │      /admin           │
     │  (Quick Overview)│    │  (Full Management)    │
     │                   │    │                       │
     │  Stats cards:     │    │  4 Tabs:              │
     │  - Total Users    │    │  ┌─────────────────┐  │
     │  - Skills Catalog │    │  │ OVERVIEW         │  │
     │  - Active Resumes │    │  │ Stats cards      │  │
     │                   │    │  │ Pie: Users/role   │  │
     │  Pie: Users/role  │    │  │ Bar: Skills/cat  │  │
     │  Bar: Skills/cat  │    │  │ Line: reg/month   │  │
     │                   │    │  └─────────────────┘  │
     │  Top Market Skills│    │  ┌─────────────────┐  │
     │  Recent Jobs      │    │  │ USERS            │  │
     │                   │    │  │ Searchable list  │  │
     │  Link to /admin   │    │  │ Change role       │  │
     └──────────────────┘    │  │ Delete user       │  │
                             │  └─────────────────┘  │
                             │  ┌─────────────────┐  │
                             │  │ SKILLS           │  │
                             │  │ Searchable grid  │  │
                             │  │ View category,   │  │
                             │  │ demand score     │  │
                             │  └─────────────────┘  │
                             │  ┌─────────────────┐  │
                             │  │ ROADMAPS         │  │
                             │  │ Searchable list  │  │
                             │  │ Delete roadmap   │  │
                             │  │ View/edit inline │  │
                             │  │  - Checkpoints   │  │
                             │  │  - Quizzes       │  │
                             │  └─────────────────┘  │
                             └──────────────────────┘
```

---

## 10. PAGE-BY-PAGE DEEP DIVE

### 10a. Layout (`app/layout.tsx`)
- **Type:** Server Component
- **Structure:** `<html>` → `<body className="bg-slate-950 text-slate-50">` → `<Navigation />` + `<main>{children}</main>`
- **Metadata:** "SkillShift 2026 - Career Navigator"
- **CSS:** `globals.css` (Tailwind)

### 10b. Navigation (`components/Navigation.tsx`)
- **Type:** Client Component
- **Behavior:** Subscribes to `supabase.auth.onAuthStateChange` for real-time auth updates
- **Desktop:** Horizontal links based on role
- **Mobile:** Hamburger menu
- **Role-based links:**
  - Anonymous: Sign In, Get Started
  - JOB_SEEKER: Universe, Upload Resume
  - RECRUITER: Recruiter Dashboard
  - ADMIN: Dashboard
- **Active link:** Highlighted based on `pathname`

### 10c. Home (`app/page.tsx`)
- **Type:** Client Component
- **States:** Loading (spinner) → Authenticated (role-based dashboard link + logout) | Anonymous (landing page)
- **Marketing sections:** Hero, Features grid (6 cards), CTA
- **Auth check:** `supabase.auth.getUser()` → `users.select('role')`

### 10d. Login (`app/login/page.tsx`)
- **Type:** Client Component
- **Features:**
  - Email/password form with show/hide toggle
  - "Admin Login" toggle button → restricts login to ADMIN role
  - Error display (red alert)
  - Loading state (spinner in button)
- **Post-login redirect logic:**
  - Admin mode + ADMIN → `/dashboard`
  - Normal + JOB_SEEKER + `tutorial_completed=false` → `/onboarding`
  - Normal + JOB_SEEKER + `tutorial_completed=true` → `/universe`
  - Normal + RECRUITER → `/recruiter`
  - Normal + ADMIN → `/dashboard`

### 10e. Register (`app/register/page.tsx`)
- **Type:** Client Component
- **Features:**
  - Full name, email, password (strength indicator), role selector (JOB_SEEKER / RECRUITER)
  - Password strength: 5 criteria (length 8+, upper, lower, digit, special)
  - On success: redirects to `/onboarding`

### 10f. Forgot/Reset Password
- **Forgot:** Email input → `supabase.auth.resetPasswordForEmail()` → confirmation screen
- **Reset:** Waits for session from URL hash → new password form → `supabase.auth.updateUser()` → auto-redirect to `/login`

### 10g. Onboarding (`app/onboarding/page.tsx`)
- **Type:** Client Component
- **Behavior:** Full-screen video player → button "Initialize My Universe" on video end
- **State:** `unlocked` (video ended?) → `isPlaying`
- **On proceed:** Navigates to `/upload-resume`

### 10h. Upload Resume (`app/upload-resume/page.tsx`)
- **Type:** Client Component
- **Input:** `react-dropzone` (drag-drop or click, PDF only)
- **Progress states:** `uploading` → `extracting` → `analyzing` (blue info box + spinner)
- **Flow:**
  1. `supabase.auth.getUser()` (verify auth)
  2. Insert into `resumes` (`parsing_status = 'PROCESSING'`)
  3. Read file as base64
  4. `POST /api/parse-resume` with `{ resume_id, file_data, file_type: 'pdf' }`
  5. On success: redirect to `/skills-review?resume_id=...` after 1.5s
- **Error:** Red alert box
- **Empty state:** Dropzone with upload icon

### 10i. Skills Review (`app/skills-review/page.tsx`)
- **Type:** Client Component
- **URL params:** `resume_id`
- **Flow:**
  1. Verify ownership (resume belongs to auth'd user)
  2. Fetch `resume_skills` with joined `skills` data
  3. Display skill list with category badges, demand scores
  4. User can add skills (name + category selector) or remove (X button)
  5. "Confirm & Enter Universe" button:
     - `POST /api/update-resume-skills` → saves final list
     - `users.update({ tutorial_completed: true })`
     - Redirect to `/universe`
- **Empty state:** "No Skills Found" if resume parsed with 0 skills

### 10j. Universe (`app/universe/page.tsx`)
- **Type:** Client Component
- **URL params:** `viewUserId` (optional, for recruiter read-only mode)
- **3D Scene Components:**
  - `CosmicBackground` — nebula + starfield particles
  - `SingularityCore` — animated central sphere
  - `CosmicStrings` — lines from center to acquired skills
  - `StarBurstLines` — lines within galaxies
  - `StarMesh` — individual skill stars (white = acquired, colored by category = unacquired)
  - `GalaxyLabel` — 7 spiral galaxy clusters
  - `SkillDetailPanel` — right sidebar on star click
  - `OrbitControls` — rotate/zoom
- **Data sources for normal mode:**
  - `resumes` (latest DONE) → `resume_skills` → acquired skill IDs
  - `user_skills` → roadmap-acquired skill IDs
  - `skills` (all) → market skills
- **Data source for read-only mode:**
  - `GET /api/candidate-universe?candidate_id=...`
- **Skill detail panel shows:**
  - Skill name, category, demand score, avg salary, frequency
  - "Start Learning Roadmap" → calls `/api/roadmap/generate`, then navigates to `/roadmap?skill_id=...`
- **Loading states:** Spinner with contextual message
- **Error states:** Redirect to `/` on unauthorized read-only access

### 10k. Roadmap (`app/roadmap/page.tsx`)
- **Type:** Client Component
- **URL params:** `skill_id`, `skill` (name)
- **Overall flow:**
  1. Fetch skill info from `skills` table
  2. `GET /api/roadmap?skill_id=...&user_id=...`
     - If 404: `POST /api/roadmap/generate` → wait 30-60s → re-fetch
  3. Display sidebar timeline + active checkpoint content
  4. Quiz modal on advance attempt
  5. All 5 done → "Mark as Acquired" → `POST /api/roadmap/complete`
- **Content sections** parsed from checkpoint content:
  - `Learn:` / `Practice:` / `Resources:` / `Project:` — color-coded headers
- **Quiz:** 3 questions, multiple choice, server-validated
- **Progress bar** at bottom
- **Completion:** Success message → auto-redirect to `/universe` after 1.5s
- **Rate limits:** 100 quiz submissions/hour, 10 skill completions/day

### 10l. Recruiter Dashboard (`app/recruiter/page.tsx`)
- **Type:** Client Component
- **3 Tabs:** Candidates, My Jobs, Post New Job
- **Candidates Tab:**
  - Search bar (by name or skill name)
  - Lists all JOB_SEEKERs with skill tags, sorted by skill count DESC
  - Each has link to view their Universe (read-only)
- **My Jobs Tab:**
  - Lists recruiter's `job_listings` with skill tags
  - "Match Candidates" button → `POST /api/recruiter/match`
  - Match results displayed with score %, "Notify" button for each
- **Post New Job Tab:**
  - Title + description form
  - On submit: creates job via `POST /api/recruiter/jobs`
  - Auto-extracts skills via HuggingFace
- **State management per tab:** Loading spinners, empty states, error messages

### 10m. Admin Panel (`app/admin/page.tsx`)
- **Type:** Client Component
- **4 Tabs:** Overview, Users, Skills, Roadmaps
- **Overview:** Recharts pie (users/role), bar (skills/category), line (registrations & roadmaps over time)
- **Users:** Searchable table, role dropdown to change, delete button
- **Skills:** Searchable grid, category + demand score
- **Roadmaps:** Searchable list, view/edit inline (checkpoints + quizzes with save)
- **All operations:** Direct Supabase queries (service role via client)

### 10n. Notifications (`app/notifications/page.tsx`)
- **Type:** Client Component
- Fetches all notifications for auth'd user
- Auto-marks unread as read on load
- Delete per notification
- Empty state: "No notifications yet"

---

## 11. API ROUTE DEEP DIVE

### POST `/api/parse-resume` — The Core Resume Parsing Engine

```
Request: { resume_id: string, file_data: string (base64), file_type: "pdf" }
│
├─ 1. Validate input
│
├─ 2. Extract text from PDF (pdf-parse)
│  └─ Decode base64 → Buffer → PDFParse → { text, pages }
│  └─ If text < 50 chars → 400 error
│
├─ 3. AI Skill Extraction (Groq llama-3.3-70b)
│  └─ Prompt: "Extract technical skills as JSON array [{name, category}]"
│  └─ Categories: Programming, ML, Cloud, DevOps, Data, Cybersecurity, Soft Skills
│  └─ Send first 4000 chars of resume text
│  └─ Parse response with sanitizeJsonString()
│  └─ Filter out entries without valid name
│  └─ Fallback: categorizeSkill() if no category provided
│  └─ Failure → return [] (silent)
│
├─ 4. Keyword Skill Extraction (regex matching)
│  └─ ~50 regex patterns (e.g., \bpython\b, \breact\b)
│  └─ De-duplicate by name into Map
│  └─ Each gets source: 'keyword' + category
│
├─ 5. Merge & Validate
│  └─ For each AI skill: verify name exists in raw text via skillExistsInText()
│  └─ AI skills not verified in text → FILTERED OUT
│  └─ Keyword skills → all kept
│  └─ AI skills take priority over keyword
│
├─ 6. Save to Database
│  └─ UPDATE resumes SET parsing_status = 'DONE'
│  └─ For each skill:
│     ├─ SELECT skills WHERE ilike('name', skill.name)
│     ├─ If not found → INSERT into skills
│     └─ INSERT into resume_skills
│
└─ 7. Return { success, skills_extracted, resume_id, pages_processed, skills[] }
```

### POST `/api/extract-skills` — Job Description Skill Extraction

```
Request: { text: string (min 10 chars) }
│
├─ 1. Validate input (min 10 chars)
├─ 2. Build prompt for HuggingFace
├─ 3. Call hfGenerate(prompt) → flan-t5-base
├─ 4. Parse JSON array of skill names
├─ 5. Normalize (lowercase, trim, deduplicate)
├─ 6. Match against ALL skills in database
│  └─ Returns: { skills: string[] (matched), suggested: string[] (unknown) }
└─ 7. Return result
```

### POST `/api/recruiter/match` — Candidate Matching Engine

```
Request: { job_id: string, access_token: string }
│
├─ 1. Auth + Authorize (must be RECRUITER)
├─ 2. Fetch job: title, extracted_skills, recruiter_id
├─ 3. If no skills extracted → return empty, message
├─ 4. Fetch ALL JOB_SEEKER users (limit 200)
├─ 5. Fetch ALL their resumes + resume_skills
├─ 6. Build user→[skill names] map
├─ 7. For each user:
│     ├─ Compare lowercased required vs lowercased user skills
│     ├─ Fuzzy match: user.includes(required) || required.includes(user)
│     ├─ score = (matched_count / total_required) × 100
│     └─ Only include if score > 0
├─ 8. Sort by score DESC
├─ 9. Delete old match_logs for this recruiter+job
├─ 10. Insert new match_logs with status='MATCHED'
└─ 11. Return { matches[], job_title, required_skills }
```

### POST `/api/roadmap/generate` — AI Roadmap Generation

```
Request: { skill_id: string }
│
├─ 1. Check if roadmap already exists → return early if so
├─ 2. Fetch skill name + category
├─ 3. Build prompt for Groq:
│     "Generate a learning roadmap for {skill} with exactly 5 checkpoints.
│      Each checkpoint: {title, description, content (Learn/Practice/Resources,
│      Project on final), is_final, quizzes[3] {question, options[4], answer}}"
├─ 4. Call groqChat() → llama-3.3-70b (4096 max_tokens)
├─ 5. Parse JSON, sanitize
├─ 6. Insert into roadmap_templates
├─ 7. For each checkpoint: insert into roadmap_checkpoints
├─ 8. For each quiz: insert into checkpoint_quizzes
└─ 9. Return { template_id, checkpoints_count }
```

---

## 12. BUSINESS LOGIC: SKILL EXTRACTION

### Two Paths to Acquire Skills

```
PATH 1: Resume Upload (Automatic)
┌──────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐
│ Upload   │ → │ AI Extract│ → │ Validate  │ → │ Link to  │
│ PDF      │   │ (Groq)   │   │ in text   │   │ resume   │
│ Resume   │   │ + Keyword │   │ + Merge   │   │ skills   │
└──────────┘   └──────────┘   └───────────┘   └──────────┘

PATH 2: Roadmap Learning (Intentional)
┌──────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐
│ Select   │ → │ Complete │ → │ Pass All  │ → │ Skill    │
│ Star in  │   │ 5 Check- │   │ Quizzes   │   │ Acquired │
│ Universe │   │ points   │   │ Correctly │   │ (user_   │
│          │   │          │   │           │   │  skills) │
└──────────┘   └──────────┘   └───────────┘   └──────────┘
```

### Skill Validation Logic (in `/api/parse-resume`)

```
AI says: ["Python", "React", "QuantumComputing"]

For each AI skill → verify in raw text:
  "Python" found in text? YES  → KEEP
  "React" found in text?  YES  → KEEP
  "QuantumComputing" found? NO → DISCARD (hallucination guard)

Keyword match also runs in parallel → fills gaps:
  Regex finds "python" in text → ADD (with source: 'keyword')
  Regex finds "sql" in text → ADD

Final list = verified AI skills + all keyword skills (deduplicated)
```

---

## 13. BUSINESS LOGIC: RECRUITER MATCHING

```
Job: "Senior Software Engineer"
Required skills (extracted by HuggingFace): ["python", "react", "sql", "aws"]
                                                          
         ┌─────────────────────────────────────────────────┐
         │             CANDIDATE POOL                       │
         │  (All JOB_SEEKER users, max 200)                 │
         │                                                   │
         │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
         │  │ Alice    │  │ Bob      │  │ Charlie  │       │
         │  │ Python ✓ │  │ Python ✓ │  │ Java ✓   │       │
         │  │ React ✓  │  │ AWS ✓    │  │ SQL ✓    │       │
         │  │ SQL ✓    │  │ Docker ✓ │  │          │       │
         │  │ Score:   │  │ Score:   │  │ Score:   │       │
         │  │ 75%      │  │ 50%      │  │ 25%      │       │
         │  └──────────┘  └──────────┘  └──────────┘       │
         │                                                   │
         │  Sort DESC: Alice → Bob → Charlie                 │
         └─────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  match_logs      │
                    │  INSERT status:  │
                    │  'MATCHED'       │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Recruiter clicks│
                    │  "Notify"        │
                    ▼
               ┌──────────────────┐
               │  notifications   │
               │  INSERT for      │
               │  candidate       │
               │  match_logs      │
               │  UPDATE →        │
               │  'NOTIFIED'      │
               └──────────────────┘
```

---

## 14. BUSINESS LOGIC: ROADMAP GENERATION & LEARNING

### Roadmap Structure

```
ROADMAP for "Python" (skill_id = abc-123)
│
├─ template_id = def-456 (1:1 with skill)
│
├─ CHECKPOINT 0 (step_index=0)
│  ├─ title: "Python Basics"
│  ├─ content: {Learn: ..., Practice: ..., Resources: ...}
│  ├─ is_final: false
│  └─ QUIZZES:
│     ├─ Q1: "What is a variable?" options: [...] answer: 0
│     ├─ Q2: "What is a list?"     options: [...] answer: 2
│     └─ Q3: "How to define a fn?" options: [...] answer: 1
│
├─ CHECKPOINT 1
│  ├─ title: "Data Types & Structures"
│  └─ ... (similar)
│
├─ CHECKPOINT 2
│  ├─ title: "Control Flow & Functions"
│  └─ ...
│
├─ CHECKPOINT 3
│  ├─ title: "OOP & Modules"
│  └─ ...
│
└─ CHECKPOINT 4 (step_index=4)
   ├─ title: "Final Project"
   ├─ content: {Learn: ..., Practice: ..., Resources: ..., Project: ...}
   ├─ is_final: true
   └─ QUIZZES: (3 questions)
```

### Learning Progress State Machine

```
                ┌──────────────────────────────────────┐
                │        USER_ROADMAPS                  │
                │  {user_id, skill_id}                  │
                │                                       │
                │  current_step: 2                      │
                │  passed_steps: [cp0_id, cp1_id]       │
                │  completed_at: null                   │
                └──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   ┌──────────┐          ┌──────────┐          ┌──────────┐
   │ CHECKPOINT 0         │ CHECKPOINT 1         │ CHECKPOINT 2
   │ (Completed ✅)       │ (Completed ✅)       │ (Current 🔓)
   │ Quiz passed          │ Quiz passed          │ Quiz pending
   └──────────┘           └──────────┘           └──────────┘

When user submits quiz for Checkpoint 2:
  POST /api/roadmap/advance
  ├─ Rate limit check (max 100/hr)
  ├─ Fetch correct answer from checkpoint_quizzes
  ├─ Compare selected_answer vs stored answer
  ├─ If correct:
  │   ├─ Append checkpoint_id to passed_steps
  │   ├─ Increment current_step
  │   └─ Return { correct: true, progress }
  └─ If incorrect:
      └─ Return { correct: false, progress: null }

When all 5 checkpoints completed:
  POST /api/roadmap/complete
  ├─ Daily rate limit (max 10/day)
  ├─ Verify passed_steps.length === total checkpoints
  ├─ UPDATE user_roadmaps SET completed_at = NOW()
  └─ UPSERT into user_skills { source: 'roadmap' }
```

---

## 15. 3D UNIVERSE VISUALIZATION

### Scene Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   3D UNIVERSE SCENE                       │
│  (@react-three/fiber Canvas)                             │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  CosmicBackground                                  │  │
│  │  (nebula particles + distant starfield)            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  SingularityCore                                   │  │
│  │  (animated central sphere, pulsing)                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  CosmicStrings                                     │  │
│  │  (lines from core to acquired stars)               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  7 GALAXY CLUSTERS (spiral)                        │  │
│  │                                                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │  │Programming│  │   ML     │  │  Cloud   │  ...    │  │
│  │  │ Spiral    │  │ Spiral   │  │ Spiral   │        │  │
│  │  └──────────┘  └──────────┘  └──────────┘        │  │
│  │                                                     │  │
│  │  Each galaxy contains:                              │  │
│  │  • Stars (skills) orbiting spiral path              │  │
│  │  • StarBurstLines (connections within galaxy)       │  │
│  │  • GalaxyLabel (text overlay)                       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  StarMesh (individual skill stars)                  │  │
│  │  • White glowing → ACQUIRED skill                  │  │
│  │  • Colored (by category) → UNACQUIRED              │  │
│  │  • Hover → HoverLabel (skill name)                 │  │
│  │  • Click → SkillDetailPanel (right sidebar)        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  OrbitControls                                     │  │
│  │  (user drags to rotate, scroll to zoom)            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

       +----------------------------------------------+
       |  SKILL DETAIL PANEL (Right Sidebar)          |
       |                                              |
       |  [Close X]                                   |
       |                                              |
       |  Skill: Python                               |
       |  Category: Programming                       |
       |  Demand Score: 92/100                        |
       |  Avg Salary: $95,000                        |
       |  Market Frequency: Very High                 |
       |                                              |
       |  [ Start Learning Roadmap ]                  |
       +----------------------------------------------+
```

### Star-to-Galaxy Mapping

| Category (Galaxy) | Color (Hex) | Example Skills |
|-------------------|-------------|---------------|
| Programming | `#FF6B6B` (Red) | Python, Java, C++, TypeScript, Rust |
| ML | `#845EC2` (Purple) | TensorFlow, PyTorch, NLP, Computer Vision |
| Cloud | `#00C2FF` (Blue) | AWS, Azure, GCP, Kubernetes |
| DevOps | `#FFA726` (Orange) | Docker, Jenkins, GitLab CI, Terraform |
| Data | `#4CAF50` (Green) | SQL, Pandas, Spark, Tableau |
| Cybersecurity | `#FF1744` (Deep Red) | Network Security, Cryptography, Kali Linux |
| Soft Skills | `#FFD700` (Gold) | Leadership, Communication, Project Management |

---

## 16. DATA FLOW DIAGRAMS

### 16a. Full Resume Parsing Data Flow

```
┌──────────┐          ┌──────────────┐          ┌─────────────┐
│  Browser │          │  Next.js API │          │  Supabase   │
│  (Client)│          │  (Server)    │          │  (DB)       │
└────┬─────┘          └──────┬───────┘          └──────┬──────┘
     │                       │                         │
     │  POST /api/parse-     │                         │
     │  resume {             │                         │
     │   resume_id,          │                         │
     │   file_data (base64)  │                         │
     │  }                    │                         │
     │──────────────────────►│                         │
     │                       │  Decode PDF             │
     │                       │  Extract text           │
     │                       │  (pdf-parse)            │
     │                       │                         │
     │                       │  ┌─────────────────┐    │
     │                       │  │ Groq AI         │    │
     │                       │  │ (llama-3.3-70b) │    │
     │                       │  │ Extract skills  │    │
     │                       │  │ from text       │    │
     │                       │  └────────┬────────┘    │
     │                       │           │              │
     │                       │  Regex keyword match    │
     │                       │  Merge + validate       │
     │                       │                         │
     │                       │  SELECT/INSERT skills   │
     │                       │────────────────────────►│
     │                       │  INSERT resume_skills   │
     │                       │────────────────────────►│
     │                       │  UPDATE resumes          │
     │                       │  (parsing_status=DONE)  │
     │                       │────────────────────────►│
     │  { success, skills }  │                         │
     │◄──────────────────────│                         │
     │                       │                         │
```

### 16b. Roadmap Learning Data Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Browser │     │  Next.js API │     │  Supabase   │     │  Groq    │
│  (Client)│     │  (Server)    │     │  (DB)       │     │  (AI)    │
└────┬─────┘     └──────┬───────┘     └──────┬──────┘     └────┬─────┘
     │                  │                    │                 │
     │  GET /api/roadmap│                    │                 │
     │?skill_id=...     │                    │                 │
     │─────────────────►│  SELECT roadmap    │                 │
     │                  │───────────────────►│                 │
     │                  │    404 (no roadmap)│                 │
     │◄─────────────────│                    │                 │
     │                  │                    │                 │
     │  POST /api/      │                    │                 │
     │  roadmap/generate│                    │                 │
     │─────────────────►│                    │                 │
     │                  │  Prompt: generate  │                 │
     │                  │  5 checkpoints     │────────────────►│
     │                  │  with 3 quizzes    │                 │
     │                  │  each for {skill}  │                 │
     │                  │◄───────────────────│─────────────────│
     │                  │                    │                 │
     │                  │  INSERT template   │                 │
     │                  │───────────────────►│                 │
     │                  │  INSERT checkpoints│                 │
     │                  │───────────────────►│                 │
     │                  │  INSERT quizzes    │                 │
     │                  │───────────────────►│                 │
     │◄─────────────────│                    │                 │
     │                  │                    │                 │
     │  GET /api/roadmap│                    │                 │
     │  (retry)         │                    │                 │
     │─────────────────►│  SELECT now exists │                 │
     │◄─────────────────│──────────────────►│                 │
     │                  │                    │                 │
     │  [User studies,  │                    │                 │
     │   answers quiz]  │                    │                 │
     │  POST /api/      │                    │                 │
     │  roadmap/advance │                    │                 │
     │─────────────────►│  Verify auth       │                 │
     │                  │  Rate limit check  │                 │
     │                  │  Fetch correct ans │                 │
     │                  │───────────────────►│                 │
     │                  │  UPDATE/INSERT     │                 │
     │                  │  user_roadmaps     │                 │
     │                  │───────────────────►│                 │
     │  { correct,      │                    │                 │
     │    progress }    │                    │                 │
     │◄─────────────────│                    │                 │
     │                  │                    │                 │
     │  [All 5 done]    │                    │                 │
     │  POST /api/      │                    │                 │
     │  roadmap/complete│                    │                 │
     │─────────────────►│  Rate limit check  │                 │
     │                  │  Verify all passed │                 │
     │                  │  UPDATE completed  │                 │
     │                  │───────────────────►│                 │
     │                  │  UPSERT user_skills│                 │
     │                  │───────────────────►│                 │
     │  { success }     │                    │                 │
     │◄─────────────────│                    │                 │
     │                  │                    │                 │
```

### 16c. Recruiter Matching Data Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Browser │     │  Next.js API │     │  Supabase   │     │  HuggingFace │
│  (Client)│     │  (Server)    │     │  (DB)       │     │  (AI)        │
└────┬─────┘     └──────┬───────┘     └──────┬──────┘     └──────┬───────┘
     │                  │                    │                   │
     │  POST /api/      │                    │                   │
     │  recruiter/jobs  │                    │                   │
     │  {title, desc}   │                    │                   │
     │─────────────────►│  Auth + Authorize  │                   │
     │                  │  (must be RECRUIT)│                   │
     │                  │                    │                   │
     │                  │  POST /api/extract-│                   │
     │                  │  skills (internal) │                   │
     │                  │  with description  │──────────────────►│
     │                  │  ← ["python","sql"]│◄──────────────────│
     │                  │                    │                   │
     │                  │  INSERT job_listing│                   │
     │                  │───────────────────►│                   │
     │  { job, skills } │                    │                   │
     │◄─────────────────│                    │                   │
     │                  │                    │                   │
     │  [Recruiter      │                    │                   │
     │   clicks Match]  │                    │                   │
     │  POST /api/      │                    │                   │
     │  recruiter/match │                    │                   │
     │─────────────────►│  1. Fetch job      │                   │
     │                  │───────────────────►│                   │
     │                  │  2. Fetch ALL      │                   │
     │                  │     JOB_SEEKERs    │                   │
     │                  │───────────────────►│                   │
     │                  │  3. Fetch resumes  │                   │
     │                  │     + skills       │                   │
     │                  │───────────────────►│                   │
     │                  │  4. Compare skills │                   │
     │                  │     Score each     │                   │
     │                  │     candidate      │                   │
     │                  │  5. Delete old     │                   │
     │                  │     match_logs     │                   │
     │                  │───────────────────►│                   │
     │                  │  6. INSERT new     │                   │
     │                  │     match_logs     │                   │
     │                  │───────────────────►│                   │
     │  { matches[] }  │                    │                   │
     │◄─────────────────│                    │                   │
     │                  │                    │                   │
     │  [Recruiter      │                    │                   │
     │   clicks Notify] │                    │                   │
     │  POST /api/      │                    │                   │
     │  recruiter/notify│                    │                   │
     │─────────────────►│  INSERT notifica-  │                   │
     │                  │  tion for candidate│                   │
     │                  │───────────────────►│                   │
     │                  │  UPDATE match_logs │                   │
     │                  │  status = NOTIFIED │                   │
     │                  │───────────────────►│                   │
     │  { success }     │                    │                   │
     │◄─────────────────│                    │                   │
     │                  │                    │                   │
```

### 16d. Auth Flow (Supabase + JWT)

```
┌──────────┐                  ┌─────────────┐
│  Browser │                  │  Supabase   │
│  (Client)│                  │  Auth       │
└────┬─────┘                  └──────┬──────┘
     │                               │
     │  supabase.auth.signUp()       │
     │  / signInWithPassword()       │
     │──────────────────────────────►│
     │                               │
     │  Returns: { user, session }   │
     │  session.access_token (JWT)   │
     │◄──────────────────────────────│
     │                               │
     │  Stores JWT in localStorage   │
     │  (Supabase auto-manages)      │
     │                               │
     │  [On every Supabase query]    │
     │  JWT sent as Bearer token     │
     │  → RLS evaluates auth.uid()   │
     │                               │
     │  [On API route calls]         │
     │  Client sends access_token    │
     │  in body/query params         │
     │                               │
     │  API route calls:             │
     │  supabase.auth.getUser(token) │
     │──────────────────────────────►│
     │  ← user data                 │
     │◄──────────────────────────────│
```

---

## APPENDIX: Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `frontend/app/layout.tsx` | Root layout + Navigation |
| `frontend/components/Navigation.tsx` | Global nav bar |
| `frontend/lib/supabase.ts` | DB client + TypeScript types |
| `frontend/lib/auth.ts` | Auth functions (register, login, logout) |
| `frontend/lib/openaiClient.ts` | Groq AI wrapper |
| `frontend/lib/hfClient.ts` | HuggingFace AI wrapper |
| `frontend/lib/careerPath.ts` | Market skills queries |
| `frontend/app/api/parse-resume/route.ts` | Resume parsing engine |
| `frontend/app/api/recruiter/match/route.ts` | Candidate matching |
| `frontend/app/api/roadmap/generate/route.ts` | AI roadmap generation |
| `supabase/schema.sql` | Full database schema |
| `frontend/scripts/seed_skills.py` | Skill seeding script |

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...
HF_TOKEN=...
```

### Key Numbers
- **528** skills seeded in database
- **5** checkpoints per roadmap
- **3** quizzes per checkpoint
- **10** skill completions per day (rate limit)
- **100** quiz submissions per hour (rate limit)
- **200** max candidates fetched for matching
- **7** skill categories (galaxies)
- **14** database tables
- **14** page routes
- **12** API routes
- **2** external AI services (Groq, HuggingFace)
