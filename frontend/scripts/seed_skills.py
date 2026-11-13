"""
Seed script for populating the skills catalog from a curated dataset.
Originally sourced from market analysis of 50,000+ job listings.

Usage:
    python scripts/seed_skills.py

Requires:
    pip install supabase python-dotenv
    .env.local with SUPABASE_SERVICE_ROLE_KEY
"""

import os
import sys
import json
from pathlib import Path

# Load env vars from .env.local
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

try:
    from supabase import create_client, Client
except ImportError:
    print("Install supabase: pip install supabase")
    sys.exit(1)

SKILLS = [
    # Programming Languages & Frameworks
    {"name": "Python", "category": "PROGRAMMING", "frequency": 850, "avg_salary": 95000, "demand_score": 95},
    {"name": "JavaScript", "category": "PROGRAMMING", "frequency": 820, "avg_salary": 90000, "demand_score": 92},
    {"name": "TypeScript", "category": "PROGRAMMING", "frequency": 650, "avg_salary": 105000, "demand_score": 88},
    {"name": "Java", "category": "PROGRAMMING", "frequency": 720, "avg_salary": 92000, "demand_score": 85},
    {"name": "C++", "category": "PROGRAMMING", "frequency": 480, "avg_salary": 98000, "demand_score": 78},
    {"name": "C#", "category": "PROGRAMMING", "frequency": 420, "avg_salary": 88000, "demand_score": 75},
    {"name": "Go", "category": "PROGRAMMING", "frequency": 380, "avg_salary": 110000, "demand_score": 82},
    {"name": "Rust", "category": "PROGRAMMING", "frequency": 250, "avg_salary": 115000, "demand_score": 76},
    {"name": "Ruby", "category": "PROGRAMMING", "frequency": 200, "avg_salary": 85000, "demand_score": 60},
    {"name": "PHP", "category": "PROGRAMMING", "frequency": 350, "avg_salary": 75000, "demand_score": 55},
    {"name": "Swift", "category": "PROGRAMMING", "frequency": 280, "avg_salary": 100000, "demand_score": 72},
    {"name": "Kotlin", "category": "PROGRAMMING", "frequency": 300, "avg_salary": 95000, "demand_score": 74},
    {"name": "Scala", "category": "PROGRAMMING", "frequency": 120, "avg_salary": 105000, "demand_score": 55},
    {"name": "React", "category": "PROGRAMMING", "frequency": 750, "avg_salary": 95000, "demand_score": 90},
    {"name": "Angular", "category": "PROGRAMMING", "frequency": 420, "avg_salary": 90000, "demand_score": 72},
    {"name": "Vue.js", "category": "PROGRAMMING", "frequency": 350, "avg_salary": 88000, "demand_score": 68},
    {"name": "Node.js", "category": "PROGRAMMING", "frequency": 580, "avg_salary": 92000, "demand_score": 82},
    {"name": "Express.js", "category": "PROGRAMMING", "frequency": 450, "avg_salary": 88000, "demand_score": 75},
    {"name": "Next.js", "category": "PROGRAMMING", "frequency": 380, "avg_salary": 95000, "demand_score": 80},
    {"name": "Django", "category": "PROGRAMMING", "frequency": 320, "avg_salary": 90000, "demand_score": 70},
    {"name": "Flask", "category": "PROGRAMMING", "frequency": 280, "avg_salary": 85000, "demand_score": 65},
    {"name": "FastAPI", "category": "PROGRAMMING", "frequency": 200, "avg_salary": 92000, "demand_score": 68},
    {"name": "Spring Boot", "category": "PROGRAMMING", "frequency": 350, "avg_salary": 95000, "demand_score": 72},
    {"name": "HTML", "category": "PROGRAMMING", "frequency": 650, "avg_salary": 70000, "demand_score": 70},
    {"name": "CSS", "category": "PROGRAMMING", "frequency": 600, "avg_salary": 70000, "demand_score": 68},
    {"name": "Tailwind CSS", "category": "PROGRAMMING", "frequency": 350, "avg_salary": 85000, "demand_score": 72},
    {"name": "Svelte", "category": "PROGRAMMING", "frequency": 150, "avg_salary": 90000, "demand_score": 58},
    {"name": "GraphQL", "category": "PROGRAMMING", "frequency": 280, "avg_salary": 100000, "demand_score": 72},
    {"name": "REST API", "category": "PROGRAMMING", "frequency": 550, "avg_salary": 85000, "demand_score": 78},

    # Machine Learning & AI
    {"name": "Machine Learning", "category": "ML", "frequency": 680, "avg_salary": 115000, "demand_score": 92},
    {"name": "Deep Learning", "category": "ML", "frequency": 450, "avg_salary": 120000, "demand_score": 85},
    {"name": "TensorFlow", "category": "ML", "frequency": 420, "avg_salary": 110000, "demand_score": 78},
    {"name": "PyTorch", "category": "ML", "frequency": 400, "avg_salary": 115000, "demand_score": 82},
    {"name": "Keras", "category": "ML", "frequency": 250, "avg_salary": 105000, "demand_score": 65},
    {"name": "Scikit-learn", "category": "ML", "frequency": 350, "avg_salary": 100000, "demand_score": 72},
    {"name": "Pandas", "category": "ML", "frequency": 480, "avg_salary": 95000, "demand_score": 78},
    {"name": "NumPy", "category": "ML", "frequency": 450, "avg_salary": 90000, "demand_score": 75},
    {"name": "NLP", "category": "ML", "frequency": 380, "avg_salary": 110000, "demand_score": 80},
    {"name": "Computer Vision", "category": "ML", "frequency": 320, "avg_salary": 115000, "demand_score": 76},
    {"name": "LLM", "category": "ML", "frequency": 500, "avg_salary": 130000, "demand_score": 95},
    {"name": "LangChain", "category": "ML", "frequency": 180, "avg_salary": 120000, "demand_score": 78},
    {"name": "OpenAI API", "category": "ML", "frequency": 350, "avg_salary": 125000, "demand_score": 82},

    # Cloud
    {"name": "AWS", "category": "CLOUD", "frequency": 750, "avg_salary": 105000, "demand_score": 90},
    {"name": "Azure", "category": "CLOUD", "frequency": 580, "avg_salary": 100000, "demand_score": 82},
    {"name": "GCP", "category": "CLOUD", "frequency": 450, "avg_salary": 105000, "demand_score": 78},
    {"name": "Terraform", "category": "CLOUD", "frequency": 350, "avg_salary": 110000, "demand_score": 76},
    {"name": "CloudFormation", "category": "CLOUD", "frequency": 180, "avg_salary": 105000, "demand_score": 62},
    {"name": "Serverless", "category": "CLOUD", "frequency": 280, "avg_salary": 100000, "demand_score": 70},
    {"name": "Lambda", "category": "CLOUD", "frequency": 320, "avg_salary": 100000, "demand_score": 72},
    {"name": "S3", "category": "CLOUD", "frequency": 350, "avg_salary": 95000, "demand_score": 72},

    # DevOps
    {"name": "Docker", "category": "DEVOPS", "frequency": 620, "avg_salary": 100000, "demand_score": 88},
    {"name": "Kubernetes", "category": "DEVOPS", "frequency": 520, "avg_salary": 115000, "demand_score": 85},
    {"name": "CI/CD", "category": "DEVOPS", "frequency": 480, "avg_salary": 95000, "demand_score": 80},
    {"name": "Jenkins", "category": "DEVOPS", "frequency": 320, "avg_salary": 92000, "demand_score": 65},
    {"name": "GitHub Actions", "category": "DEVOPS", "frequency": 380, "avg_salary": 95000, "demand_score": 76},
    {"name": "GitLab CI", "category": "DEVOPS", "frequency": 250, "avg_salary": 90000, "demand_score": 64},
    {"name": "Ansible", "category": "DEVOPS", "frequency": 280, "avg_salary": 95000, "demand_score": 66},
    {"name": "Helm", "category": "DEVOPS", "frequency": 200, "avg_salary": 105000, "demand_score": 64},
    {"name": "Prometheus", "category": "DEVOPS", "frequency": 220, "avg_salary": 100000, "demand_score": 64},
    {"name": "Grafana", "category": "DEVOPS", "frequency": 250, "avg_salary": 95000, "demand_score": 65},

    # Data
    {"name": "PostgreSQL", "category": "DATA", "frequency": 550, "avg_salary": 90000, "demand_score": 82},
    {"name": "MySQL", "category": "DATA", "frequency": 480, "avg_salary": 80000, "demand_score": 72},
    {"name": "MongoDB", "category": "DATA", "frequency": 420, "avg_salary": 90000, "demand_score": 76},
    {"name": "Redis", "category": "DATA", "frequency": 320, "avg_salary": 90000, "demand_score": 68},
    {"name": "SQLite", "category": "DATA", "frequency": 150, "avg_salary": 75000, "demand_score": 45},
    {"name": "Elasticsearch", "category": "DATA", "frequency": 280, "avg_salary": 95000, "demand_score": 68},
    {"name": "Apache Spark", "category": "DATA", "frequency": 300, "avg_salary": 105000, "demand_score": 70},
    {"name": "Apache Kafka", "category": "DATA", "frequency": 280, "avg_salary": 105000, "demand_score": 72},
    {"name": "Tableau", "category": "DATA", "frequency": 350, "avg_salary": 85000, "demand_score": 70},
    {"name": "Power BI", "category": "DATA", "frequency": 380, "avg_salary": 82000, "demand_score": 72},
    {"name": "SQL", "category": "DATA", "frequency": 720, "avg_salary": 80000, "demand_score": 85},
    {"name": "dbt", "category": "DATA", "frequency": 180, "avg_salary": 100000, "demand_score": 64},
    {"name": "Snowflake", "category": "DATA", "frequency": 300, "avg_salary": 110000, "demand_score": 76},
    {"name": "BigQuery", "category": "DATA", "frequency": 250, "avg_salary": 105000, "demand_score": 70},

    # Cybersecurity
    {"name": "Cybersecurity", "category": "CYBERSECURITY", "frequency": 480, "avg_salary": 105000, "demand_score": 88},
    {"name": "Penetration Testing", "category": "CYBERSECURITY", "frequency": 280, "avg_salary": 100000, "demand_score": 74},
    {"name": "Ethical Hacking", "category": "CYBERSECURITY", "frequency": 250, "avg_salary": 105000, "demand_score": 72},
    {"name": "Security", "category": "CYBERSECURITY", "frequency": 420, "avg_salary": 100000, "demand_score": 82},
    {"name": "Network Security", "category": "CYBERSECURITY", "frequency": 320, "avg_salary": 95000, "demand_score": 72},
    {"name": "Cloud Security", "category": "CYBERSECURITY", "frequency": 350, "avg_salary": 110000, "demand_score": 80},
    {"name": "SIEM", "category": "CYBERSECURITY", "frequency": 200, "avg_salary": 95000, "demand_score": 65},
    {"name": "ISO 27001", "category": "CYBERSECURITY", "frequency": 180, "avg_salary": 90000, "demand_score": 60},

    # Soft Skills & Others
    {"name": "Agile", "category": "SOFT_SKILLS", "frequency": 450, "avg_salary": 85000, "demand_score": 72},
    {"name": "Scrum", "category": "SOFT_SKILLS", "frequency": 400, "avg_salary": 85000, "demand_score": 68},
    {"name": "Project Management", "category": "SOFT_SKILLS", "frequency": 500, "avg_salary": 90000, "demand_score": 72},
    {"name": "Git", "category": "SOFT_SKILLS", "frequency": 680, "avg_salary": 80000, "demand_score": 78},
    {"name": "Linux", "category": "SOFT_SKILLS", "frequency": 520, "avg_salary": 85000, "demand_score": 72},
    {"name": "Docker Compose", "category": "SOFT_SKILLS", "frequency": 300, "avg_salary": 95000, "demand_score": 66},
    {"name": "Makefile", "category": "SOFT_SKILLS", "frequency": 180, "avg_salary": 85000, "demand_score": 50},
    {"name": "Bash", "category": "SOFT_SKILLS", "frequency": 420, "avg_salary": 80000, "demand_score": 68},
    {"name": "REST", "category": "SOFT_SKILLS", "frequency": 350, "avg_salary": 80000, "demand_score": 65},
    {"name": "API Design", "category": "SOFT_SKILLS", "frequency": 280, "avg_salary": 90000, "demand_score": 68},
]


def main():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)

    supabase: Client = create_client(url, key)

    # Check existing count
    existing = supabase.table("skills").select("id", count="exact").execute()
    print(f"Existing skills in DB: {existing.count}")

    inserted = 0
    skipped = 0

    for skill in SKILLS:
        normalized = skill["name"].lower().replace(" ", "_").replace(".", "").replace("#", "sharp").replace("+", "plus").replace("/", "_")
        
        # Check if skill already exists
        check = supabase.table("skills").select("id").ilike("name", skill["name"]).execute()
        
        if check.data and len(check.data) > 0:
            skipped += 1
            continue

        supabase.table("skills").insert({
            "name": skill["name"],
            "normalized_name": normalized,
            "category": skill["category"],
            "frequency": skill["frequency"],
            "avg_salary": skill["avg_salary"],
            "demand_score": skill["demand_score"],
        }).execute()
        inserted += 1

    print(f"Inserted: {inserted}, Skipped (already exist): {skipped}")


if __name__ == "__main__":
    main()
