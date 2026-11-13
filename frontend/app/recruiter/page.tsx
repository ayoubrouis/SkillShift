"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Users, Briefcase, Search, Send, Plus, Star, CheckCircle, X, Loader2, ChevronRight, Eye } from "lucide-react"

interface Candidate {
  id: string; full_name: string; email: string; skills: { name: string; proficiency: string }[]; skill_count: number;
}

interface JobPost {
  id: string; title: string; company_name: string; description: string; extracted_skills: string[]; created_at: string;
}

interface MatchResult {
  candidate_id: string; full_name: string; email: string; matched_skills: string[];
  matched_count: number; total_required: number; score: number;
}

export default function RecruiterDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id?: string; email?: string; full_name?: string } | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'candidates' | 'jobs' | 'newjob'>('candidates')

  // Candidates
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [candSearch, setCandSearch] = useState('')
  const [candLoading, setCandLoading] = useState(false)

  // Jobs
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)

  // New Job Form
  const [jobTitle, setJobTitle] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

  // Match
  const [matching, setMatching] = useState<string | null>(null)
  const [matchResults, setMatchResults] = useState<{ [jobId: string]: MatchResult[] }>({})
  const [requiredSkills, setRequiredSkills] = useState<{ [jobId: string]: string[] }>({})

  // Notify
  const [notifying, setNotifying] = useState<string | null>(null)
  const [notifyMsg, setNotifyMsg] = useState<{ [cid: string]: string }>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push("/login"); return }

      const { data: userData } = await supabase.from('users').select('role').eq('id', authUser.id).single()
      if (userData?.role !== "RECRUITER") {
        router.push("/" + (userData?.role?.toLowerCase() || ''))
        return
      }

      const session = await supabase.auth.getSession()
      setAccessToken(session.data.session?.access_token || null)
      setUser({ id: authUser.id, ...authUser.user_metadata })
      setLoading(false)
    }
    init()
  }, [router])

  const loadCandidates = useCallback(async () => {
    if (!accessToken) return
    setCandLoading(true)
    try {
      const url = `/api/recruiter/candidates?access_token=${encodeURIComponent(accessToken)}${candSearch ? `&search=${encodeURIComponent(candSearch)}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.candidates) setCandidates(data.candidates)
    } catch (e) { console.error(e) }
    setCandLoading(false)
  }, [accessToken, candSearch])

  const loadJobs = useCallback(async () => {
    if (!accessToken) return
    setJobsLoading(true)
    try {
      const res = await fetch(`/api/recruiter/jobs?access_token=${encodeURIComponent(accessToken)}`)
      const data = await res.json()
      if (data.jobs) setJobs(data.jobs)
    } catch (e) { console.error(e) }
    setJobsLoading(false)
  }, [accessToken])

  useEffect(() => {
    if (activeTab === 'candidates') loadCandidates()
    else if (activeTab === 'jobs') { loadJobs(); setMatchResults({}); setRequiredSkills({}) }
  }, [activeTab, loadCandidates, loadJobs])

  const postJob = async () => {
    if (!jobTitle.trim() || !jobDesc.trim() || !accessToken) return
    setPosting(true)
    setPostError('')
    try {
      const res = await fetch('/api/recruiter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: jobTitle, description: jobDesc, access_token: accessToken }),
      })
      const data = await res.json()
      if (!res.ok) { setPostError(data.error || 'Failed to post'); return }
      setJobTitle(''); setJobDesc('')
      setActiveTab('jobs')
      loadJobs()
    } catch (e: any) { setPostError(e.message) }
    setPosting(false)
  }

  const runMatch = async (jobId: string) => {
    if (!accessToken) return
    setMatching(jobId)
    try {
      const res = await fetch('/api/recruiter/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, access_token: accessToken }),
      })
      const data = await res.json()
      if (data.matches) {
        setMatchResults(prev => ({ ...prev, [jobId]: data.matches }))
        setRequiredSkills(prev => ({ ...prev, [jobId]: data.required_skills || [] }))
      }
    } catch (e) { console.error(e) }
    setMatching(null)
  }

  const deleteJob = async (jobId: string) => {
    if (!accessToken || !confirm('Delete this job posting?')) return
    setDeleting(jobId)
    try {
      const res = await fetch(`/api/recruiter/jobs?id=${jobId}&access_token=${encodeURIComponent(accessToken)}`, { method: 'DELETE' })
      if (res.ok) {
        setJobs(prev => prev.filter(j => j.id !== jobId))
        setMatchResults(prev => { const r = { ...prev }; delete r[jobId]; return r })
        setRequiredSkills(prev => { const r = { ...prev }; delete r[jobId]; return r })
      }
    } catch (e) { console.error(e) }
    setDeleting(null)
  }

  const notifyCandidate = async (candidateId: string, jobId?: string) => {
    if (!accessToken) return
    setNotifying(candidateId)
    const msg = notifyMsg[candidateId] || ''
    try {
      await fetch('/api/recruiter/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, job_id: jobId, message: msg, access_token: accessToken }),
      })
      setNotifyMsg(prev => ({ ...prev, [candidateId]: '' }))
    } catch (e) { console.error(e) }
    setNotifying(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  const tabs = [
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'jobs', label: 'My Jobs', icon: Briefcase },
  ] as const

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Recruiter Dashboard</h1>
            <p className="text-slate-400 text-sm">Welcome, {user?.full_name || 'Recruiter'}</p>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
            className="text-sm text-slate-400 hover:text-white transition-colors">Sign Out</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-xl p-1">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}>
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            )
          })}
          <button onClick={() => setActiveTab('newjob')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ml-auto ${
              activeTab === 'newjob' ? 'bg-green-600 text-white' : 'text-green-400 hover:text-white hover:bg-green-600/20'
            }`}>
            <Plus className="h-4 w-4" /> Post New Job
          </button>
        </div>

        {/* Candidates Tab */}
        {activeTab === 'candidates' && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input value={candSearch} onChange={e => setCandSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadCandidates()}
                placeholder="Search candidates by skill or name..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500" />
            </div>

            {candLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-400 animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {candidates.map(c => (
                  <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-medium">{c.full_name}</p>
                        <p className="text-slate-400 text-xs">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`/universe?viewUserId=${c.id}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg transition-colors">
                          <Eye className="h-3.5 w-3.5" /> Universe
                        </a>
                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
                          {c.skill_count} skills
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.skills.map(s => (
                        <span key={s.name} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {candidates.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-12">No candidates found. Try a different search.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            {jobsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-400 animate-spin" /></div>
            ) : jobs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No job postings yet. Click "Post New Job" to create one.</p>
            ) : jobs.map(j => {
              const results = matchResults[j.id] || []
              const skills = requiredSkills[j.id] || []
              return (
                <div key={j.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold">{j.title}</h3>
                        <p className="text-slate-400 text-xs">{j.company_name} — {new Date(j.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => deleteJob(j.id)} disabled={deleting === j.id}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 disabled:opacity-50 text-red-400 text-sm rounded-lg transition-colors">
                          {deleting === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          Delete
                        </button>
                        <button onClick={() => runMatch(j.id)} disabled={matching === j.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors">
                          {matching === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                          Match Candidates
                        </button>
                      </div>
                    </div>

                  {/* Extracted skills */}
                  {j.extracted_skills && Array.isArray(j.extracted_skills) && j.extracted_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {j.extracted_skills.map((s: string) => (
                        <span key={s} className="text-xs bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Match Results */}
                  {results.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <p className="text-sm text-slate-400 mb-3">
                        Required skills: {skills.join(', ')}
                      </p>
                      <div className="space-y-2">
                        {results.map(m => (
                          <div key={m.candidate_id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-white text-sm font-medium">{m.full_name}</p>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  m.score >= 80 ? 'text-green-400 bg-green-500/10' :
                                  m.score >= 50 ? 'text-yellow-400 bg-yellow-500/10' :
                                  'text-red-400 bg-red-500/10'
                                }`}>
                                  {m.score}% match
                                </span>
                              </div>
                              <p className="text-slate-400 text-xs mt-0.5">
                                Matched: {m.matched_skills.join(', ')} ({m.matched_count}/{m.total_required})
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <input value={notifyMsg[m.candidate_id] || ''}
                                onChange={e => setNotifyMsg(prev => ({ ...prev, [m.candidate_id]: e.target.value }))}
                                placeholder="Optional message..."
                                className="w-40 bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500" />
                              <button onClick={() => notifyCandidate(m.candidate_id, j.id)}
                                disabled={notifying === m.candidate_id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white text-xs rounded-lg transition-colors">
                                {notifying === m.candidate_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                Notify
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* New Job Tab */}
        {activeTab === 'newjob' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-1">Post a New Job</h2>
              <p className="text-slate-400 text-sm mb-6">Enter the job details below. AI will extract relevant skills from the description.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Job Title</label>
                  <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Python Developer"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">Job Description</label>
                  <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                    placeholder="Paste the full job description here. Include required skills, responsibilities, and qualifications..."
                    rows={8}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-slate-500 resize-y" />
                </div>

                {postError && <p className="text-red-400 text-sm">{postError}</p>}

                <div className="flex gap-3">
                  <button onClick={postJob} disabled={posting || !jobTitle.trim() || !jobDesc.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium">
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {posting ? 'Posting & Extracting Skills...' : 'Post Job'}
                  </button>
                  <button onClick={() => setActiveTab('jobs')}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <p className="text-slate-400 text-xs">
                <strong className="text-slate-300">How it works:</strong> When you post a job, the description is analyzed by AI which extracts relevant skill keywords. These skills are then matched against job seeker profiles to find the best candidates.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
