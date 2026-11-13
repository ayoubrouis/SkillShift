"use client"
import { useState, FormEvent } from "react"
import { login } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, Shield } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [isAdminLogin, setIsAdminLogin] = useState(false)

    async function handleLogin(e: FormEvent){
        e.preventDefault();
        setLoading(true);
        setError("");
        try{
            const { user } = await login(email, password)
            const { data } = await supabase
                .from("users").select("role, tutorial_completed")
                .eq("id", user?.id ?? "").single()
            
            if (isAdminLogin) {
                // Admin login - check role
                if (data?.role !== "ADMIN") {
                    setError("Invalid admin credentials")
                    setLoading(false)
                    return
                }
                router.push("/dashboard")
            } else {
                // Normal user login
                if (data && data.role === "JOB_SEEKER" && !data.tutorial_completed)
                    router.push("/onboarding")
                else if (data && data.role === "JOB_SEEKER")
                    router.push("/universe")
                else if (data && data.role === "RECRUITER")
                    router.push("/recruiter")
                else if (data && data.role === "ADMIN")
                    router.push("/dashboard")
            }
        } catch (err: unknown){
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)]">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {isAdminLogin ? "Admin Login" : "Welcome Back"}
                    </h1>
                    <p className="text-slate-400">
                        {isAdminLogin ? "Enter admin credentials" : "Sign in to continue your career journey"}
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 pl-10 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 pl-10 pr-10 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="text-right -mt-4">
                            <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-blue-400 transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Signing in...
                                </>
                            ) : (
                                <span className="flex items-center">
                                    {isAdminLogin && <Shield className="h-4 w-4 mr-2" />}
                                    {isAdminLogin ? "Sign In as Admin" : "Sign In"}
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Admin Login Toggle */}
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAdminLogin(!isAdminLogin)
                                setError("")
                            }}
                            className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
                        >
                            {isAdminLogin ? "Back to regular login" : "Admin login →"}
                        </button>
                    </div>

                    {/* Sign Up Link - only for regular users */}
                    {!isAdminLogin && (
                        <div className="mt-6 text-center">
                            <p className="text-slate-400">
                                Don't have an account?{' '}
                                <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500">
                        By signing in, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    )
}
