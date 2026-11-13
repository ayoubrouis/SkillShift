"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ArrowRight, Sparkles, TrendingUp, Users, Target, Zap, BarChart3, LogOut } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        if (data) {
          setUserRole(data.role)
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setUserRole("")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_50%,#1e293b_100%)] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  // If logged in, show role-specific dashboard link (don't auto-redirect)
  if (user) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_50%,#1e293b_100%)]">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Welcome back!</h1>
          <p className="text-slate-400 mb-8">You are logged in as: <span className="text-blue-400 font-medium">{userRole}</span></p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {userRole === "JOB_SEEKER" && (
              <Link
                href="/universe"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Go to Universe
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            {userRole === "RECRUITER" && (
              <Link
                href="/recruiter"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Go to Recruiter Dashboard
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            {userRole === "ADMIN" && (
              <Link
                href="/admin"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Go to Admin Panel
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-8 py-4 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Not logged in - show normal landing page
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_50%,#1e293b_100%)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4 mr-2" />
              AI-Powered Career Intelligence
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                SkillShift
              </span>
              <br />
              <span className="text-2xl sm:text-4xl lg:text-5xl text-slate-400 font-normal">
                2026
              </span>
            </h1>

            <p className="max-w-3xl mx-auto text-xl text-slate-400 mb-8 leading-relaxed">
              Navigate the future of work with AI-driven insights. Discover skill gaps,
              visualize career pathways, and get personalized learning recommendations
              powered by real-time market data.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/register"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center px-8 py-4 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Powerful Features for Modern Careers
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Everything you need to stay ahead in the rapidly evolving tech landscape
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl hover:bg-slate-800/70 transition-all duration-300 group">
              <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Skill Gap Analysis</h3>
              <p className="text-slate-400">
                Identify missing skills in your profile compared to high-demand roles in your target industry.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl hover:bg-slate-800/70 transition-all duration-300 group">
              <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">3D Skill Universe</h3>
              <p className="text-slate-400">
                Visualize your skills in an interactive 3D space and explore connections between technologies.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl hover:bg-slate-800/70 transition-all duration-300 group">
              <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition-colors">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Market Intelligence</h3>
              <p className="text-slate-400">
                Real-time data on salary trends, job demand, and emerging technologies across industries.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl hover:bg-slate-800/70 transition-all duration-300 group">
              <div className="h-12 w-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
                <Zap className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Learning Paths</h3>
              <p className="text-slate-400">
                Personalized learning recommendations powered by AI to help you acquire new skills efficiently.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl hover:bg-slate-800/70 transition-all duration-300 group">
              <div className="h-12 w-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-pink-500/30 transition-colors">
                <Users className="h-6 w-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Recruiter Tools</h3>
              <p className="text-slate-400">
                Advanced matching algorithms and candidate insights for recruiters and hiring managers.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl hover:bg-slate-800/70 transition-all duration-300 group">
              <div className="h-12 w-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                <BarChart3 className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Career Analytics</h3>
              <p className="text-slate-400">
                Comprehensive dashboards with career progression insights and industry benchmarking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Join thousands of professionals who are already navigating their career paths with SkillShift.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
