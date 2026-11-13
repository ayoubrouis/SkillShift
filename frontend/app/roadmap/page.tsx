"use client"
import { useEffect, useState, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase, Skill } from "@/lib/supabase"
import { ArrowLeft, CheckCircle, Circle, Lock, Star, ChevronRight, Trophy } from "lucide-react"
import Link from "next/link"

interface Checkpoint {
  id: string
  step_index: number
  title: string
  description: string
  content: string
  is_final: boolean
  quizzes: { id: string; question: string; options: string[] }[]
}

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  selected?: number
  submitted?: boolean
  correct?: boolean
}

function RoadmapContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const skillId = searchParams.get('skill_id') || ''
  const skillName = searchParams.get('skill') || ''

  const [skill, setSkill] = useState<Skill | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [passedSteps, setPassedSteps] = useState<string[]>([])
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [activeCp, setActiveCp] = useState<number>(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizPassed, setQuizPassed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserId(data.session.user.id)
        setAccessToken(data.session.access_token)
      }
    })
  }, [])

  useEffect(() => {
    async function load() {
      if (!skillId) { router.push('/universe'); return }
      if (!userId) return

      // Get skill info
        const { data: sk } = await supabase
          .from('skills')
          .select('*')
          .eq('id', skillId).single()
        if (sk) setSkill(sk)

      // Try to fetch roadmap
      let res = await fetch(`/api/roadmap?skill_id=${skillId}&user_id=${userId}`)
      let data = await res.json()

      // If no roadmap exists, generate one on-demand
      if (res.status === 404 && data.error === 'No roadmap found for this skill') {
        setGenerating(true)
        setGenError(null)
        const genRes = await fetch('/api/roadmap/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skill_id: skillId }),
        })
        const genData = await genRes.json()
        if (!genRes.ok) {
          setGenError(genData.error || 'Failed to generate roadmap')
          setGenerating(false)
          return
        }
        // Fetch again after generation
        res = await fetch(`/api/roadmap?skill_id=${skillId}&user_id=${userId}`)
        data = await res.json()
        setGenerating(false)
      }

      if (data.error) {
        setLoading(false)
        return
      }

      setCheckpoints(data.checkpoints || [])

      if (data.progress) {
        setCurrentStep(data.progress.current_step || 0)
        setPassedSteps(data.progress.passed_steps || [])
        setCompletedAt(data.progress.completed_at)
        if (data.progress.current_step > 0) {
          setActiveCp(Math.min(data.progress.current_step, (data.checkpoints?.length || 1) - 1))
        }
      }

      setLoading(false)
    }
    load()
  }, [skillId, userId, accessToken, router])

  const activeCheckpoint = checkpoints[activeCp] || null
  const totalSteps = checkpoints.length
  const progressPct = totalSteps > 0 ? Math.round((passedSteps.length / totalSteps) * 100) : 0
  const isUnlocked = (idx: number) => {
    if (completedAt) return true
    if (idx === 0) return true
    const prevCp = checkpoints[idx - 1]
    return prevCp ? passedSteps.includes(prevCp.id) : false
  }
  const isCompleted = (idx: number) => {
    const cp = checkpoints[idx]
    return cp ? passedSteps.includes(cp.id) : false
  }

  const startQuiz = useCallback(() => {
    if (!activeCheckpoint) return
    const questions = activeCheckpoint.quizzes.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
    }))
    setQuizQuestions(questions)
    setQuizPassed(false)
    setShowQuiz(true)
  }, [activeCheckpoint])

  const submitQuiz = useCallback(async () => {
    if (!activeCheckpoint || !userId || !skillId || !accessToken) return
    setSubmitting(true)

    const results = [...quizQuestions]
    let allCorrect = true

    for (let i = 0; i < results.length; i++) {
      const q = results[i]
      if (q.selected === undefined) {
        results[i] = { ...q, submitted: true, correct: false }
        allCorrect = false
        continue
      }
      try {
        const res = await fetch('/api/roadmap/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            skill_id: skillId,
            checkpoint_id: activeCheckpoint.id,
            quiz_id: q.id,
            selected_answer: q.selected,
            access_token: accessToken,
          }),
        })
        const data = await res.json()
        const isCorrect = data.correct === true
        results[i] = { ...q, submitted: true, correct: isCorrect }
        if (!isCorrect) allCorrect = false
      } catch {
        results[i] = { ...q, submitted: true, correct: false }
        allCorrect = false
      }
    }

    setQuizQuestions(results)
    setQuizPassed(allCorrect)
    if (allCorrect) {
      setPassedSteps(prev => [...prev, activeCheckpoint.id])
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
    setSubmitting(false)
  }, [activeCheckpoint, userId, skillId, quizQuestions, totalSteps, accessToken])

  const completeRoadmap = useCallback(async () => {
    if (!userId || !skillId || !accessToken) return
    const res = await fetch('/api/roadmap/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, skill_id: skillId, access_token: accessToken }),
    })
    const data = await res.json()
    if (data.success) {
      setCompletedAt(new Date().toISOString())
      setTimeout(() => router.push('/universe'), 1500)
    } else {
      alert(data.error || 'Failed to complete')
    }
  }, [userId, skillId, router, accessToken])

  function renderContent(content: string) {
    const sections = content.split(/\n\n+/).filter(Boolean)
    if (sections.length <= 1) return <p>{content}</p>
    return sections.map((section, i) => {
      const header = section.match(/^(Learn|Practice|Resources|Project):/i)?.[0] || ''
      const body = section.slice(header.length).trim()
      if (!header) return <p key={i} className="text-slate-300 mb-4">{section}</p>
      const colors: Record<string, string> = {
        Learn: 'text-blue-400',
        Practice: 'text-yellow-400',
        Resources: 'text-purple-400',
        Project: 'text-yellow-400',
      }
      const color = colors[header.replace(':', '')] || 'text-slate-400'
      if (header.replace(':', '') === 'Project') {
        return <div key={i} className="mb-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
          <p className={`${color} font-semibold text-xs uppercase tracking-wider mb-1`}>{header}</p>
          <p className="text-slate-300">{body}</p>
        </div>
      }
      return <div key={i} className="mb-4">
        <p className={`${color} font-semibold text-xs uppercase tracking-wider mb-1`}>{header}</p>
        <p className="text-slate-300">{body}</p>
      </div>
    })
  }

  if (loading && generating) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-slate-300 text-sm">Generating roadmap with AI...</p>
      <p className="text-slate-500 text-xs">This may take 30-60 seconds</p>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  if (genError) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">Failed to generate roadmap: {genError}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
      >
        Retry
      </button>
    </div>
  )

  if (!skill) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-slate-400">Roadmap not available for this skill.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/universe" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">{skillName || skill.name}</h1>
              <p className="text-xs text-slate-500">{skill.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              {completedAt ? 'Completed!' : `${passedSteps.length}/${totalSteps} checkpoints`}
            </div>
            {completedAt && <Trophy className="h-5 w-5 text-yellow-400" />}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div
            className={`h-full transition-all duration-500 ${completedAt ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${completedAt ? 100 : progressPct}%` }}
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
        {/* Left sidebar: checkpoint timeline */}
        <div className="w-72 shrink-0">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Progress</h2>
            <div className="space-y-0">
              {checkpoints.map((cp, idx) => {
                const unlocked = isUnlocked(idx)
                const done = isCompleted(idx)
                const active = idx === activeCp
                return (
                  <button
                    key={cp.id}
                    onClick={() => unlocked && setActiveCp(idx)}
                    disabled={!unlocked}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                      active ? 'bg-blue-500/10 border border-blue-500/20' : 'border border-transparent'
                    } ${unlocked ? 'hover:bg-slate-800/50 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                  >
                    <div className="shrink-0">
                      {done ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : unlocked ? (
                        <Circle className={`h-5 w-5 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
                      ) : (
                        <Lock className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium truncate ${done ? 'text-green-400' : active ? 'text-blue-300' : 'text-slate-400'}`}>
                        {cp.title}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {done ? 'Completed' : unlocked ? `${cp.quizzes.length} quiz` : 'Locked'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Center: content area */}
        <div className="flex-1 min-w-0">
          {completedAt ? (
            <div className="bg-slate-900/50 border border-green-500/20 rounded-xl p-12 text-center">
              <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Skill Acquired!</h2>
              <p className="text-slate-400 mb-6">You have mastered {skillName || skill.name}</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm">
                <Star className="h-4 w-4" />
                Star is now white in the universe
              </div>
            </div>
          ) : activeCheckpoint ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Step {activeCp + 1} of {totalSteps}</span>
                  <h2 className="text-2xl font-bold text-white mt-1">{activeCheckpoint.title}</h2>
                  <p className="text-slate-400 mt-1">{activeCheckpoint.description}</p>
                </div>
                {activeCheckpoint.is_final && (
                  <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-xs font-medium">
                    Mini-Project
                  </span>
                )}
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 mb-6">
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {renderContent(activeCheckpoint.content)}
                </div>
              </div>

              {!isCompleted(activeCp) ? (
                <button
                  onClick={startQuiz}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Take Quiz to Advance
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex items-center gap-3 text-green-400 text-sm">
                  <CheckCircle className="h-5 w-5" />
                  Checkpoint completed
                  {activeCp + 1 < totalSteps && (
                    <button
                      onClick={() => setActiveCp(activeCp + 1)}
                      className="ml-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-xs"
                    >
                      Next Step
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400">Select a checkpoint to begin.</p>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Checkpoint Quiz</h3>
                <button onClick={() => setShowQuiz(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {quizQuestions[0]?.submitted && quizPassed ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-semibold text-lg mb-1">All Correct!</p>
                  <p className="text-slate-400 text-sm mb-6">You passed the checkpoint quiz.</p>
                  <button
                    onClick={() => { setShowQuiz(false); setQuizPassed(false) }}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {quizQuestions.map((q, qi) => {
                    const isSubmitted = q.submitted
                    return (
                      <div key={q.id}>
                        <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                          {qi + 1}. {q.question}
                          {isSubmitted && q.correct && <span className="text-green-400 text-xs">✓ Correct</span>}
                          {isSubmitted && !q.correct && <span className="text-red-400 text-xs">✗ Incorrect</span>}
                        </p>
                        <div className="space-y-2">
                          {q.options.map((opt, oi) => {
                            const isSelected = q.selected === oi
                            const showResult = isSubmitted && isSelected
                            return (
                              <button
                                key={oi}
                                onClick={() => {
                                  if (q.selected !== undefined || isSubmitted) return
                                  setQuizQuestions(prev => prev.map(pq =>
                                    pq.id === q.id ? { ...pq, selected: oi } : pq
                                  ))
                                }}
                                disabled={isSubmitted}
                                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                                  showResult && q.correct
                                    ? 'bg-green-500/20 border-green-500/40 text-green-300'
                                    : showResult && !q.correct
                                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                    : isSelected
                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                    : 'bg-slate-800/30 border-slate-700 text-slate-300 hover:border-slate-500'
                                }`}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={submitQuiz}
                      disabled={submitting || quizQuestions.some(q => q.selected === undefined)}
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium"
                    >
                      {submitting ? 'Checking...' : 'Submit Answers'}
                    </button>
                    <button
                      onClick={() => setShowQuiz(false)}
                      className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      {quizQuestions[0]?.submitted ? 'Close' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completion CTA */}
      {!completedAt && passedSteps.length === totalSteps && totalSteps > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm border-t border-green-500/20 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4">
            <div>
              <p className="text-green-400 font-semibold">All checkpoints completed!</p>
              <p className="text-slate-400 text-xs">Complete the roadmap to mark this skill as acquired.</p>
            </div>
            <button
              onClick={completeRoadmap}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all"
            >
              <Star className="h-4 w-4 inline mr-2" />
              Mark as Acquired
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <RoadmapContent />
    </Suspense>
  )
}
