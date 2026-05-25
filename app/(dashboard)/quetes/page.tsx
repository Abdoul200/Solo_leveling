'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, Clock, Sword, CheckCircle, Zap, RefreshCw } from 'lucide-react'
import QuestCard from '@/components/ui/QuestCard'
import LevelUpModal from '@/components/ui/LevelUpModal'
import type { Quest, Subject } from '@/lib/types'
import { SPACED_REPETITION_INTERVALS, XP_REWARDS } from '@/lib/constants'
import { addDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/lib/store'

type FilterType = 'all' | 'pending' | 'active' | 'completed' | 'failed'

export default function QuestesPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState(1)
  const [levelUpXp, setLevelUpXp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [generatingQuests, setGeneratingQuests] = useState(false)
  const [submittingCourse, setSubmittingCourse] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const { triggerLevelUp, updateQuest: updateStoreQuest } = useGameStore()

  // Formulaire ajout cours
  const [courseSubjectId, setCourseSubjectId] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseDate, setCourseDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))

  const fetchData = useCallback(async (uid: string) => {
    try {
      const [questsRes, subjectsRes] = await Promise.all([
        supabase
          .from('quests')
          .select('*')
          .eq('user_id', uid)
          .order('due_date', { ascending: true }),
        supabase
          .from('subjects')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: true }),
      ])

      if (questsRes.data) setQuests(questsRes.data as Quest[])
      if (subjectsRes.data) {
        setSubjects(subjectsRes.data as Subject[])
        if (subjectsRes.data.length > 0 && !courseSubjectId) {
          setCourseSubjectId(subjectsRes.data[0].id)
        }
      }
    } catch {
      toast.error('Le système a détecté une anomalie lors du chargement des quêtes.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (data.user) {
        setUserId(data.user.id)
        fetchData(data.user.id)
      }
    })
  }, [fetchData])

  const filteredQuests = filter === 'all'
    ? quests
    : quests.filter(q => q.status === filter)

  const pendingCount = quests.filter(q => q.status === 'pending').length
  const activeCount = quests.filter(q => q.status === 'active').length
  const completedCount = quests.filter(q => q.status === 'completed').length

  const handleQuestStart = async (questId: string) => {
    if (!userId) return
    // Optimistic update
    setQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, status: 'active' as const, timer_started_at: new Date().toISOString() } : q
    ))

    try {
      const res = await fetch('/api/quests/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, action: 'start', userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Le système a détecté une anomalie.')
        fetchData(userId)
        return
      }
      if (data.quest) {
        setQuests(prev => prev.map(q => q.id === questId ? data.quest : q))
        updateStoreQuest(questId, data.quest)
      }
      toast.success('Quête démarrée ! Le timer tourne...')
    } catch {
      toast.error('Le système a détecté une anomalie.')
      fetchData(userId)
    }
  }

  const handleQuestPause = async (questId: string) => {
    if (!userId) return
    setQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, status: 'pending' as const, timer_started_at: null } : q
    ))

    try {
      const res = await fetch('/api/quests/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, action: 'pause', userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Le système a détecté une anomalie.')
        fetchData(userId)
        return
      }
      if (data.quest) {
        setQuests(prev => prev.map(q => q.id === questId ? data.quest : q))
        updateStoreQuest(questId, data.quest)
      }
      toast('Quête mise en pause.')
    } catch {
      toast.error('Le système a détecté une anomalie.')
      fetchData(userId)
    }
  }

  const handleQuestComplete = async (questId: string) => {
    if (!userId) return
    setQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, status: 'completed' as const, completed_at: new Date().toISOString() } : q
    ))

    try {
      const res = await fetch('/api/quests/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, action: 'complete', userId }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Le système a détecté une anomalie.')
        fetchData(userId)
        return
      }

      if (data.quest) {
        setQuests(prev => prev.map(q => q.id === questId ? data.quest : q))
      }

      toast.success(`Quête accomplie ! +${data.xp_earned} XP`)

      if (data.level_up) {
        setLevelUpLevel(data.xp_result?.newLevel ?? 1)
        setLevelUpXp(data.xp_earned ?? 0)
        setShowLevelUp(true)
        triggerLevelUp({
          oldRank: data.xp_result?.oldRank ?? 'E',
          newRank: data.xp_result?.newRank ?? 'E',
          oldLevel: data.xp_result?.oldLevel ?? 1,
          newLevel: data.xp_result?.newLevel ?? 1,
          xpGained: data.xp_earned ?? 0,
          titleUnlocked: data.new_titles?.[0],
          skillUnlocked: data.new_skills?.[0],
        })
      }

      if (data.new_titles?.length > 0) {
        toast(`Titre débloqué : ${data.new_titles[0]} !`, { icon: '🏆', duration: 4000 })
      }
    } catch {
      toast.error('Le système a détecté une anomalie.')
      fetchData(userId)
    }
  }

  const handleQuestAbandon = async (questId: string) => {
    if (!userId) return
    setQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, status: 'failed' as const } : q
    ))

    try {
      const res = await fetch('/api/quests/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, action: 'abandon', userId }),
      })
      const data = await res.json()
      if (data.quest) {
        setQuests(prev => prev.map(q => q.id === questId ? data.quest : q))
      }
      toast.error('Quête abandonnée.')
    } catch {
      toast.error('Le système a détecté une anomalie.')
    }
  }

  const handleAddCourse = async () => {
    if (!courseTitle.trim()) {
      toast.error('Indique le titre du cours')
      return
    }
    if (!userId) return

    setSubmittingCourse(true)
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subjectId: courseSubjectId || null,
          title: courseTitle,
          description: courseDesc || null,
          studiedAt: courseDate ? new Date(courseDate).toISOString() : new Date().toISOString(),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Le système a détecté une anomalie.')
        return
      }

      // Ajouter les nouvelles quêtes à la liste
      if (data.quests && data.quests.length > 0) {
        setQuests(prev => [...prev, ...data.quests])
      }

      setShowAddCourse(false)
      setCourseTitle('')
      setCourseDesc('')
      toast.success(`Cours ajouté ! 5 révisions programmées (J+1, J+3, J+7, J+14, J+30)`)
    } catch {
      toast.error('Le système a détecté une anomalie.')
    } finally {
      setSubmittingCourse(false)
    }
  }

  const handleGenerateQuests = async () => {
    if (!userId) return
    setGeneratingQuests(true)
    try {
      const res = await fetch('/api/quests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Le système a détecté une anomalie.')
        return
      }

      if (data.quests && data.quests.length > 0) {
        setQuests(prev => [...prev, ...data.quests])
        toast.success(`${data.quests.length} nouvelles quêtes générées par le Système !`)
      } else {
        toast('Aucune nouvelle quête générée. Reviens plus tard.')
      }
    } catch {
      toast.error('Le système a détecté une anomalie.')
    } finally {
      setGeneratingQuests(false)
    }
  }

  const subjectMap = subjects.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, Subject>)

  const FILTERS: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'Toutes', count: quests.length },
    { key: 'active', label: 'En cours', count: activeCount },
    { key: 'pending', label: 'En attente', count: pendingCount },
    { key: 'completed', label: 'Terminées', count: completedCount },
  ]

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-32 bg-white/5 animate-pulse rounded-lg mb-2" />
          <div className="h-4 w-56 bg-white/5 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <LevelUpModal
        show={showLevelUp}
        newLevel={levelUpLevel}
        xpGained={levelUpXp}
        onClose={() => setShowLevelUp(false)}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-sl-text mb-1">Quêtes</h1>
          <p className="text-sm text-sl-text-muted">Accomplis tes missions pour progresser</p>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGenerateQuests}
            disabled={generatingQuests}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', border: '1px solid rgba(0, 212, 255, 0.3)' }}
          >
            <RefreshCw className={`w-4 h-4 ${generatingQuests ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Générer</span>
          </motion.button>

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
              {filter === 'all' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGenerateQuests}
                  disabled={generatingQuests}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white' }}
                >
                  Générer des quêtes
                </motion.button>
              )}
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
                      {subjects.length > 0 ? (
                        <div className="flex gap-2 flex-wrap">
                          {subjects.map((s) => (
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
                      ) : (
                        <div className="text-xs text-sl-text-muted py-2">Aucune matière configurée</div>
                      )}
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
                        whileHover={{ scale: submittingCourse ? 1 : 1.02 }}
                        whileTap={{ scale: submittingCourse ? 1 : 0.98 }}
                        onClick={handleAddCourse}
                        disabled={submittingCourse}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white', boxShadow: '0 0 15px rgba(109, 40, 217, 0.3)' }}
                      >
                        {submittingCourse ? (
                          <motion.div
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          />
                        ) : (
                          <>
                            <BookOpen className="w-4 h-4" />
                            Ajouter le cours
                          </>
                        )}
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
