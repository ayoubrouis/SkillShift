# SkillShift — Database Schema

## Overview

14 tables in Supabase (PostgreSQL) with Row-Level Security enforced on all user-data tables.

---

## Tables

### 1. `users`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Maps to `auth.users.id` |
| `email` | TEXT | User email |
| `full_name` | TEXT | Display name |
| `role` | `user_role` ENUM | `JOB_SEEKER`, `RECRUITER`, or `ADMIN` |
| `tutorial_completed` | BOOLEAN | Onboarding status |

### 2. `skills`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT | Skill name |
| `normalized_name` | TEXT | Lowercase for matching |
| `category` | `skill_category` ENUM | `PROGRAMMING`, `ML`, `CLOUD`, `DEVOPS`, `DATA`, `CYBERSECURITY`, `SOFT_SKILLS` |
| `frequency` | INTEGER | Market demand frequency |
| `avg_salary` | NUMERIC | Average salary for this skill |
| `demand_score` | INTEGER | Normalized demand score (0-100) |

### 3. `resumes`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `student_id` | UUID FK → `users.id` | Owner |
| `file_url` | TEXT | Uploaded PDF path |
| `raw_text` | TEXT | Extracted text from PDF |
| `upload_date` | TIMESTAMPTZ | |
| `parsing_status` | `parsing_status` ENUM | `PENDING`, `PARSING`, `DONE`, `ERROR` |

### 4. `resume_skills`
| Column | Type | Description |
|---|---|---|
| `resume_id` | UUID FK → `resumes.id` | |
| `skill_id` | UUID FK → `skills.id` | |
| `proficiency` | TEXT | Extracted proficiency level |

### 5. `user_skills`
| Column | Type | Description |
|---|---|---|
| `user_id` | UUID FK → `users.id` | |
| `skill_id` | UUID FK → `skills.id` | |
| `acquired` | BOOLEAN | Whether star is activated |
| `acquired_at` | TIMESTAMPTZ | When skill was mastered |

### 6. `job_listings`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `title` | TEXT | Job title |
| `company_name` | TEXT | |
| `salary_clean` | NUMERIC | |
| `region` | TEXT | |
| `remote_type` | TEXT | |
| `source` | `source_type` ENUM | |
| `description` | TEXT | Full job description |
| `extracted_skills` | JSONB | Skills extracted via Ollama |
| `recruiter_id` | UUID FK → `users.id` | |
| `is_active` | BOOLEAN | |

### 7. `listing_skills`
| Column | Type | Description |
|---|---|---|
| `listing_id` | UUID FK → `job_listings.id` | |
| `skill_id` | UUID FK → `skills.id` | |
| `is_required` | BOOLEAN | |

### 8. `roadmap_templates`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `skill_id` | UUID FK → `skills.id` | Target skill |

### 9. `roadmap_checkpoints`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `template_id` | UUID FK → `roadmap_templates.id` | |
| `step_index` | INTEGER | Order |
| `title` | TEXT | |
| `description` | TEXT | |
| `content` | TEXT | |
| `is_final` | BOOLEAN | |

### 10. `checkpoint_quizzes`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `checkpoint_id` | UUID FK → `roadmap_checkpoints.id` | |
| `question` | TEXT | |
| `options` | JSONB | Multiple choice options |
| `answer` | TEXT | Correct answer |

### 11. `user_roadmaps`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users.id` | |
| `template_id` | UUID FK → `roadmap_templates.id` | |
| `skill_id` | UUID FK → `skills.id` | |
| `current_step` | INTEGER | Progress |
| `started_at` | TIMESTAMPTZ | |
| `completed_at` | TIMESTAMPTZ | |

### 12. `match_logs`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `recruiter_id` | UUID FK → `users.id` | |
| `student_id` | UUID FK → `users.id` | |
| `listing_id` | UUID FK → `job_listings.id` | |
| `status` | TEXT | `PENDING`, `MATCHED`, `NOTIFIED` |
| `matched_at` | TIMESTAMPTZ | |

### 13. `notifications`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users.id` | Recipient |
| `title` | TEXT | |
| `message` | TEXT | |
| `is_read` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

### 14. `rate_limits`
| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `users.id` | |
| `action` | TEXT | e.g. `quiz_submit` |
| `count` | INTEGER | |
| `window_start` | TIMESTAMPTZ | |

---

## Enums

```sql
CREATE TYPE user_role AS ENUM ('JOB_SEEKER', 'RECRUITER', 'ADMIN');
CREATE TYPE parsing_status AS ENUM ('PENDING', 'PARSING', 'DONE', 'ERROR');
CREATE TYPE skill_category AS ENUM ('PROGRAMMING', 'ML', 'CLOUD', 'DEVOPS', 'DATA', 'CYBERSECURITY', 'SOFT_SKILLS');
CREATE TYPE source_type AS ENUM ('MANUAL', 'IMPORT');
```

---

## Row-Level Security

All tables have RLS enabled. Key policies:

| Table | Policy | Effect |
|---|---|---|
| `users` | `SELECT own` | Users read only their own row |
| `users` | `Admins can read all users` | Admin access via `is_admin()` |
| `users` | `Admins can update/delete users` | Admin management |
| `resumes` | `own` | Users manage only their own resumes |
| `resume_skills` | `own` | Via resume ownership |
| `skills` | `SELECT public` | Everyone can view skills |
| `job_listings` | `SELECT public` | Everyone can view listings |
| `user_roadmaps` | `own` | Users manage only their own roadmaps |
| `user_skills` | `own` | Users manage only their own skills |
| `roadmap_templates` | `SELECT public` | Templates are public |
| `roadmap_checkpoints` | `SELECT public` | Checkpoints are public |
| `checkpoint_quizzes` | `SELECT public` | Quizzes are public |
| `match_logs` | `SELECT by recruiter OR student` | Both parties can view matches |
| `notifications` | `own` | Users see only their own notifications |

### Admin Helper Function

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN');
$$;
```

This function uses `SECURITY DEFINER` to bypass RLS on the `users` table, avoiding infinite recursion.
