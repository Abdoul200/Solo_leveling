'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Castle, Plus, Sword, Clock, Star, Shield, Skull, CalendarDays, CheckCircle, Zap } from 'lucide-react'
import DungeonAlert from '@/components/ui/DungeonAlert'
import RankBadge from '@/components/ui/RankBadge'
import type { Dungeon, Subject, Rank } from '@/lib/types'
import { RANK_COLORS, getRankGradient } from '@/lib/ranks'
import { format, addDays, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/lib/store'

export default function DonjonPage() {
  const [dungeons, setDungeons] = useState<Dungeon[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [alertDungeon, setAlertDungeon] = useState<Dungeon | null>(null)
  const [showCreateBoss, setShowCreateBoss] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'available' | 'completed'>('active')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [spawning, setSpawning] = useState(false)
  const [submittingBoss, setSubmittingBoss] = useState(false)

  const { triggerDungeonAlert } = useGameStore()

  // Formulaire boss
  const [bossTitle, setBossTitle] = useState('')
  const [bossDesc, setBossDesc] = useState('')
  const [bossSubjectId, setBossSubjectId] = useState('')
  const [bossExamDate, setBossExamDate] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"))
  const [bossRank, setBossRank] = useState<Rank>('B')

  const fetchData = useCallback(async (uid: string) => {
    try {
      const [dungeonsRes, subjectsRes] = await Promise.all([
        supabase
          .from('dungeons')
          .select('*')
          .eq('user_id', uid)
          .order('spawned_at', { ascending: false }),
        supabase
          .from('subjects')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: true }),
      ])

      if (dungeonsRes.data) setDungeons(dungeonsRes.data as Dungeon[])
      if (subjectsRes.data) {
        setSubjects(subjectsRes.data as Subject[])
        if (subjectsRes.data.length > 0) {
          setBossSubjectId(subjectsRes.data[0].id)
        }
      }
    } catch {
      toast.error('Le système a détecté une anomalie lors du chargement des donjons.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (data.user) {
        setUserId(data.user.id)
        fetchData(data.user.id)
      }
    })
  }, [fetchData])

  const activeDungeons = dungeons.filter(d => d.status === 'active')
  const availableDungeons = dungeons.filter(d => d.status === 'available')
  const completedDungeons = dungeons.filter(d => d.status === 'completed')

  const bossDungeons = activeDungeons.filter(d => d.type === 'boss')
  const sprintDungeons = activeDungeons.filter(d => d.type === 'sprint')

  const handleCreateBoss = async () => {
    if (!bossTitle.trim()) {
      toast.error('Indique le nom de l\'examen')
      return
    }
    if (!userId) return

    setSubmittingBoss(true)
    try {
      const res = await fetch('/api/boss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          examName: bossTitle,
          subjectId: bossSubjectId || null,
          examDate: new Date(bossExamDate).toISOString(),
          rank: bossRank,
          description: bossDesc || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Le système a détecté une anomalie.')
        return
      }

      if (data.dungeon) {
        setDungeons(prev => [data.dungeon, ...prev])
        triggerDungeonAlert({ dungeon: data.dungeon })
      }

      setShowCreateBoss(false)
      setBossTitle('')
      setBossDesc('')
      toast.success('Boss d\'examen créé ! La bataille commence...')
    } catch {
      toast.error('Le système a détecté une anomalie.')
    } finally {
      setSubmittingBoss(false)
    }
  }

  const enterDungeon = async (dungeonId: string) => {
    if (!userId) return
    setDungeons(prev => prev.map(d =>
      d.id === dungeonId ? { ...d, status: 'active' as const } : d
    ))
    setAlertDungeon(null)

    try {
      await supabase
        .from('dungeons')
        .update({ status: 'active' })
        .eq('id', dungeonId)
        .eq('user_id', userId)
      toast.success('Tu es entré dans le donjon !')
    } catch {
      toast.error('Le système a détecté une anomalie.')
      fetchData(userId)
    }
  }

  const completeDungeon = async (dungeonId: string) => {
    if (!userId) return
    try {
      const res = await fetch('/api/dungeons/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dungeonId, userId }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Le système a détecté une anomalie.')
        return
      }

      setDungeons(prev => prev.map(d =>
        d.id === dungeonId ? { ...d, status: 'completed' as const, completed_at: new Date().toISOString() } : d
      ))
      toast.success(`Donjon conquis ! +${data.xp_earned} XP`)
    } catch {
      toast.error('Le système a détecté une anomalie.')
    }
  }

  const handleSpawnRandom = async () => {
    if (!userId) return
    setSpawning(true)
    try {
      const res = await fetch('/api/dungeons/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type: 'manual', force: true }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Le système a détecté une anomalie.')
        return
      }

      if (data.spawned && data.dungeon) {
        setDungeons(prev => [data.dungeon, ...prev])
        triggerDungeonAlert({ dungeon: data.dungeon })
        toast.success(`Donjon de Rang ${data.dungeon.rank} apparu !`)
      } else {
        toast('Aucun donjon généré. Réessaie plus tard.')
      }
    } catch {
      toast.error('Le système a détecté une anomalie.')
    } finally {
      setSpawning(false)
    }
  }

  const subjectMap = subjects.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, Subject>)

  const tabs = [
    { key: 'active' as const, label: 'Actifs', count: activeDungeons.length, icon: Sword },
    { key: 'available' as const, label: 'Disponibles', count: availableDungeons.length, icon: Castle },
    { key: 'completed' as const, label: 'Complétés', count: completedDungeons.length, icon: CheckCircle },
  ]

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-32 bg-white/5 animate-pulse rounded-lg mb-2" />
          <div className="h-4 w-56 bg-white/5 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <DungeonAlert
        dungeon={alertDungeon}
        onEnter={enterDungeon}
        onDismiss={() => setAlertDungeon(null)}
        subjectName={alertDungeon?.subject_id ? subjectMap[alertDungeon.subject_id]?.name : undefined}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-sl-text mb-1">Donjons</h1>
          <p className="text-sm text-sl-text-muted">Conquiers les épreuves du système</p>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSpawnRandom}
            disabled={spawning}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' }}
          >
            <Zap className={`w-4 h-4 ${spawning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Spawn</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateBoss(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #7f1d1d, #ef4444)', color: 'white', boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)' }}
          >
            <Skull className="w-4 h-4" />
            Annoncer un examen
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Boss actifs', value: bossDungeons.length, color: '#ef4444', icon: '💀' },
          { label: 'En cours', value: sprintDungeons.length, color: '#8b5cf6', icon: '⚔️' },
          { label: 'Complétés', value: completedDungeons.length, color: '#10b981', icon: '🏆' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-3 text-center"
            style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}>
            <div className="text-lg mb-1">{stat.icon}</div>
            <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-sl-text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.key ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255,255,255,0.04)',
                color: activeTab === tab.key ? '#00d4ff' : '#94a3b8',
                border: activeTab === tab.key ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className="text-xs opacity-70">({tab.count})</span>
            </button>
          )
        })}
      </div>

      {/* Contenu par onglet */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {/* Boss */}
          {bossDungeons.map((dungeon) => {
            const subject = dungeon.subject_id ? subjectMap[dungeon.subject_id] : null
            const rankColor = RANK_COLORS[dungeon.rank]
            const daysLeft = dungeon.exam_date
              ? differenceInDays(new Date(dungeon.exam_date), new Date())
              : null
            const hpPercent = dungeon.health_points
              ? ((dungeon.current_hp || 0) / dungeon.health_points) * 100
              : 0

            return (
              <motion.div
                key={dungeon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-5 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 10, 10, 0.95), rgba(20, 5, 5, 0.98))',
                  border: `2px solid ${rankColor}40`,
                  boxShadow: `0 0 30px ${rankColor}15`,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                  >
                    <Skull className="w-3.5 h-3.5" />
                    BOSS ACTIF
                  </motion.div>
                  <RankBadge rank={dungeon.rank} size="sm" />
                  {daysLeft !== null && (
                    <span className="ml-auto text-xs font-medium" style={{ color: daysLeft <= 7 ? '#ef4444' : '#94a3b8' }}>
                      {daysLeft <= 0 ? '⚠️ AUJOURD\'HUI !' : `J-${daysLeft}`}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black text-sl-text mb-1">{dungeon.title}</h3>
                {subject && (
                  <span className="text-xs px-2 py-0.5 rounded font-medium mb-3 inline-block"
                    style={{ background: `${subject.color}20`, color: subject.color }}>
                    {subject.icon} {subject.name}
                  </span>
                )}

                <p className="text-sm text-sl-text-muted mb-4">{dungeon.description}</p>

                {/* Barre de vie */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-sl-text-muted font-medium">❤️ Points de Vie</span>
                    <span style={{ color: rankColor }}>{dungeon.current_hp}/{dungeon.health_points} PV</span>
                  </div>
                  <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        width: `${hpPercent}%`,
                        background: `linear-gradient(90deg, #dc2626, ${rankColor})`,
                      }}
                      animate={{ opacity: [1, 0.8, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mt-4">
                  {dungeon.exam_date && (
                    <div className="flex items-center gap-1.5 text-sl-text-muted">
                      <CalendarDays className="w-4 h-4" />
                      Examen le {format(new Date(dungeon.exam_date), "dd MMMM yyyy", { locale: fr })}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 ml-auto" style={{ color: rankColor }}>
                    <Star className="w-4 h-4" />
                    <span className="font-bold">+{dungeon.xp_reward} XP</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => completeDungeon(dungeon.id)}
                  className="w-full mt-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${rankColor}30, ${rankColor}50)`,
                    color: 'white',
                    border: `1px solid ${rankColor}50`,
                  }}
                >
                  <Sword className="w-4 h-4" />
                  Attaquer le Boss
                </motion.button>
              </motion.div>
            )
          })}

          {/* Sprints actifs */}
          {sprintDungeons.map((dungeon) => {
            const subject = dungeon.subject_id ? subjectMap[dungeon.subject_id] : null
            const rankColor = RANK_COLORS[dungeon.rank]

            return (
              <motion.div
                key={dungeon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4"
                style={{
                  background: `${rankColor}05`,
                  border: `1px solid ${rankColor}30`,
                }}
              >
                <div className="flex items-start gap-3">
                  <RankBadge rank={dungeon.rank} size="md" />
                  <div className="flex-1">
                    <h3 className="font-bold text-sl-text mb-1">{dungeon.title}</h3>
                    {subject && (
                      <span className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ background: `${subject.color}15`, color: subject.color }}>
                        {subject.icon} {subject.name}
                      </span>
                    )}
                    <p className="text-sm text-sl-text-muted mt-2">{dungeon.description}</p>

                    <div className="flex items-center gap-4 mt-3 text-sm">
                      {dungeon.time_limit_minutes && (
                        <div className="flex items-center gap-1.5 text-sl-text-muted">
                          <Clock className="w-3.5 h-3.5" />
                          {dungeon.time_limit_minutes}min
                        </div>
                      )}
                      <div className="flex items-center gap-1.5" style={{ color: rankColor }}>
                        <Star className="w-3.5 h-3.5" />
                        +{dungeon.xp_reward} XP
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => completeDungeon(dungeon.id)}
                      className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ background: `${rankColor}20`, color: rankColor, border: `1px solid ${rankColor}30` }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Terminer le donjon
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}

          {activeDungeons.length === 0 && (
            <div className="text-center py-12 text-sl-text-muted">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Aucun donjon actif</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'available' && (
        <div className="space-y-4">
          {availableDungeons.map((dungeon) => {
            const subject = dungeon.subject_id ? subjectMap[dungeon.subject_id] : null
            const rankColor = RANK_COLORS[dungeon.rank]

            return (
              <motion.div
                key={dungeon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 cursor-pointer"
                style={{
                  background: `${rankColor}05`,
                  border: `1px solid ${rankColor}20`,
                }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setAlertDungeon(dungeon)}
              >
                <div className="flex items-center gap-3">
                  <RankBadge rank={dungeon.rank} size="md" />
                  <div className="flex-1">
                    <h3 className="font-bold text-sl-text">{dungeon.title}</h3>
                    {subject && (
                      <span className="text-xs" style={{ color: subject.color }}>{subject.icon} {subject.name}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm" style={{ color: rankColor }}>+{dungeon.xp_reward} XP</div>
                    <div className="text-xs text-sl-text-muted">{dungeon.time_limit_minutes}min</div>
                  </div>
                </div>
              </motion.div>
            )
          })}

          {availableDungeons.length === 0 && (
            <div className="text-center py-12 text-sl-text-muted">
              <Castle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Aucun donjon disponible</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSpawnRandom}
                disabled={spawning}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #4c1d95, #8b5cf6)', color: 'white' }}
              >
                Invoquer un donjon
              </motion.button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="space-y-3">
          {completedDungeons.map((dungeon) => {
            const rankColor = RANK_COLORS[dungeon.rank]
            return (
              <motion.div
                key={dungeon.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl p-4 opacity-60"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 flex-shrink-0 text-sl-green" />
                  <div className="flex-1">
                    <h3 className="font-medium text-sl-text">{dungeon.title}</h3>
                    <div className="text-xs text-sl-text-muted mt-0.5">
                      Terminé le {dungeon.completed_at && format(new Date(dungeon.completed_at), "dd MMM yyyy", { locale: fr })}
                    </div>
                  </div>
                  <div className="font-bold text-sm" style={{ color: rankColor }}>+{dungeon.xp_reward} XP</div>
                </div>
              </motion.div>
            )
          })}

          {completedDungeons.length === 0 && (
            <div className="text-center py-12 text-sl-text-muted">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Aucun donjon complété pour l&apos;instant</p>
            </div>
          )}
        </div>
      )}

      {/* Modal créer boss */}
      <AnimatePresence>
        {showCreateBoss && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setShowCreateBoss(false)} />
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50 p-4"
            >
              <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden" style={{ background: '#0f0f1a', border: '1px solid rgba(239, 68, 68, 0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Skull className="w-6 h-6 text-sl-red" />
                    <div>
                      <h2 className="text-lg font-bold text-sl-text">Annoncer un examen</h2>
                      <p className="text-xs text-sl-text-muted">Un boss sera créé et son PV diminuera avec tes révisions</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-sl-text-muted mb-2 uppercase tracking-wider">Nom de l&apos;examen</label>
                      <input type="text" value={bossTitle} onChange={(e) => setBossTitle(e.target.value)}
                        placeholder="Ex: Examen Final Analyse" className="w-full py-3 px-4 rounded-lg text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#e2e8f0' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-sl-text-muted mb-2 uppercase tracking-wider">Description (optionnel)</label>
                      <textarea value={bossDesc} onChange={(e) => setBossDesc(e.target.value)}
                        placeholder="Détails de l'examen..." rows={2}
                        className="w-full py-3 px-4 rounded-lg text-sm outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#e2e8f0' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-sl-text-muted mb-2 uppercase tracking-wider">Matière</label>
                      <div className="flex gap-2 flex-wrap">
                        {subjects.map((s) => (
                          <button key={s.id} type="button" onClick={() => setBossSubjectId(s.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                            style={{ background: bossSubjectId === s.id ? `${s.color}20` : 'rgba(255,255,255,0.04)', border: bossSubjectId === s.id ? `1px solid ${s.color}` : '1px solid rgba(255,255,255,0.08)', color: bossSubjectId === s.id ? s.color : '#94a3b8' }}>
                            {s.icon} {s.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-sl-text-muted mb-2 uppercase tracking-wider">Date de l&apos;examen</label>
                      <input type="date" value={bossExamDate} onChange={(e) => setBossExamDate(e.target.value)}
                        className="w-full py-3 px-4 rounded-lg text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#e2e8f0', colorScheme: 'dark' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'} />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-sl-text-muted mb-2 uppercase tracking-wider">Rang du Boss</label>
                      <div className="flex gap-2">
                        {(['C', 'B', 'A', 'S'] as Rank[]).map((rank) => (
                          <button key={rank} type="button" onClick={() => setBossRank(rank)}
                            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                            style={{
                              background: bossRank === rank ? getRankGradient(rank) : 'rgba(255,255,255,0.04)',
                              color: 'white',
                              border: bossRank === rank ? `1px solid ${RANK_COLORS[rank]}` : '1px solid rgba(255,255,255,0.08)',
                            }}>
                            {rank}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowCreateBoss(false)} className="flex-1 py-3 rounded-xl font-semibold text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                        Annuler
                      </button>
                      <motion.button whileHover={{ scale: submittingBoss ? 1 : 1.02 }} whileTap={{ scale: submittingBoss ? 1 : 0.98 }}
                        onClick={handleCreateBoss}
                        disabled={submittingBoss}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                        style={{ background: 'linear-gradient(135deg, #7f1d1d, #ef4444)', color: 'white', boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)' }}>
                        {submittingBoss ? (
                          <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                        ) : (
                          <>
                            <Skull className="w-4 h-4" />
                            Invoquer le Boss
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
