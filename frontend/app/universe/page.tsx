"use client"
import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase, Skill, SkillCategory } from "@/lib/supabase"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Html, Line } from "@react-three/drei"
import * as THREE from "three"
import { Bell } from "lucide-react"

const GALAXY_CONFIGS: { label: string; center: [number, number, number]; color: string; emissive: string }[] = [
  { label: 'Programming', center: [0, 10, 14], color: '#3b82f6', emissive: '#1d4ed8' },
  { label: 'ML', center: [14, -4, 8], color: '#8b5cf6', emissive: '#6d28d9' },
  { label: 'Cloud', center: [-13, 6, 9], color: '#06b6d4', emissive: '#0891b2' },
  { label: 'DevOps', center: [11, 9, -12], color: '#f59e0b', emissive: '#d97706' },
  { label: 'Data', center: [-11, -9, -12], color: '#10b981', emissive: '#059669' },
  { label: 'Cybersecurity', center: [0, -14, 8], color: '#ef4444', emissive: '#dc2626' },
  { label: 'Soft Skills', center: [15, 0, -6], color: '#f472b6', emissive: '#db2777' },
]

function getGalaxyConfig(category: string) {
  return GALAXY_CONFIGS.find(g => g.label === category) || GALAXY_CONFIGS[0]
}

interface SkillStarData {
  skill: Skill
  position: [number, number, number]
  isAcquired: boolean
  galaxyColor: string
}

function StarMesh({ data, onClick, hovered, onHover }: {
  data: SkillStarData
  onClick: () => void
  hovered: boolean
  onHover: (v: boolean) => void
}) {
  const ref = useRef<THREE.Mesh>(null)

  const size = 0.12 + (data.skill.demand_score || 0) * 0.8
  const displaySize = data.isAcquired ? size * 1.4 : size
  const finalSize = hovered ? displaySize * 1.5 : displaySize

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.002
      if (hovered) {
        ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1)
      }
    }
  })

  return (
    <mesh
      ref={ref}
      position={data.position}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(true) }}
      onPointerOut={() => onHover(false)}
      scale={finalSize}
    >
      <sphereGeometry args={[1, 20, 20]} />
      <meshBasicMaterial
        color={data.isAcquired ? "#ffffff" : data.galaxyColor}
        transparent={!data.isAcquired}
        opacity={data.isAcquired ? 1 : 0.85}
      />
    </mesh>
  )
}

function HoverLabel({ data }: { data: SkillStarData }) {
  return (
    <Html position={[data.position[0], data.position[1] + 1.2, data.position[2]]} distanceFactor={8}>
      <div className="px-3 py-1.5 bg-slate-900/90 text-white text-xs rounded-lg whitespace-nowrap border border-slate-700 backdrop-blur-sm shadow-xl">
        <div className="font-semibold">{data.skill.name}</div>
        <div className="text-slate-400 text-[10px] mt-0.5">
          {data.skill.category} · {data.skill.demand_score != null ? Math.round(data.skill.demand_score * 100) + '% demand' : 'N/A'}
        </div>
      </div>
    </Html>
  )
}

function GalaxyLabel({ config, count }: { config: typeof GALAXY_CONFIGS[0]; count: number }) {
  const labelPos: [number, number, number] = [
    config.center[0],
    config.center[1] - 4.5,
    config.center[2],
  ]
  return (
    <Html position={labelPos} distanceFactor={12} center>
      <div className="text-center pointer-events-none select-none">
        <div className="text-xs font-bold tracking-wider uppercase" style={{ color: config.color, opacity: 0.7 }}>
          {config.label}
        </div>
        <div className="text-[10px] text-slate-600 mt-0.5">{count} skills</div>
      </div>
    </Html>
  )
}

