'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, Clock, Sword, CheckCircle, Filter, Zap } from 'lucide-react'
import QuestCard from '@/components/ui/QuestCard'
import LevelUpModal from '@/components/ui/LevelUpModal'
import type { Quest, Subject } from '@/lib/types'
import { SUBJECT_ICONS, SUBJECT_COLORS, SPACED_REPETITION_INTERVALS, XP_REWARDS } from '@/lib/constants'
import { addDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

// Matières mock
const MOCK_SUBJECTS: Subject[] = [
  { id: 'math', user_id: 'u1', name: 'Mathématiques', color: '#00d4ff', rank: 'C', xp: 1650, level: 7, icon: '📐', created_at: '' },
  { id: 'phys', user_id: 'u1', name: 'Physique', color: '#8b5cf6', rank: 'C', xp: 1200, level: 5, icon: '⚛️', created_at: '' },
  { id: 'info', user_id: 'u1', name: 'Informatique', color: '#10b981', rank: 'B', xp: 3800, level: 12, icon: '💻', created_at: '' },
  { id: 'eco', user_id: 'u1', name: 'Économie', color: '#f59e0b', rank: 'D', xp: 900, level: 3, icon: '📊', created_at: '' },
]

// Quêtes mock
const MOCK_QUESTS: Quest[] = [
  {
    id: 'q1', user_id: 'u1', subject_id: 'math',
    title: 'Révision Matrices & Déterminants (J+1)',
    description: 'Revoir les propriétés des matrices, calcul de déterminants 2x2 et 3x3, systèmes de Cramer.',
    type: 'revision', status: 'pending', xp_reward: 100,
    min_duration_minutes: 25, time_spent_minutes: 0, timer_started_at: null,
    due_date: new Date(Date.now() + 3 * 3600000).toISOString(),
    completed_at: null, course_entry_id: 'c1', ai_generated: false,
  },
  {
    id: 'q2', user_id: 'u1', subject_id: null,
    title: 'Séance de concentration quotidienne',
    description: 'Travaille sur la tâche la plus importante de la journée sans interruption.',
    type: 'daily', status: 'active', xp_reward: 60,
    min_duration_minutes: 20, time_spent_minutes: 8, timer_started_at: new Date(Date.now() - 480000).toISOString(),
    due_date: new Date(Date.now() + 10 * 3600000).toISOString(),
    completed_at: null, course_entry_id: null, ai_generated: true,
  },
  {
    id: 'q3', user_id: 'u1', subject_id: 'phys',
    title: 'Thermodynamique 1er principe (J+3)',
    description: 'Révision du premier principe de la thermodynamique: énergie interne, travail, chaleur.',
    type: 'revision', status: 'pending', xp_reward: 90,
    min_duration_minutes: 20, time_spent_minutes: 0, timer_started_at: null,
    due_date: new Date(Date.now() + 5 * 3600000).toISOString(),
    completed_at: null, course_entry_id: 'c2', ai_generated: false,
  },
  {
    id: 'q4', user_id: 'u1', subject_id: 'info',
    title: 'Séance de sport — Cardio',
    description: '30 minutes de cardio selon le programme du système.',
    type: 'physical', status: 'pending', xp_reward: 80,
    min_duration_minutes: 30, time_spent_minutes: 0, timer_started_at: null,
    due_date: new Date(Date.now() + 8 * 3600000).toISOString(),
    completed_at: null, course_entry_id: null, ai_generated: true,
  },
  {
    id: 'q5', user_id: 'u1', subject_id: 'math',
    title: 'Problèmes d\'Analyse Complexe',
    description: 'Compléter les exercices 3.4 à 3.8 du manuel — fonctions holomorphes.',
    type: 'special', status: 'completed', xp_reward: 200,
    min_duration_minutes: 45, time_spent_minutes: 52, timer_started_at: null,
    due_date: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 1800000).toISOString(), course_entry_id: null, ai_generated: false,
  },
]

type FilterType = 'all' | 'pending' | 'active' | 'completed' | 'failed'

