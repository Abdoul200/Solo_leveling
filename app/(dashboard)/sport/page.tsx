'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Plus, Search, ChevronDown, ChevronUp, Check, X, BarChart2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import RankBadge from '@/components/ui/RankBadge'
import XPBar from '@/components/ui/XPBar'
import { EXERCISES_DATABASE } from '@/lib/constants'
import type { WorkoutSession, WorkoutExercise, WorkoutSet, Exercise, Rank } from '@/lib/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const MOCK_PHYSICAL = {
  physical_rank: 'D' as Rank,
  physical_xp: 850,
  weight_kg: 72,
  height_cm: 178,
}

const MOCK_WORKOUTS: WorkoutSession[] = [
  {
    id: 'w1',
    user_id: 'u1',
    name: 'Séance Poitrine/Triceps',
    exercises: [
      { exercise_id: 'bench-press', name: 'Développé couché', sets: [{ reps: 10, weight_kg: 60, duration_seconds: null, completed: true }, { reps: 8, weight_kg: 65, duration_seconds: null, completed: true }] },
      { exercise_id: 'push-up', name: 'Pompes', sets: [{ reps: 20, weight_kg: null, duration_seconds: null, completed: true }] },
    ],
    total_duration_minutes: 45,
    xp_earned: 120,
    completed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'w2',
    user_id: 'u1',
    name: 'Cardio HIIT',
    exercises: [
      { exercise_id: 'hiit', name: 'HIIT', sets: [{ reps: null, weight_kg: null, duration_seconds: 1800, completed: true }] },
    ],
    total_duration_minutes: 30,
    xp_earned: 80,
    completed_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
]

const WEIGHT_HISTORY = [
  { date: '1 Apr', weight: 74 },
  { date: '8 Apr', weight: 73.5 },
  { date: '15 Apr', weight: 73 },
  { date: '22 Apr', weight: 72.5 },
  { date: '1 Mai', weight: 72.8 },
  { date: '8 Mai', weight: 72.2 },
  { date: '15 Mai', weight: 72 },
  { date: '25 Mai', weight: 71.8 },
]

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
  const [activeTab, setActiveTab] = useState<'session' | 'history' | 'stats'>('session')
  const [showNewSession, setShowNewSession] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sessionName, setSessionName] = useState('')
  const [sessionExercises, setSessionExercises] = useState<ActiveExercise[]>([])
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [sessionStartTime] = useState(new Date())

  const filteredExercises = EXERCISES_DATABASE.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = [
    { key: 'all', label: 'Tout' },
    { key: 'force', label: '💪 Force' },
    { key: 'cardio', label: '🏃 Cardio' },
    { key: 'explosivité', label: '⚡ Explosivité' },
    { key: 'souplesse', label: '🤸 Souplesse' },
    { key: 'endurance', label: '🏅 Endurance' },
  ]

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
        ? {
            ...e,
            sets: e.sets.map((s, i) => i === setIndex ? { ...s, [field]: value } : s),
          }
        : e
    ))
  }

  const completeSession = () => {
    if (!sessionName.trim()) {
      toast.error('Donne un nom à ta séance')
      return
    }
    if (sessionExercises.length === 0) {
      toast.error('Ajoute au moins un exercice')
      return
    }

    const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 60000)
    const xp = Math.max(60, sessionExercises.length * 20 + duration * 2)

    toast.success(`Séance terminée ! +${xp} XP`)
    setShowNewSession(false)
    setSessionExercises([])
    setSessionName('')
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
          onClick={() => setShowNewSession(!showNewSession)}
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
          <RankBadge rank={MOCK_PHYSICAL.physical_rank} size="lg" />
          <div className="flex-1">
            <div className="font-bold text-sl-text mb-1">Rang Physique {MOCK_PHYSICAL.physical_rank}</div>
            <XPBar
              currentXp={MOCK_PHYSICAL.physical_xp}
              rank={MOCK_PHYSICAL.physical_rank}
              color="#10b981"
              showNumbers={true}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Poids', value: `${MOCK_PHYSICAL.weight_kg} kg`, icon: '⚖️' },
            { label: 'Taille', value: `${MOCK_PHYSICAL.height_cm} cm`, icon: '📏' },
            { label: 'IMC', value: ((MOCK_PHYSICAL.weight_kg / ((MOCK_PHYSICAL.height_cm / 100) ** 2))).toFixed(1), icon: '💪' },
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
          { key: 'session', label: '⚔️ Séance' },
          { key: 'history', label: '📋 Historique' },
          { key: 'stats', label: '📊 Stats' },
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

      {/* Nouvelle séance */}
      <AnimatePresence>
        {showNewSession && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div className="p-4 border-b border-white/5">
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Nom de la séance (ex: Poitrine & Dos)"
                  className="w-full py-2.5 px-4 rounded-lg text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#e2e8f0' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)'}
                />
              </div>

              {/* Exercices ajoutés */}
              {sessionExercises.length > 0 && (
                <div className="p-4 border-b border-white/5 space-y-3">
                  {sessionExercises.map((ex) => (
                    <div key={ex.exercise.id} className="rounded-xl overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                          <button onClick={(e) => { e.stopPropagation(); removeExercise(ex.exercise.id) }}
                            className="p-1 text-sl-red/70 hover:text-sl-red transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {expandedExercise === ex.exercise.id ? <ChevronUp className="w-4 h-4 text-sl-text-muted" /> : <ChevronDown className="w-4 h-4 text-sl-text-muted" />}
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
                    onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
                  {categories.map((cat) => (
                    <button key={cat.key} onClick={() => setSelectedCategory(cat.key)}
                      className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: selectedCategory === cat.key ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                        color: selectedCategory === cat.key ? '#10b981' : '#94a3b8',
                        border: selectedCategory === cat.key ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                        whiteSpace: 'nowrap',
                      }}>
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

              <div className="p-4 flex gap-3">
                <button onClick={() => { setShowNewSession(false); setSessionExercises([]) }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Annuler
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={completeSession}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', color: 'white' }}>
                  <Check className="w-4 h-4" />
                  Terminer la séance
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historique */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {MOCK_WORKOUTS.map((session) => (
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
                    {format(new Date(session.completed_at), "d MMMM yyyy", { locale: fr })} · {session.total_duration_minutes} min
                  </div>
                </div>
                <div className="text-sl-green font-bold text-sm">+{session.xp_earned} XP</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {session.exercises.map((ex) => (
                  <span key={ex.exercise_id} className="text-xs px-2 py-1 rounded-full"
                    style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    {ex.name}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-sl-green" />
              Évolution du poids
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={WEIGHT_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }}
                  formatter={(v) => [`${v} kg`, 'Poids']}
                />
                <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Séances totales', value: '24', icon: '💪', color: '#10b981' },
              { label: 'Heures de sport', value: '18h', icon: '⏱️', color: '#10b981' },
              { label: 'XP sport total', value: '2,450', icon: '⭐', color: '#10b981' },
              { label: 'Rang physique', value: 'D', icon: '🏆', color: '#10b981' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl p-4 text-center"
                style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}>
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-sl-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vue séance par défaut */}
      {activeTab === 'session' && !showNewSession && (
        <div className="text-center py-16">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Dumbbell className="w-16 h-16 mx-auto mb-4 text-sl-green opacity-30" />
          </motion.div>
          <p className="text-sl-text-muted mb-6">Prêt à forger ton corps ?</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewSession(true)}
            className="px-6 py-3 rounded-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', color: 'white', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}
          >
            Commencer une séance
          </motion.button>
        </div>
      )}
    </div>
  )
}