function CosmicBackground() {
  const starRef = useRef<THREE.Points>(null)
  const brightRef = useRef<THREE.Points>(null)
  const nebulaRef = useRef<THREE.Group>(null)
  const circleTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.3, 'rgba(255,255,255,0.7)')
    g.addColorStop(0.7, 'rgba(255,255,255,0.2)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 32)
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])
  
  const [starPos, starSizes] = useMemo(() => {
    const count = 4000
    const pos = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const radius = 40 + Math.random() * 80
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)
      sizes[i] = 0.1 + Math.random() * 0.3
    }
    return [pos, sizes]
  }, [])

  const [brightPos] = useMemo(() => {
    const count = 80
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 35 + Math.random() * 90
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)
    }
    return [pos]
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (starRef.current) {
      starRef.current.rotation.y += 0.00008
      starRef.current.rotation.x += 0.00003
    }
    if (brightRef.current) {
      brightRef.current.rotation.y += 0.00015
      brightRef.current.rotation.x += 0.00006
    }
    if (nebulaRef.current) {
      nebulaRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          child.position.x += Math.sin(t * 0.05 + i * 1.1) * 0.003
          child.position.y += Math.cos(t * 0.04 + i * 1.3) * 0.003
          const mat = child.material as THREE.MeshBasicMaterial
          mat.opacity = 0.04 + Math.sin(t * 0.03 + i * 0.8) * 0.02
        }
      })
    }
  })

  const nebulaColors = ['#3b82f6', '#8b5cf6', '#f472b6', '#06b6d4', '#10b981']
  const nebulaPositions: [number, number, number][] = [
    [-45, 25, -55], [50, -35, -60], [15, 55, -75],
    [-55, -40, -50], [60, 30, -65],
  ]

  return (
    <group>
      <points ref={starRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starPos.length / 3}
            array={starPos}
            itemSize={3}
            args={[starPos, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            count={starSizes.length}
            array={starSizes}
            itemSize={1}
            args={[starSizes, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.25}
          color="#94a3b8"
          transparent
          opacity={0.5}
          sizeAttenuation
          depthWrite={false}
          map={circleTex}
        />
      </points>
      <points ref={brightRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={brightPos.length / 3}
            array={brightPos}
            itemSize={3}
            args={[brightPos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.6}
          color="#e2e8f0"
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
          map={circleTex}
        />
      </points>
      <group ref={nebulaRef}>
        {nebulaPositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[30 + Math.random() * 20, 12, 12]} />
            <meshBasicMaterial
              color={nebulaColors[i]}
              transparent
              opacity={0.035}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function SingularityCore() {
  const outerRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (outerRef.current) {
      outerRef.current.rotation.x += 0.004
      outerRef.current.rotation.y += 0.007
      const s = 1 + Math.sin(t * 1.2) * 0.06
      outerRef.current.scale.setScalar(s)
    }
    if (innerRef.current) {
      innerRef.current.rotation.x -= 0.006
      innerRef.current.rotation.y += 0.015
    }
    if (glowRef.current) {
      glowRef.current.rotation.x += 0.002
      glowRef.current.rotation.y += 0.003
      const s2 = 1 + Math.sin(t * 2) * 0.04
      glowRef.current.scale.setScalar(s2)
    }
    if (matRef.current) {
      const hue = (t * 0.06) % 1
      matRef.current.color.setHSL(hue, 0.8, 0.6)
    }
  })

  return (
    <group>
      <mesh ref={outerRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1.0, 48, 48]} />
        <meshBasicMaterial ref={matRef} color="#ff0066" />
      </mesh>
      <mesh ref={innerRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} />
      </mesh>
    </group>
  )
}

function CosmicStrings({ acquiredStars }: { acquiredStars: SkillStarData[] }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Line) {
          const mat = child.material as THREE.LineBasicMaterial
          const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 1.5 + i * 0.7) * 0.25
          mat.opacity = pulse
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {acquiredStars.map((star, i) => {
        const points = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(...star.position),
        ]
        return (
          <Line
            key={i}
            points={points}
            color="#e0f0ff"
            opacity={0.65}
            transparent
            lineWidth={1}
          />
        )
      })}
    </group>
  )
}

function StarBurstLines({ stars, config }: { stars: SkillStarData[]; config: typeof GALAXY_CONFIGS[0] }) {
  const opacity = 0.08
  return (
    <group>
      {stars.map((star, i) => {
        if (i > 30) return null
        const points = [
          new THREE.Vector3(...config.center),
          new THREE.Vector3(...star.position),
        ]
        return (
          <Line
            key={i}
            points={points}
            color={config.color}
            opacity={opacity}
            transparent
            lineWidth={1}
          />
        )
      })}
    </group>
  )
}

