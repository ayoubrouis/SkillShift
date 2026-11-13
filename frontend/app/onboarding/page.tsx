"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function OnboardingPage() {
    const router = useRouter()
    const [unlocked, setUnlocked] = useState(false)
    const [isPlaying, setIsPlaying] = useState(true)
    const playerRef = useRef<HTMLVideoElement>(null)

    function handleEnded() {
        setUnlocked(true)
        setIsPlaying(false)
    }

    function togglePlayPause() {
        if (!playerRef.current) return
        if (isPlaying) {
            playerRef.current.pause()
        } else {
            playerRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    function handleContinue() {
        router.push("/upload-resume")
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#020617]">
            {/* Video Background */}
            <video
                ref={playerRef}
                src="/onboarding/onboarding.mp4"
                autoPlay
                muted
                onEnded={handleEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Light overlay — just enough for text readability */}
            <div className="absolute inset-0 bg-black/40"></div>

            {/* Content — button at bottom */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-end px-4 pb-16">
                <div className="text-center">
                    {!unlocked ? (
                        <>
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    {isPlaying ? (
                                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <button onClick={togglePlayPause}>
                                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <p className="text-slate-300">Watch the video to continue</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Ready to Start!</h2>
                                <p className="text-slate-300">Your journey begins now</p>
                            </div>

                            <button
                                onClick={handleContinue}
                                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                Initialize My Universe
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
