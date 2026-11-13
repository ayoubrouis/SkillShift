# SkillShift — API Reference

All API routes are Next.js App Router route handlers. Authentication is done via `access_token` query parameter (the user's Supabase JWT).

---

## Candidate Universe

### `GET /api/candidate-universe`
Fetch a candidate's skills, resume data, and user profile for read-only viewing.

**Query params:** `candidate_id` (UUID)

**Response:**
```json
{
  "skills": [...],
  "userSkills": [...],
  "resumeSkills": [...],
  "user": { "id", "full_name", "email" }
}
```

---

## Recruiter

### `POST /api/recruiter/match`
Match candidates to a job listing by comparing required skills vs candidate skills.

**Body:** `{ job_id, access_token }`

**Response:**
```json
{
  "matches": [
    {
      "candidate_id": "uuid",
      "full_name": "...",
      "email": "...",
      "matched_skills": ["skill1", "skill2"],
      "matched_count": 3,
      "total_required": 5,
      "score": 60
    }
  ],
  "job_title": "...",
  "required_skills": ["..."]
}
```

### `POST /api/recruiter/notify`
Send a notification to a matched candidate.

**Body:** `{ candidate_id, job_id, message, access_token }`

### `GET /api/recruiter/candidates`
List or search job seekers with their skills.

**Query params:** `access_token`, `search` (optional)

### `GET /api/recruiter/jobs`
List recruiter's job postings.

### `POST /api/recruiter/jobs`
Post a new job. AI extracts skills from description.

**Body:** `{ title, description, access_token }`

---

## Roadmap

### `GET /api/roadmap`
Get user's roadmaps.

### `POST /api/roadmap/generate`
Generate a new AI-powered learning roadmap.

**Body:** `{ skill_id, access_token }`

### `POST /api/roadmap/advance`
Advance to the next checkpoint.

**Body:** `{ roadmap_id, access_token }`

### `POST /api/roadmap/complete`
Mark a checkpoint as complete.

**Body:** `{ roadmap_id, checkpoint_id, access_token }`

---

## Skills

### `POST /api/extract-skills`
Extract skill keywords from text using Ollama.

**Body:** `{ text }`

### `POST /api/update-resume-skills`
Update extracted skills after resume parsing.

**Body:** `{ resume_id, skill_ids }`

---

## Resume

### `POST /api/parse-resume`
Parse an uploaded PDF resume and extract skills.

**Body:** FormData with `file` field

---

## System

### `GET /api/ollama-status`
Check if Ollama AI is available and responding.
