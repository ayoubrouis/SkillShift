"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Users, Sparkles, BookOpen, Shield, Search, Trash2, ChevronDown, Eye, Save, ArrowLeft, Plus, X } from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts"

interface SystemStats {
  totalUsers: number; totalSkills: number; totalJobSeekers: number; totalRoadmaps: number;
}

interface AdminUser { id: string; full_name: string; email: string; role: string; created_at: string; }
interface AdminSkill { id: string; name: string; category: string; demand_score: number; }
interface AdminRoadmap { template_id: string; skill_name: string; skill_id: string; checkpoints: number; created_at: string; }
interface CheckpointDetail {
  id: string; template_id: string; step_index: number;
  title: string; description: string; content: string; is_final: boolean;
}
interface QuizDetail {
  id: string; checkpoint_id: string; question: string; options: string[]; answer: number;
}

const ROLE_COLORS: Record<string, string> = { ADMIN: '#ef4444', JOB_SEEKER: '#3b82f6', RECRUITER: '#22c55e' }
const CATEGORY_COLORS = ['#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#f97316']

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SystemStats>({ totalUsers: 0, totalSkills: 0, totalJobSeekers: 0, totalRoadmaps: 0 })
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'skills' | 'roadmaps'>('overview')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [skills, setSkills] = useState<AdminSkill[]>([])
  const [skillSearch, setSkillSearch] = useState('')
  const [roadmaps, setRoadmaps] = useState<AdminRoadmap[]>([])
  const [rmSearch, setRmSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const [selectedRd, setSelectedRd] = useState<string | null>(null)
  const [rdSkillName, setRdSkillName] = useState('')
  const [checkpoints, setCheckpoints] = useState<CheckpointDetail[]>([])
  const [quizzes, setQuizzes] = useState<QuizDetail[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState('')

  const [roleData, setRoleData] = useState<{ name: string; value: number }[]>([])
  const [categoryData, setCategoryData] = useState<{ name: string; count: number }[]>([])
  const [userTimeline, setUserTimeline] = useState<{ date: string; count: number }[]>([])
  const [roadmapTimeline, setRoadmapTimeline] = useState<{ date: string; count: number }[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (userData?.role !== 'ADMIN') { router.push("/"); return }

      const [uRes, sRes, jsRes, allUsers, allSkills, allRoadmaps] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('skills').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'JOB_SEEKER'),
        supabase.from('users').select('role, created_at'),
        supabase.from('skills').select('category'),
        supabase.from('roadmap_templates').select('created_at'),
      ])
      const { count: roadmapsCount } = await supabase.from('roadmap_templates').select('id', { count: 'exact', head: true })

      setStats({
        totalUsers: uRes.count || 0,
        totalSkills: sRes.count || 0,
        totalJobSeekers: jsRes.count || 0,
        totalRoadmaps: roadmapsCount || 0,
      })

      if (allUsers.data) {
        const roles: Record<string, number> = {}
        const dayCount: Record<string, number> = {}
        for (const u of allUsers.data) {
          roles[u.role] = (roles[u.role] || 0) + 1
          const d = new Date(u.created_at).toISOString().slice(0, 10)
          dayCount[d] = (dayCount[d] || 0) + 1
        }
        setRoleData(Object.entries(roles).map(([name, value]) => ({ name, value })))
        setUserTimeline(Object.entries(dayCount).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })))
      }

      if (allSkills.data) {
        const cats: Record<string, number> = {}
        for (const s of allSkills.data) {
          cats[s.category] = (cats[s.category] || 0) + 1
        }
        setCategoryData(Object.entries(cats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count))
      }

      if (allRoadmaps.data) {
        const dayCount: Record<string, number> = {}
        for (const r of allRoadmaps.data) {
          const d = new Date(r.created_at).toISOString().slice(0, 10)
          dayCount[d] = (dayCount[d] || 0) + 1
        }
        setRoadmapTimeline(Object.entries(dayCount).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })))
      }

      setLoading(false)
    }
    init()
  }, [router])

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from('users').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(100)
    if (data) setUsers(data)
  }, [])

  const loadSkills = useCallback(async () => {
    const { data } = await supabase.from('skills').select('id, name, category, demand_score').order('name')
    if (data) setSkills(data)
  }, [])

  const loadRoadmaps = useCallback(async () => {
    const { data: rms } = await supabase.from('roadmap_templates').select('id, skill_id, created_at').order('created_at', { ascending: false }).limit(100)
    if (!rms) return
    const { data: allSkills } = await supabase.from('skills').select('id, name')
    const skillMap = new Map((allSkills || []).map(s => [s.id, s.name]))
    const { data: allCps } = await supabase.from('roadmap_checkpoints').select('template_id')
    const cpCount = new Map<string, number>()
    for (const cp of allCps || []) cpCount.set(cp.template_id, (cpCount.get(cp.template_id) || 0) + 1)
    setRoadmaps(rms.map((r: any) => ({
      template_id: r.id, skill_name: skillMap.get(r.skill_id) || '(unknown)',
      skill_id: r.skill_id, checkpoints: cpCount.get(r.id) || 0, created_at: r.created_at,
    })))
  }, [])

  useEffect(() => {
    if (activeTab === 'users') loadUsers()
    else if (activeTab === 'skills') loadSkills()
    else if (activeTab === 'roadmaps') loadRoadmaps()
  }, [activeTab, loadUsers, loadSkills, loadRoadmaps])

  const changeUserRole = async (userId: string, newRole: string) => {
    await supabase.from('users').update({ role: newRole }).eq('id', userId)
    loadUsers()
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user and all their data?')) return
    setDeleting(userId)
    await supabase.from('users').delete().eq('id', userId)
    setDeleting(null)
    loadUsers()
  }

  const deleteRoute = async (templateId: string) => {
    if (!confirm('Delete this roadmap?')) return
    await supabase.from('checkpoint_quizzes').delete().in('checkpoint_id',
      (await supabase.from('roadmap_checkpoints').select('id').eq('template_id', templateId)).data?.map(c => c.id) || [])
    await supabase.from('roadmap_checkpoints').delete().eq('template_id', templateId)
    await supabase.from('roadmap_templates').delete().eq('id', templateId)
    loadRoadmaps()
  }

  const viewRoadmap = async (templateId: string, skillName: string) => {
    setSelectedRd(templateId)
    setRdSkillName(skillName)
    const { data: cps } = await supabase.from('roadmap_checkpoints').select('*').eq('template_id', templateId).order('step_index')
    if (cps) {
      setCheckpoints(cps)
      const cpIds = cps.map(c => c.id)
      const { data: qs } = await supabase.from('checkpoint_quizzes').select('*').in('checkpoint_id', cpIds)
      const parseOpts = (v: any): string[] => {
        if (Array.isArray(v)) return v
        if (typeof v === 'string') {
          try { return JSON.parse(v) } catch {}
          if (v.startsWith('{')) return v.slice(1, -1).split(',').map(s => s.trim())
          return []
        }
        return []
      }
      const quizMap = new Map((qs || []).map(q => [q.checkpoint_id, { ...q, options: parseOpts(q.options) }]))
      setQuizzes(cpIds.map(id => quizMap.get(id)).filter(Boolean) as QuizDetail[])
    }
  }

  const updateCp = (idx: number, field: string, value: string) => {
    setCheckpoints(prev => prev.map((cp, i) => i === idx ? { ...cp, [field]: value } : cp))
  }

  const updateQuiz = (idx: number, field: string, value: any) => {
    setQuizzes(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
  }

  const saveCheckpoint = async (cp: CheckpointDetail, quiz: QuizDetail) => {
    setSaving(cp.id); setSaveMsg('')
    try {
      await supabase.from('roadmap_checkpoints').update({
        title: cp.title, description: cp.description, content: cp.content,
      }).eq('id', cp.id)
      if (quiz) {
        await supabase.from('checkpoint_quizzes').update({
          question: quiz.question, options: JSON.stringify(quiz.options), answer: quiz.answer,
        }).eq('id', quiz.id)
      }
      setSaveMsg('Saved')
    } catch { setSaveMsg('Error saving') }
    finally { setSaving(null) }
  }

  const backToRoadmaps = () => { setSelectedRd(null); setCheckpoints([]); setQuizzes([]); setSaveMsg('') }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  const filteredSkills = skills.filter(s =>
    s.name?.toLowerCase().includes(skillSearch.toLowerCase()))
  const filteredRoadmaps = roadmaps.filter(r =>
    r.skill_name?.toLowerCase().includes(rmSearch.toLowerCase()))

  const tooltipStyle = { contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }, labelStyle: { color: '#94a3b8' } }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'skills', label: 'Skills', icon: BookOpen },
    { id: 'roadmaps', label: 'Roadmaps', icon: ChevronDown },
  ] as const

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-red-400" />
            <h1 className="text-xl font-bold text-white">Admin</h1>
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
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Users</p>
                <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Job Seekers</p>
                <p className="text-3xl font-bold text-blue-400">{stats.totalJobSeekers}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Skills Catalog</p>
                <p className="text-3xl font-bold text-green-400">{stats.totalSkills}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Roadmaps Generated</p>
                <p className="text-3xl font-bold text-purple-400">{stats.totalRoadmaps}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-4">Users by Role</h3>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                        label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                        {roleData.map((e, i) => (
                          <Cell key={i} fill={ROLE_COLORS[e.name] || '#64748b'} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-4">Skills by Category</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 100, right: 20 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {categoryData.map((e, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-4">User Registrations</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={userTimeline}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-white text-sm font-semibold mb-4">Roadmaps Generated</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={roadmapTimeline}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500" />
            </div>
            <div className="space-y-2">
              {filteredUsers.map(u => (
                <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{u.full_name}</p>
                    <p className="text-slate-400 text-xs truncate">{u.email}</p>
                    <p className="text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select value={u.role} onChange={e => changeUserRole(u.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
                      <option value="JOB_SEEKER">Job Seeker</option>
                      <option value="RECRUITER">Recruiter</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button onClick={() => deleteUser(u.id)} disabled={deleting === u.id}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No users found</p>}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
                placeholder="Search skills..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredSkills.map(s => (
                <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{s.name}</p>
                    <p className="text-slate-500 text-xs">{s.category}</p>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{s.demand_score?.toFixed(1)}</span>
                </div>
              ))}
              {filteredSkills.length === 0 && <p className="text-slate-500 text-sm text-center py-8 col-span-full">No skills found</p>}
            </div>
          </div>
        )}

        {activeTab === 'roadmaps' && (
          <div>
            {selectedRd ? (
              <div>
                <button onClick={backToRoadmaps}
                  className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to roadmaps
                </button>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">{rdSkillName}</h2>
                  {saveMsg && <span className="text-xs text-green-400">{saveMsg}</span>}
                </div>
                <div className="space-y-4">
                  {checkpoints.map((cp, i) => {
                    const quiz = quizzes[i]
                    return (
                      <div key={cp.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            Step {cp.step_index + 1}{cp.is_final ? ' — Final' : ''}
                          </span>
                          <button onClick={() => saveCheckpoint(cp, quiz)} disabled={saving === cp.id}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50">
                            <Save className="h-3.5 w-3.5" /> {saving === cp.id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                        <input value={cp.title} onChange={e => updateCp(i, 'title', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mb-2" />
                        <textarea value={cp.description} onChange={e => updateCp(i, 'description', e.target.value)}
                          rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mb-2 resize-none" />
                        <textarea value={cp.content} onChange={e => updateCp(i, 'content', e.target.value)}
                          rows={4} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm mb-3 resize-none font-mono" />
                        {quiz && (
                          <div className="border-t border-slate-800 pt-3 mt-3">
                            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Quiz</p>
                            <input value={quiz.question} onChange={e => updateQuiz(i, 'question', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mb-2" />
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {quiz.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <input type="radio" name={`q-${quiz.id}`} checked={quiz.answer === oi}
                                    onChange={() => updateQuiz(i, 'answer', oi)} className="accent-blue-500" />
                                  <input value={opt} onChange={e => {
                                    const newOpts = [...quiz.options]
                                    newOpts[oi] = e.target.value
                                    updateQuiz(i, 'options', newOpts)
                                  }} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input value={rmSearch} onChange={e => setRmSearch(e.target.value)}
                    placeholder="Search roadmaps by skill name..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500" />
                </div>
                <div className="space-y-2">
                  {filteredRoadmaps.map(r => (
                    <div key={r.template_id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium">{r.skill_name}</p>
                        <p className="text-slate-400 text-xs">{r.checkpoints} checkpoints — {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => viewRoadmap(r.template_id, r.skill_name)}
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteRoute(r.template_id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredRoadmaps.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No roadmaps generated yet</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