function UniverseScene({ starData, onSkillClick, selectedSkill, setHoveredSkill }: {
  starData: SkillStarData[]
  onSkillClick: (skill: Skill) => void
  selectedSkill: Skill | null
  setHoveredSkill: (s: SkillStarData | null) => void
}) {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(5, 3, 22)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const grouped = useMemo(() => {
    const map = new Map<string, SkillStarData[]>()
    for (const s of starData) {
      const arr = map.get(s.skill.category) || []
      arr.push(s)
      map.set(s.skill.category, arr)
    }
    return map
  }, [starData])

  const galaxyStarsMap = useMemo(() => {
    const map = new Map<string, SkillStarData[]>()
    for (const config of GALAXY_CONFIGS) {
      map.set(config.label, grouped.get(config.label) || [])
    }
    return map
  }, [grouped])

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hoveredStar = starData.find(s => s.skill.id === hoveredId)

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <CosmicBackground />

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.3}
        enableZoom={true}
        maxDistance={50}
        minDistance={5}
        enablePan={false}
        target={[0, 0, 0]}
      />

      {GALAXY_CONFIGS.map(config => (
        <group key={config.label}>
          <GalaxyLabel config={config} count={(galaxyStarsMap.get(config.label) || []).length} />
          <StarBurstLines stars={galaxyStarsMap.get(config.label) || []} config={config} />
        </group>
      ))}

      <SingularityCore />

      <CosmicStrings acquiredStars={starData.filter(s => s.isAcquired)} />

      {starData.map(s => (
        <group key={s.skill.id}>
          <StarMesh
            data={s}
            onClick={() => onSkillClick(s.skill)}
            hovered={hoveredId === s.skill.id}
            onHover={(v) => setHoveredId(v ? s.skill.id : null)}
          />
        </group>
      ))}

      {hoveredStar && <HoverLabel data={hoveredStar} />}
    </>
  )
}

function SkillDetailPanel({ skill, isAcquired, readOnly, onClose, onStartRoadmap }: {
  skill: Skill
  isAcquired: boolean
  readOnly?: boolean
  onClose: () => void
  onStartRoadmap: () => void
}) {
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-20 w-96 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
      >
        ✕
      </button>

      <div className="mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
          isAcquired ? 'bg-blue-500/20' : 'bg-slate-700/50'
        }`}>
          <svg className={`h-6 w-6 ${isAcquired ? 'text-blue-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.5 3.5 0 1114.704 3.787l-.548-.547a3.501 3.501 0 01.697-3.065 2.751 2.751 0 01-.431-4.431L15.414 11H13a2 2 0 10-1.2-2.647z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">{skill.name}</h2>
        <span className={`text-xs px-3 py-1 rounded-full ${
          isAcquired ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'
        }`}>
          {skill.category}
        </span>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
          <span className="text-sm text-slate-400">Demand Score</span>
          <span className="text-white font-semibold">
            {skill.demand_score != null ? Math.round(skill.demand_score * 100) + '%' : 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
          <span className="text-sm text-slate-400">Avg Salary</span>
          <span className="text-white font-semibold">
            {skill.avg_salary != null && skill.avg_salary > 0 ? '$' + skill.avg_salary.toLocaleString() : 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
          <span className="text-sm text-slate-400">Market Frequency</span>
          <span className="text-white font-semibold">
            {skill.frequency != null && skill.frequency > 0 ? skill.frequency.toLocaleString() : 'N/A'}
          </span>
        </div>
      </div>

      {!isAcquired && !readOnly && (
        <div>
          <button
            onClick={onStartRoadmap}
            className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg shadow-blue-500/25"
          >
            Start Learning Roadmap
          </button>
        </div>
      )}

      {isAcquired && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-400">✓ {readOnly ? 'This candidate has this skill' : 'You already have this skill!'}</p>
        </div>
      )}
      {readOnly && !isAcquired && (
        <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-sm text-slate-400">Candidate doesn't have this skill yet</p>
        </div>
      )}
    </div>
  )
}

