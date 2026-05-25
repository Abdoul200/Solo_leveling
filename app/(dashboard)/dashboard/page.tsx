'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Star, Sword, Castle, Dumbbell, BookOpen, ChevronRight, Clock, Zap, TrendingUp } from 'lucide-react'
import RankBadge from '@/components/ui/RankBadge'
import XPBar from '@/components/ui/XPBar'
import QuestCard from '@/components/ui/QuestCard'
import LevelUpModal from '@/components/ui/LevelUpModal'
import DungeonAlert from '@/components/ui/DungeonAlert'
import Link from 'next/link'
import type { Quest, Dungeon } from '@/lib/types'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

// Données mock pour la démo
const MOCK_USER = {
  username: 'ShadowHunter',
  global_rank: 'C' as const,
  global_xp: 1850,
  global_level: 8,
  streak_days: 12,
  active_title: 'Chasseur Confirmé',
  aura_type: 'shadow',
}

const MOCK_QUESTS: Quest[] = [
  {
    id: '1',
    user_id: 'user1',
    subject_id: 'math',
    title: 'Révision Algèbre Linéaire',
    description: 'Revoir les notions de matrices, déterminants et systèmes linéaires du cours du 22 mai.',
    type: 'revision',
    status: 'pending',
    xp_reward: 120,
    min_duration_minutes: 25,
    time_spent_minutes: 0,
    timer_started_at: null,
    due_date: new Date(Date.now() + 3600000 * 4).toISOString(),
    completed_at: null,
    course_entry_id: 'course1',
    ai_generated: true,
  },
  {
    id: '2',
    user_id: 'user1',
    subject_id: null,
    title: 'Séance de révision quotidienne',
    description: 'Consacre 20 minutes à revoir tes notes du jour et préparer demain.',
    type: 'daily',
    status: 'active',
    xp_reward: 60,
    min_duration_minutes: 20,
    time_spent_minutes: 5,
    timer_started_at: new Date(Date.now() - 300000).toISOString(),
    due_date: new Date(Date.now() + 3600000 * 8).toISOString(),
    completed_at: null,
    course_entry_id: null,
    ai_generated: false,
  },
  {
    id: '3',
    user_id: 'user1',
    subject_id: 'phys',
    title: 'Thermodynamique — J+3',
    description: 'Révision du cours de thermodynamique étudié il y a 3 jours.',
    type: 'revision',
    status: 'pending',
    xp_reward: 100,
    min_duration_minutes: 20,
    time_spent_minutes: 0,
    timer_started_at: null,
    due_date: new Date(Date.now() + 3600000 * 6).toISOString(),
    completed_at: null,
    course_entry_id: 'course2',
    ai_generated: false,
  },
]

const MOCK_DUNGEON: Dungeon = {
  id: 'd1',
  user_id: 'user1',
  subject_id: 'math',
  title: 'Donjon de l\'Algèbre Sombre',
  description: 'Affronte 3 séances intensives de mathématiques pour débloquer la maîtrise du rang B.',
  type: 'sprint',
  rank: 'C',
  status: 'available',
  spawn_type: 'random',
  xp_reward: 350,
  time_limit_minutes: 90,
  health_points: null,
  current_hp: null,
  exam_date: null,
  rewards: ['+350 XP', 'Titre: Maître du Calcul', 'Badge Algèbre'],
  spawned_at: new Date().toISOString(),
  completed_at: null,
}

const UPCOMING_REVIEWS = [
  { id: '1', title: 'Algèbre Linéaire', subject: 'Mathématiques', color: '#00d4ff', dueDate: addDays(new Date(), 1), type: 'J+1' },
  { id: '2', title: 'Thermodynamique', subject: 'Physique', color: '#8b5cf6', dueDate: addDays(new Date(), 1), type: 'J+1' },
  { id: '3', title: 'Droit des Contrats', subject: 'Droit', color: '#f59e0b', dueDate: addDays(new Date(), 3), type: 'J+3' },
  { id: '4', title: 'Microéconomie', subject: 'Économie', color: '#10b981', dueDate: addDays(new Date(), 7), type: 'J+7' },
]

const BOSS_DUNGEON: Dungeon = {
  id: 'boss1',
  user_id: 'user1',
  subject_id: 'math',
  title: 'BOSS : Examen Final de Maths',
  description: 'L\'examen final approche. Le boss attend dans son antre...',
  type: 'boss',
  rank: 'A',
  status: 'active',
  spawn_type: 'boss',
  xp_reward: 800,
  time_limit_minutes: null,
  health_points: 100,
  current_hp: 65,
  exam_date: addDays(new Date(), 12).toISOString(),
  rewards: ['+800 XP', 'Titre: Vainqueur de l\'Examen', 'Rang A débloqué'],
  spawned_at: new Date().toISOString(),
  completed_at: null,
}