export default function QuestesPage() {
  const [quests, setQuests] = useState<Quest[]>(MOCK_QUESTS)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)

  // Formulaire ajout cours
  const [courseSubjectId, setCourseSubjectId] = useState(MOCK_SUBJECTS[0]?.id || '')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseDate, setCourseDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))

  const filteredQuests = filter === 'all'
    ? quests
    : quests.filter(q => q.status === filter)

  const pendingCount = quests.filter(q => q.status === 'pending').length
  const activeCount = quests.filter(q => q.status === 'active').length
  const completedCount = quests.filter(q => q.status === 'completed').length

  const handleQuestStart = (questId: string) => {
    setQuests(prev => prev.map(q =>
      q.id === questId
        ? { ...q, status: 'active' as const, timer_started_at: new Date().toISOString() }
        : q
    ))
    toast.success('Quête démarrée ! Le timer tourne...')
  }

  const handleQuestComplete = (questId: string) => {
    const quest = quests.find(q => q.id === questId)
    setQuests(prev => prev.map(q =>
      q.id === questId
        ? { ...q, status: 'completed' as const, completed_at: new Date().toISOString() }
        : q
    ))
    if (quest) {
      toast.success(`Quête accomplie ! +${quest.xp_reward} XP`)
      setShowLevelUp(true)
    }
  }

  const handleQuestAbandon = (questId: string) => {
    setQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, status: 'failed' as const } : q
    ))
    toast.error('Quête abandonnée.')
  }

  const handleAddCourse = () => {
    if (!courseTitle.trim()) {
      toast.error('Indique le titre du cours')
      return
    }

    // Créer une quête de révision pour chaque intervalle
    const studiedAt = new Date(courseDate)
    const newQuests: Quest[] = SPACED_REPETITION_INTERVALS.map((days, i) => {
      const dueDate = addDays(studiedAt, days)
      const subject = MOCK_SUBJECTS.find(s => s.id === courseSubjectId)
      return {
        id: `rev_${Date.now()}_${i}`,
        user_id: 'u1',
        subject_id: courseSubjectId || null,
        title: `${courseTitle} (J+${days})`,
        description: courseDesc || `Révision J+${days} de : ${courseTitle}`,
        type: 'revision' as const,
        status: 'pending' as const,
        xp_reward: XP_REWARDS.quest_revision_base,
        min_duration_minutes: 20,
        time_spent_minutes: 0,
        timer_started_at: null,
        due_date: dueDate.toISOString(),
        completed_at: null,
        course_entry_id: `course_${Date.now()}`,
        ai_generated: false,
      }
    })

    setQuests(prev => [...prev, ...newQuests])
    setShowAddCourse(false)
    setCourseTitle('')
    setCourseDesc('')
    toast.success(`Cours ajouté ! 5 révisions programmées (J+1, J+3, J+7, J+14, J+30)`)
  }

  const subjectMap = MOCK_SUBJECTS.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, Subject>)

  const FILTERS: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'Toutes', count: quests.length },
    { key: 'active', label: 'En cours', count: activeCount },
    { key: 'pending', label: 'En attente', count: pendingCount },
    { key: 'completed', label: 'Terminées', count: completedCount },
  ]

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <LevelUpModal show={showLevelUp} newLevel={9} xpGained={120} onClose={() => setShowLevelUp(false)} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-sl-text mb-1">Quêtes</h1>
          <p className="text-sm text-sl-text-muted">Accomplis tes missions pour progresser</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddCourse(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white', boxShadow: '0 0 15px rgba(109, 40, 217, 0.4)' }}
        >
          <Plus className="w-4 h-4" />
          Ajouter un cours
        </motion.button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Actives', value: activeCount, color: '#00d4ff', icon: <Sword className="w-4 h-4" /> },
          { label: 'En attente', value: pendingCount, color: '#f59e0b', icon: <Clock className="w-4 h-4" /> },
          { label: 'Terminées', value: completedCount, color: '#10b981', icon: <CheckCircle className="w-4 h-4" /> },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-3 text-center"
            style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}>
            <div className="flex justify-center mb-1" style={{ color: stat.color }}>{stat.icon}</div>
            <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-sl-text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: filter === f.key ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255,255,255,0.04)',
              color: filter === f.key ? '#00d4ff' : '#94a3b8',
              border: filter === f.key ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {f.label}
            {f.count !== undefined && (
              <span className="text-xs opacity-70">({f.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Liste des quêtes */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredQuests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-sl-text-muted"
            >
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Aucune quête dans cette catégorie</p>
            </motion.div>
          ) : (
            filteredQuests.map((quest) => {
              const subject = quest.subject_id ? subjectMap[quest.subject_id] : undefined
              return (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onStart={handleQuestStart}
                  onComplete={handleQuestComplete}
                  onAbandon={handleQuestAbandon}
                  subjectName={subject?.name}
                  subjectColor={subject?.color}
                />
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Modal ajout cours */}
      <AnimatePresence>
        {showAddCourse && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setShowAddCourse(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-0 left-0 right-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50 p-4"
            >
              <div
                className="w-full max-w-lg mx-auto rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #0f0f1a, #0a0a20)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-sl-text">Ajouter un cours</h2>
                      <p className="text-xs text-sl-text-muted mt-0.5">
                        5 révisions automatiques seront créées (J+1, J+3, J+7, J+14, J+30)
                      </p>
                    </div>
                    <button onClick={() => setShowAddCourse(false)} className="text-sl-text-muted hover:text-sl-text p-1">
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Matière */}
                    <div>
                      <label className="block text-xs font-medium text-sl-text-muted mb-2 uppercase tracking-wider">Matière</label>
                      <div className="flex gap-2 flex-wrap">
                        {MOCK_SUBJECTS.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setCourseSubjectId(s.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                            style={{
                              background: courseSubjectId === s.id ? `${s.color}20` : 'rgba(255,255,255,0.04)',
                              border: courseSubjectId === s.id ? `1px solid ${s.color}` : '1px solid rgba(255,255,255,0.08)',
                              color: courseSubjectId === s.id ? s.color : '#94a3b8',
                            }}
                          >
                            {s.icon} {s.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Titre */}
                    <div>
                      <label className="block text-xs font-medium text-sl-text-muted mb-2 uppercase tracking-wider">Titre du cours</label>
                      <input
                        type="text"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        placeholder="Ex: Algèbre linéaire — Matrices"
                        className="w-full py-3 px-4 rounded-lg text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0, 212, 255, 0.15)', color: '#e2e8f0' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-sl-text-muted mb-2 uppercase tracking-wider">
                        Notes (optionnel)
                      </label>
                      <textarea
                        value={courseDesc}
                        onChange={(e) => setCourseDesc(e.target.value)}
                        placeholder="Points clés à retenir..."
                        rows={3}
                        className="w-full py-3 px-4 rounded-lg text-sm outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0, 212, 255, 0.15)', color: '#e2e8f0' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'}
                      />
                    </div>

                    {/* Date & Heure */}
                    <div>
                      <label className="block text-xs font-medium text-sl-text-muted mb-2 uppercase tracking-wider">
                        Date et heure d&apos;étude
                      </label>
                      <input
                        type="datetime-local"
                        value={courseDate}
                        onChange={(e) => setCourseDate(e.target.value)}
                        className="w-full py-3 px-4 rounded-lg text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0, 212, 255, 0.15)', color: '#e2e8f0', colorScheme: 'dark' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'}
                      />
                    </div>

                    {/* Aperçu révisions */}
                    <div className="rounded-xl p-4" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      <div className="text-xs text-sl-purple font-medium mb-3 uppercase tracking-wider">Révisions programmées</div>
                      <div className="space-y-1">
                        {SPACED_REPETITION_INTERVALS.map((days) => (
                          <div key={days} className="flex justify-between text-xs">
                            <span className="text-sl-text-muted">J+{days} — {courseDate ? format(addDays(new Date(courseDate), days), "dd MMM yyyy", { locale: fr }) : '—'}</span>
                            <span className="text-sl-purple">+{XP_REWARDS.quest_revision_base} XP</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowAddCourse(false)}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        Annuler
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddCourse}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white', boxShadow: '0 0 15px rgba(109, 40, 217, 0.3)' }}
                      >
                        <BookOpen className="w-4 h-4" />
                        Ajouter le cours
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
