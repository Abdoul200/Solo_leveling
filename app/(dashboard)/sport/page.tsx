'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Plus, Search, ChevronDown, ChevronUp, Check, X, BarChart2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import RankBadge from '@/components/ui/RankBadge'
import XPBar from '@/components/ui/XPBar'
import { EXERCISES_DATABASE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/lib/store'
import type { WorkoutSession, PhysicalStats, Exercise, Rank } from '@/lib/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface ActiveSet {
  reps: string
  weight: string
  duration: string
  completed: boolean
}

interface ActiveExercise {
  exercise: Exercise
  sets: ActiveSet[]
}

export default function SportPage() {
  const { userProfile } = useGameStore()

  const [activeTab, setActiveTab] = useState<'session' | 'history' | 'stats'>('session')

  // Nouvelle séance
  const [showNewSession, setShowNewSession] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [sessionTimer, setSessionTimer] = useState(0)
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sessionExercises, setSessionExercises] = useState<ActiveExercise[]>([])
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)

  // Historique
  const [history, setHistory] = useState<WorkoutSession[]>([])

  // Stats physiques
  const [physStats, setPhysStats] = useState({ weight_kg: '', chest_cm: '', waist_cm: '', arms_cm: '' })
  const [weightHistory, setWeightHistory] = useState<{ date: string; poids: number }[]>([])
  const [physicalRank, setPhysicalRank] = useState<Rank>('E')
  const [physicalXp, setPhysicalXp] = useState(0)

  // Loading
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Catégories
  const categories = [
    { key: 'all', label: 'Tout' },
    { key: 'force', label: '💪 Force' },
    { key: 'cardio', label: '🏃 Cardio' },
    { key: 'explosivité', label: '⚡ Explosivité' },
    { key: 'souplesse', label: '🤸 Souplesse' },
    { key: 'endurance', label: '🏅 Endurance' },
  ]

  const filteredExercises = EXERCISES_DATABASE.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Timer
  const startSession = () => {
    setSessionActive(true)
    setSessionTimer(0)
    const interval = setInterval(() => setSessionTimer(prev => prev + 1), 1000)
    setTimerInterval(interval)
  }

  const stopSession = () => {
    if (timerInterval) clearInterval(timerInterval)
    setTimerInterval(null)
  }

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval)
    }
  }, [timerInterval])

  // Fetch données
  useEffect(() => {
    if (!userProfile) return
    const fetchData = async () => {
      setLoading(true)
      const [histRes, statsRes] = await Promise.all([
        fetch(`/api/sport?userId=${userProfile.id}&type=history`),
        supabase
          .from('physical_stats')
          .select('*')
          .eq('user_id', userProfile.id)
          .order('recorded_at', { ascending: false }),
      ])

      if (histRes.ok) {
        const histData = await histRes.json()
        setHistory(histData.sessions || [])
      }

      const physData: PhysicalStats[] = statsRes.data || []
      if (physData.length > 0) {
        const latest = physData[0]
        setPhysStats({
          weight_kg: String(latest.weight_kg ?? ''),
          chest_cm: String(latest.chest_cm ?? ''),
          waist_cm: String(latest.waist_cm ?? ''),
          arms_cm: String(latest.arms_cm ?? ''),
        })
        setPhysicalRank(latest.physical_rank)
        setPhysicalXp(latest.physical_xp)
      }

      const wHistory = physData
        .filter((p) => p.weight_kg !== null)
        .map((p) => ({
          date: new Date(p.recorded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          poids: p.weight_kg as number,
        }))
        .reverse()
      setWeightHistory(wHistory)

      setLoading(false)
    }
    fetchData()
  }, [userProfile])

  // Exercices
  const addExercise = (exercise: Exercise) => {
    if (sessionExercises.find(e => e.exercise.id === exercise.id)) {
      toast('Exercice déjà dans la séance')
      return
    }
    setSessionExercises(prev => [...prev, {
      exercise,
      sets: [{ reps: '', weight: '', duration: '', completed: false }],
    }])
    setExpandedExercise(exercise.id)
    toast.success(`${exercise.name} ajouté`)
  }

  const addSet = (exerciseId: string) => {
    setSessionExercises(prev => prev.map(e =>
      e.exercise.id === exerciseId
        ? { ...e, sets: [...e.sets, { reps: '', weight: '', duration: '', completed: false }] }
        : e
    ))
  }

  const removeExercise = (exerciseId: string) => {
    setSessionExercises(prev => prev.filter(e => e.exercise.id !== exerciseId))
  }

  const updateSet = (exerciseId: string, setIndex: number, field: keyof ActiveSet, value: string | boolean) => {
    setSessionExercises(prev => prev.map(e =>
      e.exercise.id === exerciseId
        ? { ...e, sets: e.sets.map((s, i) => i === setIndex ? { ...s, [field]: value } : s) }
        : e
    ))
  }

  // Soumettre la séance
  const handleSubmitSession = async () => {
    if (!userProfile || sessionExercises.length === 0) return
    setSubmitting(true)
    stopSession()

    try {
      const exercises = sessionExercises.map(ex => ({
        exercise_id: ex.exercise.id,
        name: ex.exercise.name,
        sets: ex.sets.map(s => ({
          reps: s.reps ? parseInt(s.reps) : null,
          weight_kg: s.weight ? parseFloat(s.weight) : null,
          duration_seconds: s.duration ? parseInt(s.duration) : null,
          completed: s.completed,
        })),
      }))

      const res = await fetch('/api/sport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          name: sessionName || 'Séance sans nom',
          exercises,
          duration: Math.round(sessionTimer / 60),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Séance terminée ! +${data.xp_earned} XP`)
        setSessionExercises([])
        setSessionActive(false)
        setSessionTimer(0)
        setSessionName('')
        setShowNewSession(false)
        // Recharger historique
        const histRes = await fetch(`/api/sport?userId=${userProfile.id}&type=history`)
        if (histRes.ok) {
          const histData = await histRes.json()
          setHistory(histData.sessions || [])
        }
      } else {
        toast.error('Le système a détecté une anomalie.')
      }
    } catch {
      toast.error('Le système a détecté une anomalie.')
    } finally {
      setSubmitting(false)
    }
  }

  // Sauvegarder les stats physiques
  const handleSavePhysStats = async () => {
    if (!userProfile) return
    try {
      const { error } = await supabase.from('physical_stats').insert({
        user_id: userProfile.id,
        weight_kg: physStats.weight_kg ? parseFloat(physStats.weight_kg) : null,
        chest_cm: physStats.chest_cm ? parseFloat(physStats.chest_cm) : null,
        waist_cm: physStats.waist_cm ? parseFloat(physStats.waist_cm) : null,
        arms_cm: physStats.arms_cm ? parseFloat(physStats.arms_cm) : null,
        physical_rank: physicalRank,
        physical_xp: physicalXp,
        recorded_at: new Date().toISOString(),
      })
      if (!error) {
        toast.success('Statistiques physiques enregistrées !')
      } else {
        toast.error('Le système a détecté une anomalie.')
      }
    } catch {
      toast.error('Le système a détecté une anomalie.')
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-sl-text mb-1">Sport</h1>
          <p className="text-sm text-sl-text-muted">Forge ton corps, élève ton rang physique</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setShowNewSession(!showNewSession); if (!sessionActive) startSession() }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', color: 'white', boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' }}
        >
          <Plus className="w-4 h-4" />
          Nouvelle séance
        </motion.button>
      </div>

      {/* Rang physique */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5 mb-6"
        style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <RankBadge rank={physicalRank} size="lg" />
          <div className="flex-1">
            <div className="font-bold text-sl-text mb-1">Rang Physique {physicalRank}</div>
            <XPBar
              currentXp={physicalXp}
              rank={physicalRank}
              color="#10b981"
              showNumbers={true}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Poids', value: physStats.weight_kg ? `${physStats.weight_kg} kg` : '— kg', icon: '⚖️' },
            { label: 'Poitrine', value: physStats.chest_cm ? `${physStats.chest_cm} cm` : '— cm', icon: '📏' },
            { label: 'Bras', value: physStats.arms_cm ? `${physStats.arms_cm} cm` : '— cm', icon: '💪' },
          ].map((stat) => (
            <div key={stat.label} className="text-center rounded-xl p-3" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <div className="text-lg">{stat.icon}</div>
              <div className="font-black text-sl-green text-lg">{stat.value}</div>
              <div className="text-xs text-sl-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'session', label: '⚔️ Nouvelle séance' },
          { key: 'history', label: '📋 Historique' },
          { key: 'stats', label: '📊 Stats physiques' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'session' | 'history' | 'stats')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.key ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.key ? '#10b981' : '#94a3b8',
              border: activeTab === tab.key ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab : Nouvelle séance */}
      {activeTab === 'session' && (
        <div>
          <AnimatePresence>
            {showNewSession ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  {/* Timer */}
                  {sessionActive && (
                    <div
                      className="flex flex-col items-center justify-center py-8"
                      style={{ background: 'rgba(16, 185, 129, 0.05)' }}
                    >
                      <div
                        className="text-5xl font-black tracking-widest"
                        style={{
                          color: '#10b981',
                          textShadow: '0 0 20px rgba(16, 185, 129, 0.8), 0 0 40px rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        {formatTimer(sessionTimer)}
                      </div>
                      <div className="text-xs text-sl-text-muted mt-2 uppercase tracking-wider">Séance en cours</div>
                    </div>
                  )}

                  {/* Nom de séance */}
                  <div className="p-4 border-b border-white/5">
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="Nom de la séance (ex: Poitrine & Dos)"
                      className="w-full py-2.5 px-4 rounded-lg text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#e2e8f0' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)' }}
                    />
                  </div>

                  {/* Exercices ajoutés */}
                  {sessionExercises.length > 0 && (
                    <div className="p-4 border-b border-white/5 space-y-3">
                      {sessionExercises.map((ex) => (
                        <div
                          key={ex.exercise.id}
                          className="rounded-xl overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => setExpandedExercise(expandedExercise === ex.exercise.id ? null : ex.exercise.id)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{ex.exercise.icon}</span>
                              <span className="font-medium text-sm text-sl-text">{ex.exercise.name}</span>
                              <span className="text-xs text-sl-text-muted">{ex.sets.length} séries</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); removeExercise(ex.exercise.id) }}
                                className="p-1 text-sl-red/70 hover:text-sl-red transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              {expandedExercise === ex.exercise.id
                                ? <ChevronUp className="w-4 h-4 text-sl-text-muted" />
                                : <ChevronDown className="w-4 h-4 text-sl-text-muted" />}
                            </div>
                          </div>

                          {expandedExercise === ex.exercise.id && (
                            <div className="px-3 pb-3 space-y-2">
                              {ex.sets.map((set, si) => (
                                <div key={si} className="flex items-center gap-2">
                                  <span className="text-xs text-sl-text-muted w-6">{si + 1}.</span>
                                  {ex.exercise.unit === 'reps' ? (
                                    <>
                                      <input
                                        type="number"
                                        placeholder="Reps"
                                        value={set.reps}
                                        onChange={(e) => updateSet(ex.exercise.id, si, 'reps', e.target.value)}
                                        className="w-16 py-1.5 px-2 rounded text-xs outline-none text-center"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                      />
                                      <span className="text-xs text-sl-text-muted">×</span>
                                      <input
                                        type="number"
                                        placeholder="Kg"
                                        value={set.weight}
                                        onChange={(e) => updateSet(ex.exercise.id, si, 'weight', e.target.value)}
                                        className="w-16 py-1.5 px-2 rounded text-xs outline-none text-center"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                      />
                                      <span className="text-xs text-sl-text-muted">kg</span>
                                    </>
                                  ) : (
                                    <>
                                      <input
                                        type="number"
                                        placeholder="Secs"
                                        value={set.duration}
                                        onChange={(e) => updateSet(ex.exercise.id, si, 'duration', e.target.value)}
                                        className="w-20 py-1.5 px-2 rounded text-xs outline-none text-center"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                      />
                                      <span className="text-xs text-sl-text-muted">sec</span>
                                    </>
                                  )}
                                  <button
                                    onClick={() => updateSet(ex.exercise.id, si, 'completed', !set.completed)}
                                    className="ml-auto p-1 rounded transition-all"
                                    style={{
                                      background: set.completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                                      color: set.completed ? '#10b981' : '#94a3b8',
                                      border: set.completed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                                    }}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => addSet(ex.exercise.id)}
                                className="text-xs text-sl-text-muted hover:text-sl-green flex items-center gap-1 mt-1"
                              >
                                <Plus className="w-3 h-3" /> Ajouter une série
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recherche exercices */}
                  <div className="p-4 border-b border-white/5">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sl-text-muted" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un exercice..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                      />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
                      {categories.map((cat) => (
                        <button
                          key={cat.key}
                          onClick={() => setSelectedCategory(cat.key)}
                          className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{
                            background: selectedCategory === cat.key ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                            color: selectedCategory === cat.key ? '#10b981' : '#94a3b8',
                            border: selectedCategory === cat.key ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                      {filteredExercises.slice(0, 20).map((ex) => (
                        <motion.button
                          key={ex.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => addExercise(ex)}
                          className="flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#94a3b8',
                          }}
                        >
                          <span>{ex.icon}</span>
                          <span className="truncate">{ex.name}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 flex gap-3">
                    <button
                      onClick={() => { setShowNewSession(false); setSessionExercises([]); stopSession(); setSessionActive(false); setSessionTimer(0) }}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Annuler
                    </button>
                    {sessionActive && sessionExercises.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmitSession}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', color: 'white', opacity: submitting ? 0.7 : 1 }}
                      >
                        <Check className="w-4 h-4" />
                        {submitting ? 'Enregistrement...' : 'Terminer la séance'}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-16">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Dumbbell className="w-16 h-16 mx-auto mb-4 text-sl-green opacity-30" />
                </motion.div>
                <p className="text-sl-text-muted mb-6">Prêt à forger ton corps ?</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowNewSession(true); startSession() }}
                  className="px-6 py-3 rounded-xl font-bold"
                  style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', color: 'white', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}
                >
                  Commencer une séance
                </motion.button>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tab : Historique */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', height: 80 }} />
            ))
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-sl-text-muted">
              Aucune séance enregistrée pour l&apos;instant
            </div>
          ) : (
            history.slice(0, 5).map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-sl-text">{session.name}</h3>
                    <div className="text-xs text-sl-text-muted mt-0.5">
                      {format(new Date(session.completed_at), 'd MMMM yyyy', { locale: fr })} · {session.total_duration_minutes} min · {session.exercises.length} exercices
                    </div>
                  </div>
                  <div className="text-sl-green font-bold text-sm">+{session.xp_earned} XP</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {session.exercises.map((ex) => (
                    <span
                      key={ex.exercise_id}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                    >
                      {ex.name}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Tab : Stats physiques */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Inputs mensurations */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-sl-green" />
              Mensurations
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { key: 'weight_kg', label: 'Poids (kg)', placeholder: '70' },
                { key: 'chest_cm', label: 'Poitrine (cm)', placeholder: '100' },
                { key: 'waist_cm', label: 'Taille (cm)', placeholder: '80' },
                { key: 'arms_cm', label: 'Bras (cm)', placeholder: '35' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs text-sl-text-muted block mb-1">{field.label}</label>
                  <input
                    type="number"
                    placeholder={field.placeholder}
                    value={physStats[field.key as keyof typeof physStats]}
                    onChange={(e) => setPhysStats(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full py-2.5 px-3 rounded-lg text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#e2e8f0' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)' }}
                  />
                </div>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSavePhysStats}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', color: 'white' }}
            >
              Sauvegarder
            </motion.button>
          </div>

          {/* Rang physique */}
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <h3 className="font-bold text-sl-text mb-4">Rang physique</h3>
            <div className="flex items-center gap-4">
              <RankBadge rank={physicalRank} size="lg" showLabel />
              <div className="flex-1">
                <XPBar currentXp={physicalXp} rank={physicalRank} color="#10b981" showNumbers />
              </div>
            </div>
          </div>

          {/* Graphique poids */}
          {weightHistory.length > 1 && (
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
              <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-sl-green" />
                Évolution du poids
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip
                    contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [`${v ?? 0} kg`, 'Poids']}
                  />
                  <Line type="monotone" dataKey="poids" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