export default function DashboardPage() {
  const [showDungeonAlert, setShowDungeonAlert] = useState(false)
  const [alertDungeon, setAlertDungeon] = useState<Dungeon | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [quests, setQuests] = useState<Quest[]>(MOCK_QUESTS)

  const activeQuests = quests.filter(q => q.status === 'pending' || q.status === 'active')
  const completedToday = quests.filter(q => q.status === 'completed')
  const todayXP = completedToday.reduce((sum, q) => sum + q.xp_reward, 0)

  const bossHpPercent = BOSS_DUNGEON.health_points
    ? ((BOSS_DUNGEON.current_hp || 0) / BOSS_DUNGEON.health_points) * 100
    : 0

  const handleQuestStart = (questId: string) => {
    setQuests(prev => prev.map(q =>
      q.id === questId
        ? { ...q, status: 'active' as const, timer_started_at: new Date().toISOString() }
        : q
    ))
  }

  const handleQuestComplete = (questId: string) => {
    setQuests(prev => prev.map(q =>
      q.id === questId
        ? { ...q, status: 'completed' as const, completed_at: new Date().toISOString() }
        : q
    ))
    setShowLevelUp(true)
  }

  const handleQuestAbandon = (questId: string) => {
    setQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, status: 'failed' as const } : q
    ))
  }

  const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const today = new Date().getDay()

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Alertes */}
      <DungeonAlert
        dungeon={alertDungeon}
        onEnter={(id) => { setAlertDungeon(null) }}
        onDismiss={() => setAlertDungeon(null)}
        subjectName="Mathématiques"
      />
      <LevelUpModal
        show={showLevelUp}
        newLevel={9}
        xpGained={120}
        onClose={() => setShowLevelUp(false)}
      />

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
                {MOCK_USER.username}
              </span>
            </h1>
            {MOCK_USER.active_title && (
              <div className="text-sm text-sl-text-muted mt-1">
                〖{MOCK_USER.active_title}〗
              </div>
            )}
          </div>

          {/* Streak */}
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
            animate={{
              boxShadow: ['0 0 10px rgba(245, 158, 11, 0.2)', '0 0 20px rgba(245, 158, 11, 0.3)', '0 0 10px rgba(245, 158, 11, 0.2)'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Flame className="w-5 h-5 text-sl-gold" />
            <div>
              <div className="text-xl font-black text-sl-gold">{MOCK_USER.streak_days}</div>
              <div className="text-xs text-sl-text-muted">jours</div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats en haut */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Rang Global', value: MOCK_USER.global_rank, icon: '⚔️', color: '#8b5cf6' },
          { label: 'Niveau', value: MOCK_USER.global_level, icon: '📈', color: '#00d4ff' },
          { label: 'XP Total', value: `${MOCK_USER.global_xp.toLocaleString('fr-FR')}`, icon: '⭐', color: '#f59e0b' },
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
          <RankBadge rank={MOCK_USER.global_rank} size="lg" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sl-text">Rang {MOCK_USER.global_rank} — Niv. {MOCK_USER.global_level}</span>
              <span className="text-xs text-sl-text-muted">{MOCK_USER.global_xp.toLocaleString('fr-FR')} XP</span>
            </div>
            <XPBar
              currentXp={MOCK_USER.global_xp}
              rank={MOCK_USER.global_rank}
              level={MOCK_USER.global_level}
              showNumbers={true}
            />
          </div>
        </div>
      </motion.div>

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
              {activeQuests.slice(0, 3).map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onStart={handleQuestStart}
                  onComplete={handleQuestComplete}
                  onAbandon={handleQuestAbandon}
                  subjectName={quest.subject_id === 'math' ? 'Mathématiques' : quest.subject_id === 'phys' ? 'Physique' : undefined}
                  subjectColor={quest.subject_id === 'math' ? '#00d4ff' : '#8b5cf6'}
                />
              ))}

              {activeQuests.length === 0 && (
                <div className="text-center py-8 text-sl-text-muted">
                  <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Toutes les quêtes du jour sont terminées !</p>
                </div>
              )}
            </div>
          </motion.section>

          {/* Prochaines révisions */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sl-purple" />
                <h2 className="font-bold text-sl-text">Révisions à venir</h2>
              </div>
              <Link href="/quetes" className="text-xs text-sl-text-muted hover:text-sl-purple flex items-center gap-1 transition-colors">
                Voir tout <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {UPCOMING_REVIEWS.map((review) => (
                <motion.div
                  key={review.id}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg font-bold"
                    style={{ background: `${review.color}15`, color: review.color, border: `1px solid ${review.color}30` }}>
                    {review.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sl-text text-sm truncate">{review.title}</div>
                    <div className="text-xs text-sl-text-muted">{review.subject}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium" style={{ color: review.color }}>
                      {format(review.dueDate, "d MMM", { locale: fr })}
                    </div>
                    <Clock className="w-3 h-3 ml-auto mt-0.5 text-sl-text-muted" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-4">
          {/* Séance rapide - Donjon */}
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center gap-2 mb-3">
              <Castle className="w-5 h-5 text-sl-red" />
              <h2 className="font-bold text-sl-text">Donjons</h2>
            </div>

            {/* Boss actif */}
            <motion.div
              className="rounded-xl p-4 mb-3 cursor-pointer"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
              whileHover={{ scale: 1.02 }}
              animate={{ borderColor: ['rgba(239, 68, 68, 0.25)', 'rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0.25)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-sl-red uppercase tracking-wider">💀 BOSS ACTIF</span>
                <span className="text-xs text-sl-text-muted">
                  {BOSS_DUNGEON.exam_date && `Dans ${Math.ceil((new Date(BOSS_DUNGEON.exam_date).getTime() - Date.now()) / 86400000)} jours`}
                </span>
              </div>
              <div className="text-sm font-bold text-sl-text mb-2 truncate">{BOSS_DUNGEON.title}</div>

              {/* Barre de vie du boss */}
              <div className="mb-1">
                <div className="flex justify-between text-xs text-sl-text-muted mb-1">
                  <span>PV Boss</span>
                  <span>{BOSS_DUNGEON.current_hp}/{BOSS_DUNGEON.health_points}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #ef4444, #dc2626)', width: `${bossHpPercent}%` }}
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Donjon disponible */}
            <motion.button
              onClick={() => { setAlertDungeon(MOCK_DUNGEON); setShowDungeonAlert(true) }}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
              whileHover={{ scale: 1.02, borderColor: 'rgba(139, 92, 246, 0.4)' }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)' }}>
                  C
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-sl-text">Donjon Rang C disponible</div>
                  <div className="text-xs text-sl-text-muted">+350 XP — Tap pour entrer</div>
                </div>
                <ChevronRight className="w-4 h-4 text-sl-text-muted" />
              </div>
            </motion.button>
          </motion.section>

          {/* Widget Sport */}
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="w-5 h-5 text-sl-green" />
              <h2 className="font-bold text-sl-text">Activité Physique</h2>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <div className="flex justify-between text-xs text-sl-text-muted mb-3">
                {daysOfWeek.map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{
                        background: i === today ? 'rgba(16, 185, 129, 0.3)' : i < today ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: i === today ? '1px solid rgba(16, 185, 129, 0.6)' : 'none',
                        color: i <= today ? '#10b981' : '#475569',
                      }}
                    >
                      {i <= today ? '✓' : ''}
                    </div>
                    <span style={{ color: i === today ? '#10b981' : '#475569' }}>{day}</span>
                  </div>
                ))}
              </div>

              <Link href="/sport">
                <motion.div
                  className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold mt-2"
                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                  whileHover={{ background: 'rgba(16, 185, 129, 0.25)' }}
                >
                  <Dumbbell className="w-4 h-4" />
                  Nouvelle séance
                </motion.div>
              </Link>
            </div>
          </motion.section>

          {/* Stats rapides */}
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-sl-gold" />
              <h2 className="font-bold text-sl-text">Cette semaine</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Quêtes terminées', value: 14, icon: '⚔️', color: '#00d4ff' },
                { label: 'Heures étudiées', value: '6h 40', icon: '📚', color: '#8b5cf6' },
                { label: 'Révisions faites', value: 8, icon: '🔄', color: '#f59e0b' },
                { label: 'XP gagnés', value: '1,250', icon: '⭐', color: '#10b981' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 text-center"
                  style={{ background: `${stat.color}08`, border: `1px solid ${stat.color}20` }}
                >
                  <div className="text-lg">{stat.icon}</div>
                  <div className="font-black text-lg" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs text-sl-text-muted leading-tight mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
