# SkillShift

**AI-Powered Career Navigation Platform**

Academic Year: 2025-2026 | PFE: Multimedia, Big Data & AI Automation

---

## Overview

SkillShift bridges the gap between **job seekers** and **recruiters** through AI-powered skill extraction, interactive 3D skill visualization, and intelligent candidate matching.

- **Job Seekers:** Upload resumes → AI extracts skills → Explore skills in 3D universe → Generate learning roadmaps → Complete quizzes → Activate stars
- **Recruiters:** Post jobs → AI extracts requirements → Match candidates → View candidate universes → Send notifications
- **Admins:** Dashboard with stats/charts → Manage users, skills, and roadmaps

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| 3D | Three.js (react-three-fiber) |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT, RLS) |
| AI | Ollama (llama3.2:3b, local) |

---

## Quick Start

```bash
cd frontend
npm install
# Create .env.local (see docs/SETUP.md)
npm run dev
```

Requires: Node.js 18+, Supabase project, Ollama with `llama3.2:3b`

---

## Project Structure

```
SkillShift/
├── frontend/          # Next.js application
│   ├── app/           # Pages (app/*) + API routes (app/api/*)
│   └── lib/           # Shared utilities (auth, supabase client)
├── supabase/
│   └── schema.sql     # Full database schema + RLS policies
├── docs/              # Documentation
│   ├── ARCHITECTURE.md
│   ├── SPRINTS.md
│   ├── DATABASE.md
│   ├── SETUP.md
│   └── API.md
├── PFE Diagrams/      # PlantUML use case + class diagrams
├── Report-latex/      # LaTeX report (template + generated)
└── README.md
```

---

## Sprints

| Sprint | Scope |
|---|---|
| **0** | Infrastructure + market skills catalog |
| **1** | Authentication, onboarding, resume upload, skill extraction |
| **2** | 3D interactive skill universe |
| **3** | AI-generated roadmaps, checkpoints, quizzes, star activation |
| **4** | Recruiter matching, notifications, admin dashboards |

See [docs/SPRINTS.md](docs/SPRINTS.md) for details.

---

## Documentation

| File | Content |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System layers, data flow, security |
| [SPRINTS.md](docs/SPRINTS.md) | Sprint-by-sprint breakdown |
| [DATABASE.md](docs/DATABASE.md) | 14 tables, enums, RLS policies |
| [SETUP.md](docs/SETUP.md) | Installation & configuration |
| [API.md](docs/API.md) | All API endpoints |