export default function UniversePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" /></div>}>
      <UniverseContent />
    </Suspense>
  )
}

function UniverseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewUserId = searchParams.get('viewUserId')
  const [loading, setLoading] = useState(true)
  const [allStarData, setAllStarData] = useState<SkillStarData[]>([])
  const [userSkillIds, setUserSkillIds] = useState<string[]>([])
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [generating, setGenerating] = useState(false)
  const [candidateName, setCandidateName] = useState('')

  useEffect(() => {
    async function loadUniverse() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      if (viewUserId) {
        // Read-only view of another user's universe
        const res = await fetch(`/api/candidate-universe?candidate_id=${encodeURIComponent(viewUserId)}`)
        const data = await res.json()
        if (data.error) { router.push('/'); return }

        const acquiredIds = [...new Set([
          ...data.resumeSkills,
          ...(data.userSkills || []).map((us: any) => us.skill_id),
        ])]
        const skills: Skill[] = (data.skills || []).map((s: any) => ({
          id: s.id, name: s.name,
          normalized_name: (s.name as string).toLowerCase().replace(/\s+/g, '_'),
          category: s.category as SkillCategory,
          frequency: s.frequency || 0, avg_salary: s.avg_salary || 0,
          demand_score: s.demand_score || 0, updated_at: new Date().toISOString(),
        }))
        const starData: SkillStarData[] = skills.map(skill => {
          const isAcquired = acquiredIds.includes(skill.id)
          const config = getGalaxyConfig(skill.category)
          return { skill, position: distributePosition(skill, skills.filter(s => s.category === skill.category), config), isAcquired, galaxyColor: config.color }
        })
        setCandidateName(data.user?.full_name || 'Candidate')
        setUserSkillIds(acquiredIds)
        setAllStarData(starData)
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from("users").select("role").eq("id", user.id).single()

      if (userData?.role !== "JOB_SEEKER") {
        router.push("/" + (userData?.role?.toLowerCase() || "login"))
        return
      }

      const { data: resumeData } = await supabase
        .from('resumes').select('id')
        .eq('student_id', user.id).eq('parsing_status', 'DONE')
        .order('upload_date', { ascending: false })
        .limit(1).maybeSingle()

      let acquiredIds: string[] = []
      if (resumeData?.id) {
        const { data: resumeSkills } = await supabase
          .from('resume_skills').select('skill_id')
          .eq('resume_id', resumeData.id)
        acquiredIds = (resumeSkills || []).map(rs => rs.skill_id)
      }

      // Also get skills acquired via roadmap completion
      const { data: userSkills } = await supabase
        .from('user_skills')
        .select('skill_id')
        .eq('user_id', user.id)
      const roadmapAcquiredIds = (userSkills || []).map(us => us.skill_id)
      acquiredIds = [...new Set([...acquiredIds, ...roadmapAcquiredIds])]

      const { data: allSkills } = await supabase
        .from("skills")
        .select("id, name, normalized_name, category, demand_score, avg_salary, frequency")

      const skills: Skill[] = (allSkills || []).map(s => ({
        id: s.id as string,
        name: s.name as string,
        normalized_name: (s.name as string).toLowerCase().replace(/\s+/g, '_'),
        category: s.category as SkillCategory,
        frequency: (s.frequency as number) || 0,
        avg_salary: (s.avg_salary as number) || 0,
        demand_score: (s.demand_score as number) || 0,
        updated_at: new Date().toISOString(),
      }))

      const starData: SkillStarData[] = skills.map(skill => {
        const isAcquired = acquiredIds.includes(skill.id)
        const config = getGalaxyConfig(skill.category)
        const pos = distributePosition(skill, skills.filter(s => s.category === skill.category), config)
        return { skill, position: pos, isAcquired, galaxyColor: config.color }
      })

      setUserSkillIds(acquiredIds)
      setAllStarData(starData)
      setLoading(false)
    }
    loadUniverse()
  }, [router])

  function distributePosition(skill: Skill, siblings: Skill[], config: typeof GALAXY_CONFIGS[0]): [number, number, number] {
    const sorted = [...siblings].sort((a, b) => (b.demand_score || 0) - (a.demand_score || 0))
    const idx = sorted.indexOf(skill)
    const total = sorted.length
    const t = total > 1 ? idx / (total - 1) : 0
    const radius = 3.5 + t * 3

    const phi = Math.acos(-1 + (2 * idx) / Math.max(total, 2))
    const theta = Math.sqrt(total || 1) * phi

    return [
      config.center[0] + radius * Math.sin(phi) * Math.cos(theta),
      config.center[1] + radius * Math.sin(phi) * Math.sin(theta),
      config.center[2] + radius * Math.cos(phi),
    ]
  }

  async function generateRoadmap(skillId: string, days: 30 | 60 | 90) {
    if (!selectedSkill) return
    setGenerating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const response = await fetch('/api/roadmap-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, target_skill: selectedSkill.name }),
      })
      const result = await response.json()
      if (result.success) {
        alert(`Roadmap for ${selectedSkill.name} generated!`)
        router.push('/roadmap')
      } else {
        throw new Error(result.error || 'Failed to generate roadmap')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to generate roadmap. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">{viewUserId ? 'Loading candidate universe...' : 'Loading your skill universe...'}</p>
        </div>
      </div>
    )
  }

  const selectedIsAcquired = selectedSkill ? userSkillIds.includes(selectedSkill.id) : false

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-10 p-6 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-2xl font-bold text-white">
            {viewUserId ? `${candidateName}'s Universe` : 'Skill Universe'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{allStarData.length} market skills · {userSkillIds.length} acquired</p>
        </div>
        <div className="flex items-center gap-2">
          {viewUserId ? (
            <button onClick={() => router.back()}
              className="pointer-events-auto text-sm text-slate-400 hover:text-white transition-colors">
              ← Back
            </button>
          ) : (
            <>
              <Link href="/notifications"
                className="pointer-events-auto text-sm text-slate-400 hover:text-white transition-colors relative" title="Notifications">
                <Bell className="h-5 w-5" />
              </Link>
              <button onClick={() => router.push("/upload-resume")}
                className="pointer-events-auto text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Upload Resume
              </button>
            </>
          )}
        </div>
      </div>

      <div className="absolute top-24 left-6 z-10 space-y-2 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4 pointer-events-auto">
          <p className="text-xs text-slate-400">Acquired Skills</p>
          <p className="text-2xl font-bold text-white">{userSkillIds.length}</p>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-4 pointer-events-auto">
          <p className="text-xs text-slate-400">Market Skills</p>
          <p className="text-2xl font-bold text-slate-400">{allStarData.length}</p>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-xl p-3 pointer-events-auto text-xs space-y-1.5">
          <div className="flex items-center">
            <div className="w-2.5 h-2.5 bg-white rounded-full mr-2 shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
            <span className="text-slate-300">Acquired</span>
          </div>
          {GALAXY_CONFIGS.map(c => (
            <div key={c.label} className="flex items-center">
              <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: c.color, boxShadow: `0 0 4px ${c.color}` }} />
              <span className="text-slate-400">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full h-screen">
        <Canvas camera={{ position: [5, 3, 22], fov: 60 }}>
          <UniverseScene
            starData={allStarData}
            onSkillClick={setSelectedSkill}
            selectedSkill={selectedSkill}
            setHoveredSkill={() => {}}
          />
        </Canvas>
      </div>

      {!selectedSkill && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <p className="text-slate-500 text-xs bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-full">
            Click a star to explore · Scroll to zoom · Drag to rotate
          </p>
        </div>
      )}

      {selectedSkill && (
        <SkillDetailPanel
          skill={selectedSkill}
          isAcquired={selectedIsAcquired}
          readOnly={!!viewUserId}
          onClose={() => setSelectedSkill(null)}
          onStartRoadmap={() => router.push(`/roadmap?skill_id=${selectedSkill.id}&skill=${encodeURIComponent(selectedSkill.name)}`)}
        />
      )}
    </div>
  )
}
