'use client'

import { motion } from 'framer-motion'
import { Edit3, Star, Flame, Sword, Trophy, Calendar, TrendingUp } from 'lucide-react'
import RankBadge from '@/components/ui/RankBadge'
import XPBar from '@/components/ui/XPBar'
import { SubjectXPBar } from '@/components/ui/XPBar'
import { AURA_CONFIGS, PRESET_BANNERS } from '@/lib/constants'
import { RANK_COLORS, getRankDescription } from '@/lib/ranks'
import type { Subject } from '@/lib/types'

const MOCK_USER = {
  username: 'ShadowHunter',
  email: 'hunter@system.com',
  global_rank: 'C' as const,
  global_xp: 1850,
  global_level: 8,
  streak_days: 12,
  active_title: 'Chasseur Confirmé',
  aura_type: 'shadow' as const,
  banner_type: 'preset' as const,
  banner_url: 'shadow-realm',
  avatar_url: '👤',
  titles_unlocked: ['first-quest', 'daily-grind', 'streak-3', 'rank-d', 'first-dungeon'],
  skills_unlocked: ['quick-study', 'mana-burn'],
  created_at: '2025-01-15',
}

const MOCK_SUBJECTS: Subject[] = [
  { id: 'math', user_id: 'u1', name: 'Mathématiques', color: '#00d4ff', rank: 'C', xp: 1650, level: 7, icon: '📐', created_at: '' },
  { id: 'phys', user_id: 'u1', name: 'Physique', color: '#8b5cf6', rank: 'C', xp: 1200, level: 5, icon: '⚛️', created_at: '' },
  { id: 'info', user_id: 'u1', name: 'Informatique', color: '#10b981', rank: 'B', xp: 3800, level: 12, icon: '💻', created_at: '' },
  { id: 'eco', user_id: 'u1', name: 'Économie', color: '#f59e0b', rank: 'D', xp: 900, level: 3, icon: '📊', created_at: '' },
]

const EXPLOITS = [
  { date: '2025-05-20', text: 'Rang C atteint en Informatique !', icon: '🏆', color: '#8b5cf6' },
  { date: '2025-05-18', text: 'Série de 10 jours consécutifs', icon: '🔥', color: '#f59e0b' },
  { date: '2025-05-15', text: 'Premier Donjon Boss vaincu', icon: '⚔️', color: '#ef4444' },
  { date: '2025-05-10', text: 'Titre "Chasseur Prolifique" débloqué', icon: '👑', color: '#f59e0b' },
  { date: '2025-05-05', text: '50 quêtes complétées', icon: '📋', color: '#00d4ff' },
]

export default function ProfilPage() {
  const aura = AURA_CONFIGS.find(a => a.type === MOCK_USER.aura_type)
  const banner = PRESET_BANNERS.find(b => b.id === MOCK_USER.banner_url)
  const rankColor = RANK_COLORS[MOCK_USER.global_rank]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Bannière */}
      <div
        className="relative h-40 lg:h-48 overflow-hidden"
        style={{ background: banner?.gradient || 'linear-gradient(135deg, #0a0a0f, #1a0a2e)' }}
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
          className="absolute top-3 right-3 p-2 rounded-lg transition-all"
          style={{ background: 'rgba(0,0,0,0.5)', color: '#94a3b8' }}
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {/* Overlay gradient en bas */}
        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #0a0a0f, transparent)' }} />
      </div>

      <div className="px-4 lg:px-8 pb-8">
        {/* Avatar et infos principales */}
        <div className="flex items-end gap-4 -mt-12 mb-6 relative z-10">
          {/* Avatar avec aura */}
          <div className="relative flex-shrink-0">
            <motion.div
              className="w-24 h-24 rounded-full flex items-center justify-center text-5xl relative"
              style={{
                background: 'linear-gradient(135deg, #0f0f1a, #1a0a2e)',
                border: `3px solid ${aura?.color || rankColor}`,
                boxShadow: `0 0 20px ${aura?.glowColor || rankColor}, 0 0 40px ${aura?.glowColor || rankColor}50`,
              }}
              animate={{
                boxShadow: [
                  `0 0 20px ${aura?.glowColor || rankColor}, 0 0 40px ${aura?.glowColor || rankColor}50`,
                  `0 0 30px ${aura?.glowColor || rankColor}, 0 0 60px ${aura?.glowColor || rankColor}30`,
                  `0 0 20px ${aura?.glowColor || rankColor}, 0 0 40px ${aura?.glowColor || rankColor}50`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {MOCK_USER.avatar_url}

              {/* Anneau d'aura */}
              <motion.div
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: `${aura?.color}60` }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>

            {/* Badge de rang */}
            <div className="absolute -bottom-2 -right-2">
              <RankBadge rank={MOCK_USER.global_rank} size="sm" />
            </div>
          </div>

          {/* Nom et titre */}
          <div className="pb-2">
            <h1 className="text-2xl font-black text-sl-text">{MOCK_USER.username}</h1>
            {MOCK_USER.active_title && (
              <div className="text-sm font-medium mt-0.5" style={{ color: rankColor }}>
                〖{MOCK_USER.active_title}〗
              </div>
            )}
            <div className="text-xs text-sl-text-muted mt-0.5">
              {aura?.name} · Membre depuis {new Date(MOCK_USER.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
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
            <div className="text-xs font-mono text-sl-text-muted">ID: #{MOCK_USER.username.toUpperCase()}</div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <RankBadge rank={MOCK_USER.global_rank} size="xl" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sl-text">Rang {MOCK_USER.global_rank} — Niv. {MOCK_USER.global_level}</span>
              </div>
              <XPBar
                currentXp={MOCK_USER.global_xp}
                rank={MOCK_USER.global_rank}
                showNumbers={true}
              />
              <div className="text-xs text-sl-text-muted mt-1 italic">
                {getRankDescription(MOCK_USER.global_rank)}
              </div>
            </div>
          </div>

          {/* Stats en grille */}
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/5">
            {[
              { label: 'XP Total', value: MOCK_USER.global_xp.toLocaleString('fr-FR'), icon: '⭐', color: rankColor },
              { label: 'Série', value: `${MOCK_USER.streak_days}j`, icon: '🔥', color: '#f59e0b' },
              { label: 'Titres', value: MOCK_USER.titles_unlocked.length, icon: '🏆', color: '#8b5cf6' },
              { label: 'Compétences', value: MOCK_USER.skills_unlocked.length, icon: '✨', color: '#10b981' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg">{stat.icon}</div>
                <div className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs text-sl-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Rangs par matière */}
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
            {MOCK_SUBJECTS.map((subject) => (
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

        {/* Historique des exploits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-bold text-sl-text mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-sl-gold" />
            Exploits récents
          </h2>
          <div className="space-y-2">
            {EXPLOITS.map((exploit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-xl flex-shrink-0">{exploit.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-sl-text">{exploit.text}</div>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-sl-text-muted">
                    <Calendar className="w-3 h-3" />
                    {new Date(exploit.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
