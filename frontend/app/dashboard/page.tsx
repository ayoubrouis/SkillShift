"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getTopMarketSkills, getJobListingsWithSkills } from "@/lib/careerPath"
import Link from "next/link"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

const ROLE_COLORS: Record<string, string> = { ADMIN: '#ef4444', JOB_SEEKER: '#3b82f6', RECRUITER: '#22c55e' }
const CATEGORY_COLORS = ['#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#f97316']

export default function DashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [topSkills, setTopSkills] = useState<any[]>([])
    const [recentJobs, setRecentJobs] = useState<any[]>([])
    const [stats, setStats] = useState({ totalUsers: 0, activeResumes: 0, totalSkills: 0 })
    const [roleData, setRoleData] = useState<{ name: string; value: number }[]>([])
    const [categoryData, setCategoryData] = useState<{ name: string; count: number }[]>([])

    useEffect(() => {
        async function loadDashboard() {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) { router.push("/login"); return }

            const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
            if (userData && userData.role !== "ADMIN") {
                router.push("/" + userData.role?.toLowerCase())
                return
            }

            const [uRes, sRes, rRes, allUsers, allSkills] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('skills').select('id', { count: 'exact', head: true }),
                supabase.from('resumes').select('id', { count: 'exact', head: true }),
                supabase.from('users').select('role'),
                supabase.from('skills').select('category'),
            ])
            setStats({
                totalUsers: uRes.count || 0,
                totalSkills: sRes.count || 0,
                activeResumes: rRes.count || 0,
            })

            if (allUsers.data) {
                const roles: Record<string, number> = {}
                for (const u of allUsers.data) roles[u.role] = (roles[u.role] || 0) + 1
                setRoleData(Object.entries(roles).map(([name, value]) => ({ name, value })))
            }
            if (allSkills.data) {
                const cats: Record<string, number> = {}
                for (const s of allSkills.data) cats[s.category] = (cats[s.category] || 0) + 1
                setCategoryData(Object.entries(cats).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count))
            }

            setTopSkills(await getTopMarketSkills(5))
            setRecentJobs(await getJobListingsWithSkills(5))
            setLoading(false)
        }
        loadDashboard()
    }, [router])

    const tooltipStyle = { contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }, labelStyle: { color: '#94a3b8' } }

    if (loading) return (
        <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)] px-4 py-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-slate-400">SkillShift platform overview</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { label: 'Total Users', value: stats.totalUsers, color: 'text-white' },
                        { label: 'Skills Catalog', value: stats.totalSkills, color: 'text-green-400' },
                        { label: 'Active Resumes', value: stats.activeResumes, color: 'text-blue-400' },
                    ].map(c => (
                        <div key={c.label} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                            <h3 className="text-slate-400 text-sm font-medium mb-2">{c.label}</h3>
                            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                        <h3 className="text-white text-sm font-semibold mb-4">Users by Role</h3>
                        <div className="flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                                        dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                                        {roleData.map((e, i) => (
                                            <Cell key={i} fill={ROLE_COLORS[e.name] || '#64748b'} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip {...tooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                        <h3 className="text-white text-sm font-semibold mb-4">Skills by Category</h3>
                        <ResponsiveContainer width="100%" height={220}>
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
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                        <h2 className="text-xl font-semibold text-white mb-4">Top Market Skills</h2>
                        {topSkills.length > 0 ? (
                            <ul className="space-y-2">
                                {topSkills.map((s: any) => (
                                    <li key={s.id} className="flex justify-between text-sm">
                                        <span className="text-slate-300">{s.name}</span>
                                        <span className="text-slate-500">{s.demand_score?.toFixed(1)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-500 text-sm">No skills data</p>}
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                        <h2 className="text-xl font-semibold text-white mb-4">Recent Job Listings</h2>
                        {recentJobs.length > 0 ? (
                            <ul className="space-y-2">
                                {recentJobs.map((j: any) => (
                                    <li key={j.id} className="text-sm text-slate-300">{j.title}</li>
                                ))}
                            </ul>
                        ) : <p className="text-slate-500 text-sm">No jobs listed</p>}
                    </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                    <div className="flex gap-4">
                        <Link href="/admin"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                            Full Admin Panel
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
