'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Sword, Castle, Dumbbell, BookOpen, ChevronRight, Clock, Zap, TrendingUp } from 'lucide-react'
import RankBadge from '@/components/ui/RankBadge'
import XPBar from '@/components/ui/XPBar'
import QuestCard from '@/components/ui/QuestCard'
import StreakDisplay from '@/components/ui/StreakDisplay'
import BossHealthBar from '@/components/ui/BossHealthBar'
import Link from 'next/link'
import type { Quest, Dungeon } from '@/lib/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useGameStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const {
    userProfile,
    subjects,
    todayQuests,
    activeDungeons,
    isInitialized,
    isLoading,
    updateQuest,
    triggerLevelUp,
  } = useGameStore()

  const [allQuests, setAllQuests] = useState<Quest[]>([])
  const [loadingQuests, setLoadingQuests] = useState(false)

  // Sync local quests with store
  useEffect(() => {
    setAllQuests(todayQuests)
  }, [todayQuests])

  // Fetch quests du jour si le store ne les a pas encore
  useEffect(() => {
    if (!isInitialized || !userProfile) return
    if (todayQuests.length > 0) return

    const fetchTodayQuests = async () => {
      setLoadingQuests(true)
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const { data } = await supabase
          .from('quests')
          .select('*')
          .eq('user_id', userProfile.id)
          .in('status', ['pending', 'active'])
          .order('due_date', { ascending: true })
          .limit(10)

        if (data) setAllQuests(data as Quest[])
      } catch (err) {
        console.error('Erreur fetch quêtes:', err)
      } finally {
        setLoadingQuests(false)
      }
    }

    fetchTodayQuests()
  }, [isInitialized, userProfile, todayQuests.length])

  const activeQuests = allQuests.filter(q => q.status === 'pending' || q.status === 'active')
  const completedToday = allQuests.filter(q => q.status === 'completed')
  const todayXP = completedToday.reduce((sum, q) => sum + q.xp_reward, 0)

  const bossDungeons = activeDungeons.filter(d => d.type === 'boss' && d.status === 'active')
  const sprintDungeons = activeDungeons.filter(d => d.type === 'sprint' && d.status === 'available')

  const handleQuestStart = async (questId: string) => {
    // Optimistic update
    updateQuest(questId, { status: 'active', timer_started_at: new Date().toISOString() })
    setAllQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, status: 'active' as const, timer_started_at: new Date().toISOString() } : q
    ))

    try {
      const user = await supabase.auth.getUser()
      if (!user.data.user) return

      const res = await fetch('/api/quests/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, action: 'start', userId: user.data.user.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Le système a détecté une anomalie lors du démarrage')
      }
    } catch {
      toast.error('Le système a détecté une anomalie. Réessaie.')
    }
  }

  const handleQuestComplete = async (questId: string) => {
    const quest = allQuests.find(q => q.id === questId)
    // Optimistic update
    updateQuest(questId, { status: 'completed', completed_at: new Date().toISOString() })
    setAllQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, status: 'completed' as const, completed_at: new Date().toISOString() } : q
    ))

    try {
      const user = await supabase.auth.getUser()
      if (!user.data.user) return

      const res = await fetch('/api/quests/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, action: 'complete', userId: user.data.user.id }),
      })

      if (res.ok) {
        const data = await res.json()
        if (quest) toast.success(`Quête accomplie ! +${quest.xp_reward} XP`)
        if (data.level_up || data.rank_up) {
          triggerLevelUp({
            oldRank: data.old_rank,
            newRank: data.new_rank,
            oldLevel: userProfile?.global_level || 1,
            newLevel: (userProfile?.global_level || 1) + 1,
            xpGained: quest?.xp_reward || 0,
            titleUnlocked: data.new_titles?.[0],
          })
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Le système a détecté une anomalie')
        // Rollback
        updateQuest(questId, { status: 'active' as const })
        setAllQuests(prev => prev.map(q =>
          q.id === questId ? { ...q, status: 'active' as const } : q
        ))
      }
    } catch {
      toast.error('Le système a détecté une anomalie. Réessaie.')
    }
  }

  const handleQuestAbandon = async (questId: string) => {
    updateQuest(questId, { status: 'failed' as const })
    setAllQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, status: 'failed' as const } : q
    ))

    try {
      const user = await supabase.auth.getUser()
      if (!user.data.user) return
      await fetch('/api/quests/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId, action: 'abandon', userId: user.data.user.id }),
      })
    } catch {
      // Silencieux
    }
  }

  const handleGenerateQuests = async () => {
    if (!userProfile) return
    try {
      toast.loading('Génération des quêtes en cours...')
      const res = await fetch('/api/quests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.quests) setAllQuests(data.quests)
        toast.dismiss()
        toast.success('Nouvelles quêtes générées !')
      }
    } catch {
      toast.dismiss()
      toast.error('Le système a détecté une anomalie lors de la génération')
    }
  }

  const subjectMap = subjects.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, typeof subjects[0]>)

  // Skeleton loading
  if (isLoading && !isInitialized) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-white/5 rounded-xl w-1/3 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-20 bg-white/5 rounded-xl mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-mono text-sl-text-muted mb-1 tracking-widest uppercase">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
            </div>
            <h1 className="text-3xl font-black text-sl-text">
              Bienvenue,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {userProfile?.username || 'Chasseur'}
              </span>
            </h1>
            {userProfile?.active_title && (
              <div className="text-sm text-sl-text-muted mt-1">
                〖{userProfile.active_title}〗
              </div>
            )}
          </div>

          {/* Streak */}
          <StreakDisplay streakDays={userProfile?.streak_days || 0} />
        </div>
      </motion.div>

      {/* Stats en haut */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Rang Global', value: userProfile?.global_rank || 'E', icon: '⚔️', color: '#8b5cf6' },
          { label: 'Niveau', value: userProfile?.global_level || 1, icon: '📈', color: '#00d4ff' },
          { label: 'XP Total', value: `${(userProfile?.global_xp || 0).toLocaleString('fr-FR')}`, icon: '⭐', color: '#f59e0b' },
          { label: 'XP aujourd\'hui', value: `+${todayXP}`, icon: '🎯', color: '#10b981' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4"
            style={{
              background: `${stat.color}08`,
              border: `1px solid ${stat.color}20`,
            }}
          >
            <div className="text-lg mb-1">{stat.icon}</div>
            <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-sl-text-muted mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Barre XP Globale */}
      {userProfile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.9), rgba(15, 10, 30, 0.9))',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <RankBadge rank={userProfile.global_rank} size="lg" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sl-text">Rang {userProfile.global_rank} — Niv. {userProfile.global_level}</span>
                <span className="text-xs text-sl-text-muted">{userProfile.global_xp.toLocaleString('fr-FR')} XP</span>
              </div>
              <XPBar
                currentXp={userProfile.global_xp}
                rank={userProfile.global_rank}
                level={userProfile.global_level}
                showNumbers={true}
              />
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quêtes actives */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sword className="w-5 h-5 text-sl-blue" />
                <h2 className="font-bold text-sl-text">Quêtes du Jour</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sl-blue/10 text-sl-blue">{activeQuests.length}</span>
              </div>
              <Link href="/quetes" className="text-xs text-sl-text-muted hover:text-sl-blue flex items-center gap-1 transition-colors">
                Voir tout <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {loadingQuests ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
                ))
              ) : activeQuests.length > 0 ? (
                activeQuests.slice(0, 3).map((quest) => {
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
              ) : (
                <div className="text-center py-8 text-sl-text-muted">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="mb-4">Aucune quête active pour aujourd&apos;hui</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerateQuests}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white' }}
                  >
                    Générer des quêtes
                  </motion.button>
                </div>
              )}
            </div>
          </motion.section>

          {/* Boss actifs */}
          {bossDungeons.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💀</span>
                <h2 className="font-bold text-sl-text">Boss à venir</h2>
              </div>
              <div className="space-y-3">
                {bossDungeons.map((boss) => {
                  const subject = boss.subject_id ? subjectMap[boss.subject_id] : undefined
                  if (!boss.health_points || !boss.current_hp || !boss.exam_date) return null
                  return (
                    <BossHealthBar
                      key={boss.id}
                      currentHP={boss.current_hp}
                      maxHP={boss.health_points}
                      examDate={boss.exam_date}
                      examTitle={boss.title}
                      subjectName={subject?.name}
                    />
                  )
                })}
              </div>
            </motion.section>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-4">
          {/* Donjons */}
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2 mb-3">
              <Castle className="w-5 h-5 text-sl-red" />
              <h2 className="font-bold text-sl-text">Donjons</h2>
            </div>

            {sprintDungeons.length > 0 ? (
              sprintDungeons.slice(0, 2).map((dungeon) => (
                <Link key={dungeon.id} href="/donjons">
                  <motion.div
                    className="w-full text-left rounded-xl p-4 mb-2 cursor-pointer transition-all"
                    style={{
                      background: 'rgba(139, 92, 246, 0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                    whileHover={{ scale: 1.02, borderColor: 'rgba(139, 92, 246, 0.4)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)' }}>
                        {dungeon.rank}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-sl-text truncate">{dungeon.title}</div>
                        <div className="text-xs text-sl-text-muted">+{dungeon.xp_reward} XP</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-sl-text-muted" />
                    </div>
                  </motion.div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-sl-text-muted text-sm">
                <Castle className="w-6 h-6 mx-auto mb-2 opacity-30" />
                Aucun donjon disponible
              </div>
            )}

            <Link href="/donjons">
              <div className="text-xs text-center text-sl-text-muted hover:text-sl-blue transition-colors mt-1">
                Voir tous les donjons →
              </div>
            </Link>
          </motion.section>

          {/* Widget Sport */}
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-5 h-5 text-sl-green" />
              <h2 className="font-bold text-sl-text">Activité Physique</h2>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <Link href="/sport">
                <motion.div
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                  whileHover={{ background: 'rgba(16, 185, 129, 0.25)' }}
                >
                  <Dumbbell className="w-4 h-4" />
                  Nouvelle séance
                </motion.div>
              </Link>
            </div>
          </motion.section>

          {/* Révisions */}
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sl-purple" />
                <h2 className="font-bold text-sl-text">Révisions</h2>
              </div>
              <Link href="/quetes" className="text-xs text-sl-text-muted hover:text-sl-purple transition-colors">
                Voir tout →
              </Link>
            </div>

            {allQuests.filter(q => q.type === 'revision' && q.status === 'pending').slice(0, 3).map((quest) => {
              const subject = quest.subject_id ? subjectMap[quest.subject_id] : undefined
              return (
                <div
                  key={quest.id}
                  className="flex items-center gap-3 p-3 rounded-xl mb-1"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${subject?.color || '#8b5cf6'}15`, color: subject?.color || '#8b5cf6', border: `1px solid ${subject?.color || '#8b5cf6'}30` }}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sl-text text-xs truncate">{quest.title}</div>
                    <div className="text-xs text-sl-text-muted">{subject?.name || 'Révision'}</div>
                  </div>
                </div>
              )
            })}

            {allQuests.filter(q => q.type === 'revision' && q.status === 'pending').length === 0 && (
              <div className="text-xs text-sl-text-muted text-center py-2">Aucune révision en attente</div>
            )}
          </motion.section>

          {/* Stats rapides */}
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-sl-gold" />
              <h2 className="font-bold text-sl-text">Matières</h2>
            </div>

            <div className="space-y-2">
              {subjects.slice(0, 3).map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: `${subject.color}06`, border: `1px solid ${subject.color}20` }}
                >
                  <span className="text-lg">{subject.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-sl-text truncate">{subject.name}</div>
                    <div className="text-xs text-sl-text-muted">Rang {subject.rank} — Niv. {subject.level}</div>
                  </div>
                </div>
              ))}
              {subjects.length === 0 && (
                <div className="text-xs text-sl-text-muted text-center py-2">Aucune matière configurée</div>
              )}
            </div>
          </motion.section>
        </div>
      </div>

      {/* Bouton flottant si aucune quête */}
      {activeQuests.length === 0 && isInitialized && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGenerateQuests}
          className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full flex items-center justify-center z-20 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
            boxShadow: '0 0 20px rgba(109, 40, 217, 0.6)',
          }}
          title="Générer des quêtes"
        >
          <Zap className="w-6 h-6 text-white" />
        </motion.button>
      )}
    </div>
  )
}
