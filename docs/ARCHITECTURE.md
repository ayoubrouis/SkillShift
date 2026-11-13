# SkillShift — System Architecture

## Overview

SkillShift is a career navigation platform that bridges the gap between **job seekers** and **recruiters** through AI-powered skill extraction, interactive 3D skill visualization, and intelligent candidate matching.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| **3D Visualization** | Three.js via @react-three/fiber + @react-three/drei |
| **Charts** | Recharts |
| **Backend** | Next.js API Routes (serverless, App Router) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **AI / LLM** | Ollama (local — llama3.2:3b for text, qwen3-vl:4b for vision) |
| **Language** | TypeScript (end-to-end) |

---

## System Layers

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 16)               │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │  Pages   │  │ Layouts  │  │   Components       │  │
│  │ (app/*)  │  │ (layout) │  │   (Recharts, UI)   │  │
│  └────┬─────┘  └──────────┘  └────────────────────┘  │
│       │                                                │
│  ┌────▼───────────────────────────────────────────┐   │
│  │            Next.js API Routes                  │   │
│  │  /api/candidate-universe  /api/recruiter/*     │   │
│  │  /api/roadmap/*           /api/extract-skills   │   │
│  │  /api/parse-resume        /api/ollama-status    │   │
│  │  /api/update-resume-skills                     │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
          │                    │               │
          ▼                    ▼               ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase DB   │  │ Supabase Auth│  │   Ollama AI  │
│   (PostgreSQL)  │  │  (JWT, RLS)  │  │ (llama3.2:3b)│
└─────────────────┘  └──────────────┘  └──────────────┘
```

### 1. Presentation Layer (Frontend Pages)

| Page | Route | Purpose |
|---|---|---|
| Landing | `/` | Welcome page |
| Login | `/login` | Authentication with admin toggle |
| Register | `/register` | New user signup |
| Dashboard | `/dashboard` | Admin stats + charts |
| Universe | `/universe` | 3D skill visualization |
| Recruiter | `/recruiter` | Job posting, matching, notifying |
| Admin | `/admin` | User/skills/roadmap management |
| Onboarding | `/onboarding` | First-time tutorial |
| Roadmap | `/roadmap` | Learning roadmap view |
| Notifications | `/notifications` | In-app notifications |
| Upload Resume | `/upload-resume` | Resume parsing |
| Skills Review | `/skills-review` | Confirm extracted skills |
| Forgot/Reset Password | `/forgot-password`, `/reset-password` | Password recovery |

### 2. API Layer (Serverless Routes)

All API routes use the **Supabase service_role key** to bypass RLS for internal operations. Authentication is verified via `access_token` parameters.

| Route | Purpose |
|---|---|
| `GET /api/candidate-universe` | Fetch candidate's skills/resume for read-only universe view |
| `POST /api/extract-skills` | Extract skills from text via Ollama |
| `GET /api/ollama-status` | Check Ollama AI availability |
| `POST /api/parse-resume` | Parse uploaded PDF resume |
| `POST /api/update-resume-skills` | Update skills after resume parsing |
| `GET,POST /api/recruiter/candidates` | List/search job seekers |
| `GET,POST /api/recruiter/jobs` | CRUD job listings |
| `POST /api/recruiter/match` | Match candidates to a job |
| `POST /api/recruiter/notify` | Send notification to a candidate |
| `GET,POST /api/roadmap` | Roadmap CRUD |
| `POST /api/roadmap/generate` | Generate AI roadmap |
| `POST /api/roadmap/advance` | Advance to next checkpoint |
| `POST /api/roadmap/complete` | Mark checkpoint complete |

### 3. Database Layer (Supabase)

14 tables with Row-Level Security. See [DATABASE.md](./DATABASE.md).

### 4. AI Layer (Ollama)

Two Ollama models running on the development machine:
- **llama3.2:3b** — used for extracting skills from job descriptions and generating learning roadmap steps
- **qwen3-vl:4b** — vision model used for extracting skills from resume page images

---

## Data Flow

### Job Seeker Flow
```
Upload Resume → Parse PDF (Ollama extracts skills) → Review/Confirm Skills → View 3D Universe
                                                                                      │
                                                                                      ▼
                                                                          Generate Roadmap → Complete Steps → Take Quiz → Activate Star
```

### Recruiter Flow
```
Post Job → AI extracts required skills → Match Candidates → View Candidate Universe → Notify
```

### Admin Flow
```
Login → Dashboard (stats + charts) ↔ Manage Users ↔ Manage Skills ↔ Manage Roadmaps
```

---

## Security Architecture

- **Supabase Auth** manages user sessions (JWT-based)
- **Row-Level Security (RLS)** on all tables enforces data isolation
- **`public.is_admin()`** SECURITY DEFINER function for admin access (avoids RLS recursion)
- **Service role key** used only in server-side API routes (never exposed to client)
- **Client-side** Supabase queries use the authenticated user's JWT

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Service-role API routes over RLS for cross-user access | Avoids complex RLS policies for recruiter viewing candidate data |
| On-demand roadmap generation | Reduces storage; roadmaps generated per-request via Ollama |
| Server-authoritative quiz validation | Prevents client-side answer manipulation |
| `is_admin()` SECURITY DEFINER function | Breaks RLS recursion on the `users` table |
