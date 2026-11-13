"use client"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function UploadResumePage() {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [extracting, setExtracting] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [progress, setProgress] = useState("")

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0])
            setError("")
            setSuccess(false)
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf']
        },
        maxFiles: 1
    })

    async function handleUpload() {
        if (!file) return

        setUploading(true)
        setError("")
        setSuccess(false)
        setProgress("Initializing...")

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            // Create resume record
            const { data: resumeData, error: insertError } = await supabase
                .from('resumes')
                .insert({
                    student_id: user.id,
                    parsing_status: 'PROCESSING'
                })
                .select()
                .single()

            if (insertError) throw insertError

            // Save file temporarily
            setProgress("Saving file...")
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            
            // Send to API that runs Python extractor + AI skill analysis
            setProgress("Extracting text from PDF...")
            setExtracting(true)

            const response = await fetch('/api/parse-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resume_id: resumeData.id,
                    user_id: user.id,
                    file_name: file.name,
                    file_data: buffer.toString('base64'),
                    file_type: 'pdf'
                })
            });

            setExtracting(false)

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Parser error:', response.status, errorText);
                throw new Error(`Resume parsing failed: ${errorText}`);
            }

            setAnalyzing(true)
            setProgress("AI analyzing skills...")

            const result = await response.json()
            setAnalyzing(false)
            
            console.log('Parser success:', result)
            setProgress("")

            setSuccess(true)
            setTimeout(() => router.push(`/skills-review?resume_id=${resumeData.id}`), 1500)

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed')
            setProgress("")
        } finally {
            setUploading(false)
            setExtracting(false)
            setAnalyzing(false)
        }
    }

    const isProcessing = uploading || extracting || analyzing

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[linear-gradient(135deg,#020617_0%,#0f172a_100%)]">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
                        <Upload className="h-8 w-8 text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Upload Your Resume</h1>
                    <p className="text-slate-400">
                        Upload your resume to analyze your skills and generate your personalized skill universe.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl mb-6">
                    <div
                        {...getRootProps()}
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                            isDragActive
                                ? 'border-blue-500 bg-blue-500/10 scale-105'
                                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
                        } ${file ? 'border-green-500/50' : ''}`}
                    >
                        <input {...getInputProps()} />
                        {file ? (
                            <div className="space-y-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full">
                                    <FileText className="h-6 w-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-lg">{file.name}</p>
                                    <p className="text-slate-400 text-sm">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-700 rounded-full">
                                    <Upload className="h-6 w-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-slate-300 text-lg font-medium">
                                        {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
                                    </p>
                                    <p className="text-slate-500 text-sm mt-2">
                                        or click to browse files • PDF only
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Progress Indicator */}
                    {isProcessing && progress && (
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                                <p className="text-blue-400 text-sm">{progress}</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center space-x-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mt-4">
                            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="flex items-center space-x-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg mt-4">
                            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                            <p className="text-green-400 text-sm">Skills analyzed successfully! Redirecting...</p>
                        </div>
                    )}

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={!file || isProcessing}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-4"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                {extracting ? 'Extracting text...' : analyzing ? 'AI analyzing...' : 'Processing...'}
                            </>
                        ) : success ? (
                            <>
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Complete
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5 mr-2" />
                                Analyze Resume
                            </>
                        )}
                    </button>
                </div>

                {/* Info Section */}
                <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-sm text-slate-500 mb-4">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>Secure cloud processing</span>
                    </div>
                    <div className="inline-flex items-center space-x-2 text-sm text-slate-500">
                        <CheckCircle className="h-4 w-4 text-blue-400" />
                        <span>AI-powered analysis</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
