"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Eye, Plus, X, CheckCircle, Loader2 } from "lucide-react"

interface ResumeSkill {
    id: string
    name: string
    category: string
    demand_score?: number
    avg_salary?: number
    frequency?: number
    proficiency?: string
}

const categoryOptions = [
    'Programming',
    'ML',
    'Cloud',
    'DevOps',
    'Data',
    'Cybersecurity',
    'Soft Skills'
]

export default function SkillsReviewPage() {
    const router = useRouter()
    const [userId, setUserId] = useState<string>("")
    const [resumeId, setResumeId] = useState<string>("")
    const [skills, setSkills] = useState<ResumeSkill[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [newSkillName, setNewSkillName] = useState("")
    const [newSkillCategory, setNewSkillCategory] = useState(categoryOptions[0])
    const [message, setMessage] = useState<string>("")

    useEffect(() => {
        async function loadSkills() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }
            setUserId(user.id)

            const urlParams = new URLSearchParams(window.location.search)
            const resumeIdParam = urlParams.get('resume_id')

            if (!resumeIdParam) {
                router.push("/upload-resume")
                return
            }

            setResumeId(resumeIdParam)

            const { data: resume, error: resumeError } = await supabase
                .from("resumes")
                .select("id, student_id")
                .eq("id", resumeIdParam)
                .eq("parsing_status", "DONE")
                .single()

            if (resumeError || !resume || resume.student_id !== user.id) {
                console.error("Resume fetch error or access denied:", resumeError)
                router.push("/upload-resume")
                return
            }

            const { data: resumeSkills, error: skillsError } = await supabase
                .from("resume_skills")
                .select("skill:skills(id, name, category, demand_score, avg_salary, frequency)")
                .eq("resume_id", resumeIdParam)

            if (skillsError) {
                console.error("Resume skill fetch error:", skillsError)
            }

            if (resumeSkills) {
                const mapped = resumeSkills
                    .map((r: any) => ({
                        id: r.skill?.id || `${r.skill?.name}-${Math.random()}`,
                        name: r.skill?.name || '',
                        category: r.skill?.category || 'Other',
                        demand_score: r.skill?.demand_score,
                        avg_salary: r.skill?.avg_salary,
                        frequency: r.skill?.frequency,
                        proficiency: 'Intermediate'
                    }))
                    .filter((skill) => skill.name)
                setSkills(mapped)
            }
            setLoading(false)
        }
        loadSkills()
    }, [router])

    function normalizeName(name: string) {
        return name.trim().toLowerCase()
    }

    function handleAddSkill() {
        const trimmed = newSkillName.trim()
        if (!trimmed) {
            setMessage('Enter a skill name before adding.')
            return
        }

        const exists = skills.some((skill) => normalizeName(skill.name) === normalizeName(trimmed))
        if (exists) {
            setMessage('This skill is already in your list.')
            return
        }

        setSkills([
            ...skills,
            {
                id: `new-${Date.now()}`,
                name: trimmed,
                category: newSkillCategory,
                proficiency: 'Intermediate'
            }
        ])
        setNewSkillName("")
        setNewSkillCategory(categoryOptions[0])
        setMessage('Added skill. Confirm to save changes.')
    }

    function handleRemoveSkill(skillId: string) {
        setSkills(skills.filter((s) => s.id !== skillId))
    }

    async function handleConfirm() {
        if (!resumeId) {
            setMessage('No resume found. Please upload your resume first.')
            return
        }

        setSaving(true)
        setMessage('Saving your skill selection...')

        try {
            const response = await fetch('/api/update-resume-skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resume_id: resumeId,
                    skills: skills.map((skill) => ({
                        name: skill.name,
                        category: skill.category || 'Other'
                    }))
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || 'Failed to save skills')
            }

            await supabase
                .from("users")
                .update({ tutorial_completed: true })
                .eq("id", userId)

            router.push("/universe")
        } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Unable to save skills')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)]">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-blue-400">Loading your skills...</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)] px-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Review Your Skills</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        These skills were extracted from your resume. Review, add, or remove skills before entering your skill universe.
                    </p>
                </div>

                {skills.length === 0 ? (
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-full mb-4">
                            <Eye className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No Skills Found</h3>
                        <p className="text-slate-400 mb-6">Upload a resume first to extract your skills.</p>
                        <button
                            onClick={() => router.push("/upload-resume")}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200"
                        >
                            Upload Resume
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Skills List */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                                <Eye className="h-5 w-5 mr-2 text-blue-400" />
                                Extracted Skills ({skills.length})
                            </h2>

                            <div className="grid gap-3">
                                {skills.map((skill) => (
                                    <div
                                        key={skill.id}
                                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                <span className="font-medium text-white">{skill.name}</span>
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    skill.category === 'Programming' ? 'bg-blue-500/20 text-blue-400' :
                                                    skill.category === 'ML' ? 'bg-purple-500/20 text-purple-400' :
                                                    skill.category === 'Cloud' ? 'bg-sky-500/20 text-sky-400' :
                                                    skill.category === 'DevOps' ? 'bg-orange-500/20 text-orange-400' :
                                                    skill.category === 'Data' ? 'bg-green-500/20 text-green-400' :
                                                    skill.category === 'Cybersecurity' ? 'bg-red-500/20 text-red-400' :
                                                    skill.category === 'Soft Skills' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                    {skill.category}
                                                </span>
                                            </div>
                                            {skill.demand_score && (
                                                <p className="text-sm text-slate-400 mt-1">
                                                    Demand: {Math.round(skill.demand_score * 100)}%
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveSkill(skill.id)}
                                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Remove skill"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add New Skill */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                                <Plus className="h-5 w-5 mr-2 text-green-400" />
                                Add New Skill
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-300">Skill Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., React, Python, AWS"
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                        value={newSkillName}
                                        onChange={e => setNewSkillName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-300">Category</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                        value={newSkillCategory}
                                        onChange={e => setNewSkillCategory(e.target.value)}
                                    >
                                        {categoryOptions.map(category => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleAddSkill}
                                disabled={!newSkillName.trim()}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="h-4 w-4 mr-2 inline" />
                                Add Skill
                            </button>
                        </div>

                        {/* Status Messages */}
                        {message && (
                            <div className={`p-4 rounded-lg border ${
                                message.includes('Added') || message.includes('Confirm')
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            }`}>
                                <p className="text-sm">{message}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleConfirm}
                                disabled={saving}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        Saving Skills...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        Confirm & Enter Universe
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => router.push("/upload-resume")}
                                className="bg-transparent hover:bg-slate-700 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-lg transition-all duration-200"
                            >
                                Re-upload Resume
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
