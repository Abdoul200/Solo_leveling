'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Edit3, TrendingUp, Trophy, Calendar, Clock, Sword, Star, Shield, X } from 'lucide-react'
import RankBadge from '@/components/ui/RankBadge'
import XPBar from '@/components/ui/XPBar'
import { SubjectXPBar } from '@/components/ui/XPBar'
import AuraEffect from '@/components/ui/AuraEffect'
import StreakDisplay from '@/components/ui/StreakDisplay'
import { PRESET_BANNERS, AURA_CONFIGS, AVAILABLE_TITLES } from '@/lib/constants'
import { RANK_COLORS, getRankDescription } from '@/lib/ranks'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/lib/store'
import toast from 'react-hot-toast'

type RecentExploit = {
  title: string
  type: string
  date: string
  xp: number
}

type Stats = {
  hoursStudied: number
  questsCompleted: number
  dungeonsCleared: number
  bossDefeated: number
}

type EditTab = 'avatar' | 'aura' | 'banniere' | 'titre'

export default function ProfilPage() {
  const { userProfile, subjects } = useGameStore()
  const [stats, setStats] = useState<Stats>({
    hoursStudied: 0,
    questsCompleted: 0,
    dungeonsCleared: 0,
    bossDefeated: 0,
  })
  const [recentExploits, setRecentExploits] = useState<RecentExploit[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTab, setEditTab] = useState<EditTab>('avatar')
  const [loading, setLoading] = useState(!!userProfile)

  useEffect(() => {
    if (!userProfile) return
    const fetchStats = async () => {
      const [questsRes, dungeonsRes] = await Promise.all([
        supabase
          .from('quests')
          .select('xp_reward, time_spent_minutes, completed_at, title, type')
          .eq('user_id', userProfile.id)
          .eq('status', 'completed'),
        supabase
          .from('dungeons')
          .select('xp_reward, completed_at, title, type')
          .eq('user_id', userProfile.id)
          .eq('status', 'completed'),
      ])

      const quests: Array<{ xp_reward: number; time_spent_minutes?: number; completed_at: string; title: string; type: string }> = questsRes.data || []
      const dungeons: Array<{ xp_reward: number; completed_at: string; title: string; type: string }> = dungeonsRes.data || []

      const totalMinutes = quests.reduce((s, q) => s + (q.time_spent_minutes || 0), 0)

      setStats({
        hoursStudied: Math.round(totalMinutes / 60),
        questsCompleted: quests.length,
        dungeonsCleared: dungeons.filter((d) => d.type === 'sprint').length,
        bossDefeated: dungeons.filter((d) => d.type === 'boss').length,
      })

      const allExploits: RecentExploit[] = [
        ...quests.map((q) => ({ title: q.title, type: 'quête', date: q.completed_at, xp: q.xp_reward })),
        ...dungeons.map((d) => ({ title: d.title, type: d.type === 'boss' ? 'boss vaincu' : 'donjon', date: d.completed_at, xp: d.xp_reward })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)

      setRecentExploits(allExploits)
      setLoading(false)
    }
    fetchStats()
  }, [userProfile])

  const handleEquipTitle = async (titleName: string) => {
    if (!userProfile) return
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, active_title: titleName }),
      })
      toast.success(`Titre "${titleName}" équipé !`)
      setShowEditModal(false)
    } catch {
      toast.error('Le système a détecté une anomalie.')
    }
  }

  // Skeleton pendant le chargement
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-48 bg-white/5 rounded-none" />
        <div className="px-4 lg:px-8 pb-8">
          <div className="flex items-end gap-4 -mt-12 mb-6">
            <div className="w-24 h-24 rounded-full bg-white/5 flex-shrink-0" />
            <div className="pb-2 flex-1">
              <div className="h-6 bg-white/5 rounded w-40 mb-2" />
              <div className="h-4 bg-white/5 rounded w-24" />
            </div>
          </div>
          <div className="h-40 bg-white/5 rounded-xl mb-6" />
          <div className="h-32 bg-white/5 rounded-xl mb-6" />
          <div className="h-48 bg-white/5 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-sl-text-muted">
        <p>Profil non disponible. Veuillez vous connecter.</p>
      </div>
    )
  }

  const aura = AURA_CONFIGS.find((a) => a.type === userProfile.aura_type)
  const banner = PRESET_BANNERS.find((b) => b.id === userProfile.banner_url)
  const rankColor = RANK_COLORS[userProfile.global_rank]
  const unlockedTitles = userProfile.titles_unlocked || []

  const exploitTypeIcon = (type: string) => {
    if (type === 'boss vaincu') return '💀'
    if (type === 'donjon') return '🏰'
    return '⚔️'
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Bannière */}
      <div
        className="relative h-40 lg:h-48 overflow-hidden"
        style={{
          background: userProfile.banner_url
            ? banner?.gradient || 'linear-gradient(135deg, #0a0a0f, #1a0a2e)'
            : 'linear-gradient(135deg, #0a0a0f, #1a0a2e)',
        }}
      >
        {/* Effet scanline */}
        <motion.div
          className="absolute left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)' }}
          animate={{ top: ['-2px', '102%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />

        {/* Bouton modifier */}
        <button
          onClick={() => setShowEditModal(true)}
          className="absolute top-3 right-3 p-2 rounded-lg transition-all hover:bg-white/10"
          style={{ background: 'rgba(0,0,0,0.5)', color: '#94a3b8' }}
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {/* Overlay gradient en bas */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #0a0a0f, transparent)' }}
        />
      </div>

      <div className="px-4 lg:px-8 pb-8">
        {/* Avatar et infos principales */}
        <div className="flex items-end gap-4 -mt-12 mb-6 relative z-10">
          {/* Avatar avec aura */}
          <div className="relative flex-shrink-0">
            <div className="relative w-24 h-24">
              <AuraEffect type={userProfile.aura_type} size="lg" />
              <motion.div
                className="absolute inset-0 rounded-full flex items-center justify-center text-4xl"
                style={{
                  background: 'linear-gradient(135deg, #0f0f1a, #1a0a2e)',
                  border: `3px solid ${aura?.color || rankColor}`,
                  boxShadow: `0 0 20px ${aura?.glowColor || rankColor}`,
                }}
                animate={{
                  boxShadow: [
                    `0 0 20px ${aura?.glowColor || rankColor}`,
                    `0 0 35px ${aura?.glowColor || rankColor}`,
                    `0 0 20px ${aura?.glowColor || rankColor}`,
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {userProfile.avatar_url || '👤'}
              </motion.div>
            </div>

            {/* Badge de rang */}
            <div className="absolute -bottom-2 -right-2">
              <RankBadge rank={userProfile.global_rank} size="sm" />
            </div>
          </div>

          {/* Nom et titre */}
          <div className="pb-2">
            <h1 className="text-2xl font-black text-sl-text">{userProfile.username}</h1>
            {userProfile.active_title && (
              <div className="text-sm font-medium mt-0.5" style={{ color: rankColor }}>
                〖{userProfile.active_title}〗
              </div>
            )}
            <div className="text-xs text-sl-text-muted mt-0.5">
              {aura?.name || 'Aura inconnue'} · Membre depuis{' '}
              {new Date(userProfile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Carte de chasseur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.95), rgba(15, 10, 30, 0.98))',
            border: `1px solid ${rankColor}30`,
            boxShadow: `0 0 20px ${rankColor}10`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-mono text-sl-text-muted tracking-widest uppercase">Carte de Chasseur</div>
            <div className="text-xs font-mono text-sl-text-muted">ID: #{userProfile.username.toUpperCase()}</div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <RankBadge rank={userProfile.global_rank} size="xl" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sl-text">
                  Rang {userProfile.global_rank} — Niv. {userProfile.global_level}
                </span>
              </div>
              <XPBar currentXp={userProfile.global_xp} rank={userProfile.global_rank} showNumbers />
              <div className="text-xs text-sl-text-muted mt-1 italic">
                {getRankDescription(userProfile.global_rank)}
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-3 mb-4">
            <StreakDisplay streakDays={userProfile.streak_days} />
            <div className="text-xs text-sl-text-muted">
              Membre depuis{' '}
              {new Date(userProfile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Stats en grille */}
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/5">
            {[
              { label: 'XP Total', value: userProfile.global_xp.toLocaleString('fr-FR'), icon: '⭐', color: rankColor },
              { label: 'Série', value: `${userProfile.streak_days}j`, icon: '🔥', color: '#f59e0b' },
              { label: 'Titres', value: unlockedTitles.length, icon: '🏆', color: '#8b5cf6' },
              { label: 'Compétences', value: (userProfile.skills_unlocked || []).length, icon: '✨', color: '#10b981' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg">{stat.icon}</div>
                <div className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-sl-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats de progression */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <h2 className="font-bold text-sl-text mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-sl-gold" />
            Statistiques globales
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Heures étudiées', value: `${stats.hoursStudied}h`, icon: Clock, color: '#00d4ff' },
              { label: 'Quêtes complétées', value: stats.questsCompleted, icon: Sword, color: '#8b5cf6' },
              { label: 'Donjons conquis', value: stats.dungeonsCleared, icon: Shield, color: '#10b981' },
              { label: 'Boss vaincus', value: stats.bossDefeated, icon: Trophy, color: '#ef4444' },
            ].map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.label}
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" style={{ color: s.color }} />
                  <div>
                    <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-sl-text-muted">{s.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Rangs par matière */}
        {subjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h2 className="font-bold text-sl-text mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sl-blue" />
              Progression par matière
            </h2>
            <div className="space-y-3">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="rounded-xl p-4"
                  style={{
                    background: `${subject.color}06`,
                    border: `1px solid ${subject.color}20`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{subject.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sl-text text-sm">{subject.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-sl-text-muted">Niv. {subject.level}</span>
                          <RankBadge rank={subject.rank} size="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <SubjectXPBar currentXp={subject.xp} rank={subject.rank} color={subject.color} />
                  <div className="flex justify-between text-xs text-sl-text-muted mt-1">
                    <span>{subject.xp.toLocaleString('fr-FR')} XP</span>
                    <span style={{ color: subject.color }}>Rang {subject.rank}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Exploits récents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-bold text-sl-text mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-sl-gold" />
            Exploits récents
          </h2>
          {recentExploits.length === 0 ? (
            <div className="text-center py-8 text-sl-text-muted text-sm">
              Aucun exploit enregistré pour l&apos;instant. Lance-toi dans ta première quête !
            </div>
          ) : (
            <div className="space-y-2">
              {recentExploits.map((exploit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-xl flex-shrink-0">{exploitTypeIcon(exploit.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-sl-text truncate">{exploit.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-sl-text-muted capitalize">{exploit.type}</span>
                      <span className="text-xs text-sl-text-muted">·</span>
                      <span className="text-xs text-sl-text-muted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(exploit.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-bold flex-shrink-0" style={{ color: '#10b981' }}>
                    +{exploit.xp} XP
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal modification profil */}
      {showEditModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false) }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: '#0f0f1a', border: '1px solid rgba(0, 212, 255, 0.2)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-sl-text text-lg">Modifier le profil</h2>
              <button onClick={() => setShowEditModal(false)} className="text-sl-text-muted hover:text-sl-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {(['avatar', 'aura', 'banniere', 'titre'] as EditTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setEditTab(tab)}
                  className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
                  style={{
                    background: editTab === tab ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                    color: editTab === tab ? '#00d4ff' : '#94a3b8',
                  }}
                >
                  {tab === 'banniere' ? 'Bannière' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Contenu tab Titre actif */}
            {editTab === 'titre' && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                <p className="text-xs text-sl-text-muted mb-3">Sélectionne un titre parmi ceux débloqués :</p>
                {AVAILABLE_TITLES.filter((t) => unlockedTitles.includes(t.id)).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleEquipTitle(t.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-white/5"
                    style={{
                      background: userProfile.active_title === t.name ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)',
                      border: userProfile.active_title === t.name ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-sl-text">{t.name}</div>
                      <div className="text-xs text-sl-text-muted">{t.description}</div>
                    </div>
                    {userProfile.active_title === t.name && (
                      <span className="ml-auto text-xs font-bold" style={{ color: '#f59e0b' }}>Actif</span>
                    )}
                  </button>
                ))}
                {unlockedTitles.length === 0 && (
                  <p className="text-center text-sl-text-muted text-sm py-4">Aucun titre débloqué.</p>
                )}
              </div>
            )}

            {/* Tabs Aura / Avatar / Bannière : message simplifié */}
            {editTab !== 'titre' && (
              <div className="text-center py-8 text-sl-text-muted text-sm">
                <p>Modification de l&apos;{editTab} disponible prochainement.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
