"use client"
import { useState, FormEvent } from "react"
import { register } from "@/lib/auth"
import { UserRole } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, Loader2, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        email: "", password: "", fullName: "", role: "JOB_SEEKER"
    })
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [passwordStrength, setPasswordStrength] = useState(0)

    const calculatePasswordStrength = (password: string) => {
        let strength = 0
        if (password.length >= 8) strength++
        if (/[A-Z]/.test(password)) strength++
        if (/[a-z]/.test(password)) strength++
        if (/[0-9]/.test(password)) strength++
        if (/[^A-Za-z0-9]/.test(password)) strength++
        return strength
    }

    const handlePasswordChange = (password: string) => {
        setForm({...form, password})
        setPasswordStrength(calculatePasswordStrength(password))
    }

    async function handleSubmit(e: FormEvent){
        e.preventDefault();
        setLoading(true);
        setError("");
        try{
            await register(form.email, form.password, form.fullName, form.role as UserRole)
            router.push("/onboarding")
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    }

    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 2) return "bg-red-500"
        if (passwordStrength <= 3) return "bg-yellow-500"
        return "bg-green-500"
    }

    const getPasswordStrengthText = () => {
        if (passwordStrength <= 2) return "Weak"
        if (passwordStrength <= 3) return "Medium"
        return "Strong"
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)]">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Join SkillShift</h1>
                    <p className="text-slate-400">Create your account to start your career journey</p>
                </div>

                {/* Registration Form */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Full Name Field */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Enter your full name"
                                    className="w-full px-4 py-3 pl-10 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                    value={form.fullName}
                                    onChange={e => setForm({...form, fullName: e.target.value})}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 pl-10 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                    value={form.email}
                                    onChange={e => setForm({...form, email: e.target.value})}
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
                                    placeholder="Create a password"
                                    className="w-full px-4 py-3 pl-10 pr-10 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                    value={form.password}
                                    onChange={e => handlePasswordChange(e.target.value)}
                                    required
                                    minLength={6}
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
                            {/* Password Strength Indicator */}
                            {form.password && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-400">Password strength</span>
                                        <span className={`text-xs font-medium ${
                                            passwordStrength <= 2 ? 'text-red-400' :
                                            passwordStrength <= 3 ? 'text-yellow-400' : 'text-green-400'
                                        }`}>
                                            {getPasswordStrengthText()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setForm({...form, role: "JOB_SEEKER"})}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        form.role === "JOB_SEEKER"
                                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                                            : "border-slate-600 hover:border-slate-500 text-slate-400 hover:text-slate-300"
                                    }`}
                                    disabled={loading}
                                >
                                    <User className="h-6 w-6 mx-auto mb-2" />
                                    <div className="text-sm font-medium">Job Seeker</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({...form, role: "RECRUITER"})}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        form.role === "RECRUITER"
                                            ? "border-purple-500 bg-purple-500/10 text-purple-400"
                                            : "border-slate-600 hover:border-slate-500 text-slate-400 hover:text-slate-300"
                                    }`}
                                    disabled={loading}
                                >
                                    <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                                    <div className="text-sm font-medium">Recruiter</div>
                                </button>
                            </div>
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
                            disabled={loading || !form.email || !form.password || !form.fullName}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Sign In Link */}
                    <div className="mt-6 text-center">
                        <p className="text-slate-400">
                            Already have an account?{' '}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500">
                        By creating an account, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    )
}
