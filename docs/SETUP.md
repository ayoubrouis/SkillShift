# SkillShift — Setup Guide

## Prerequisites

- **Node.js** >= 18
- **npm** or **yarn**
- **Supabase** account (free tier)
- **Ollama** installed locally with `llama3.2:3b` model
- **Git**

---

## 1. Clone & Install

```bash
git clone <repository-url>
cd SkillShift
cd frontend
npm install
```

---

## 2. Supabase Setup

### Create a project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon key** and **service_role key**

### Run the schema
Open the Supabase SQL Editor and run the contents of `supabase/schema.sql`

### Create users
Use Supabase Auth to create at least:
- 1 Admin user (role: `ADMIN`)
- 1 Recruiter user (role: `RECRUITER`)
- A few Job Seeker users (role: `JOB_SEEKER`)

---

## 3. Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 4. Ollama Setup

```bash
# Install Ollama (if not already installed)
# Visit https://ollama.com/

# Pull the models
ollama pull llama3.2:3b
ollama pull qwen3-vl:4b

# Verify it's running
ollama list
```

The API will be available at `http://localhost:11434` by default.

---

## 5. Run the Application

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Verify Installation

| Check | URL / Action |
|---|---|
| App loads | http://localhost:3000 |
| Ollama status | Visit `/api/ollama-status` |
| Login | Navigate to `/login`, try credentials |
| Register | Navigate to `/register`, create account |

---

## Common Issues

### "Supabase client not initialized"
Ensure `.env.local` exists with all required variables.

### "Ollama is not running"
Start Ollama: `ollama serve` and verify with `curl http://localhost:11434/api/tags`

### "RLS policy violation"
The client-side Supabase client requires the user to be authenticated. Log in first.

### Build errors
```bash
npm run build
# Check for TypeScript errors and fix imports
```
