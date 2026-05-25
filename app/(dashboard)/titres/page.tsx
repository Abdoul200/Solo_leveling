'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Lock, CheckCircle, Filter } from 'lucide-react'
import { AVAILABLE_TITLES } from '@/lib/constants'
import type { Title } from '@/lib/types'
import toast from 'react-hot-toast'

const UNLOCKED_TITLES = ['first-quest', 'daily-grind', 'streak-3', 'rank-d', 'first-dungeon', 'quests-50', 'first-boss']

const RARITY_COLORS = {
  'commun': '#94a3b8',
  'rare': '#3b82f6',
  'épique': '#8b5cf6',
  'légendaire': '#f59e0b',
}

const RARITY_LABELS = {
  'commun': 'Commun',
  'rare': 'Rare',
  'épique': 'Épique',
  'légendaire': 'Légendaire',
}

type FilterRarity = 'all' | 'commun' | 'rare' | 'épique' | 'légendaire'
type FilterStatus = 'all' | 'unlocked' | 'locked'

export default function TitresPage() {
  const [activeTitle, setActiveTitle] = useState<string | null>('first-dungeon')
  const [rarityFilter, setRarityFilter] = useState<FilterRarity>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  const filteredTitles = AVAILABLE_TITLES.filter((title) => {
    const isUnlocked = UNLOCKED_TITLES.includes(title.id)
    if (statusFilter === 'unlocked' && !isUnlocked) return false
    if (statusFilter === 'locked' && isUnlocked) return false
    if (rarityFilter !== 'all' && title.rarity !== rarityFilter) return false
    return true
  })

  const handleEquipTitle = (titleId: string) => {
    if (!UNLOCKED_TITLES.includes(titleId)) return
    const title = AVAILABLE_TITLES.find(t => t.id === titleId)
    if (activeTitle === titleId) {
      setActiveTitle(null)
      toast.success('Titre retiré')
    } else {
      setActiveTitle(titleId)
      toast.success(`Titre "${title?.name}" équipé !`)
    }
  }

  const unlockedCount = AVAILABLE_TITLES.filter(t => UNLOCKED_TITLES.includes(t.id)).length
  const totalCount = AVAILABLE_TITLES.length

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-sl-text mb-1">Titres</h1>
        <p className="text-sm text-sl-text-muted">
          Débloqués : {unlockedCount}/{totalCount}
        </p>
      </div>

      {/* Titre actif */}
      {activeTitle && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
        >
          <Trophy className="w-5 h-5 text-sl-gold" />
          <div>
            <div className="text-xs text-sl-text-muted">Titre actif</div>
            <div className="font-bold text-sl-gold">
              〖{AVAILABLE_TITLES.find(t => t.id === activeTitle)?.name}〗
            </div>
          </div>
        </motion.div>
      )}

      {/* Barre de progression */}
      <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-sl-text-muted">Progression collection</span>
          <span className="text-sl-gold font-bold">{Math.round(unlockedCount / totalCount * 100)}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #d97706, #f59e0b)' }}
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex gap-1.5">
          {(['all', 'unlocked', 'locked'] as FilterStatus[]).map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: statusFilter === f ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255,255,255,0.04)',
                color: statusFilter === f ? '#00d4ff' : '#94a3b8',
                border: statusFilter === f ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}>
              {f === 'all' ? 'Tous' : f === 'unlocked' ? 'Débloqués' : 'Verrouillés'}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 ml-auto">
          {(['all', 'commun', 'rare', 'épique', 'légendaire'] as FilterRarity[]).map((r) => (
            <button key={r} onClick={() => setRarityFilter(r)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: rarityFilter === r ? `${(RARITY_COLORS as Record<string, string>)[r] || '#00d4ff'}20` : 'rgba(255,255,255,0.04)',
                color: rarityFilter === r ? ((RARITY_COLORS as Record<string, string>)[r] || '#00d4ff') : '#94a3b8',
                border: rarityFilter === r ? `1px solid ${(RARITY_COLORS as Record<string, string>)[r] || '#00d4ff'}40` : '1px solid rgba(255,255,255,0.06)',
              }}>
              {r === 'all' ? 'Toutes' : RARITY_LABELS[r as keyof typeof RARITY_LABELS]}
            </button>
          ))}
        </div>
      </div>

      {/* Grille de titres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTitles.map((title, i) => {
          const isUnlocked = UNLOCKED_TITLES.includes(title.id)
          const isActive = activeTitle === title.id
          const rarityColor = RARITY_COLORS[title.rarity]

          return (
            <motion.div
              key={title.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => isUnlocked && handleEquipTitle(title.id)}
              className={`relative rounded-xl p-4 transition-all ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              style={{
                background: isActive
                  ? `${rarityColor}12`
                  : isUnlocked
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(255,255,255,0.02)',
                border: isActive
                  ? `2px solid ${rarityColor}50`
                  : isUnlocked
                  ? `1px solid ${rarityColor}20`
                  : '1px solid rgba(255,255,255,0.05)',
                opacity: isUnlocked ? 1 : 0.5,
                boxShadow: isActive ? `0 0 15px ${rarityColor}20` : 'none',
              }}
              whileHover={isUnlocked ? { scale: 1.03 } : undefined}
              whileTap={isUnlocked ? { scale: 0.97 } : undefined}
            >
              {/* Rareté badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${rarityColor}15`, color: rarityColor }}
                >
                  {RARITY_LABELS[title.rarity]}
                </span>
                {isUnlocked ? (
                  <CheckCircle className="w-4 h-4 text-sl-green" />
                ) : (
                  <Lock className="w-4 h-4 text-sl-text-muted opacity-50" />
                )}
              </div>

              {/* Icône et nom */}
              <div className="flex items-start gap-3">
                <span className={`text-3xl ${!isUnlocked ? 'grayscale opacity-40' : ''}`}>
                  {isUnlocked ? title.icon : '🔒'}
                </span>
                <div>
                  <h3 className={`font-bold text-sm leading-tight ${isUnlocked ? 'text-sl-text' : 'text-sl-text-muted'}`}>
                    {isUnlocked ? title.name : '???'}
                  </h3>
                  <p className="text-xs text-sl-text-muted mt-1 leading-relaxed">
                    {isUnlocked ? title.description : title.condition}
                  </p>
                </div>
              </div>

              {/* Badge actif */}
              {isActive && (
                <div
                  className="mt-3 w-full py-1.5 rounded-lg text-xs font-bold text-center"
                  style={{ background: `${rarityColor}20`, color: rarityColor }}
                >
                  Titre équipé
                </div>
              )}

              {/* Effet de brillance pour les légendaires */}
              {isUnlocked && title.rarity === 'légendaire' && (
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, transparent 30%, rgba(245, 158, 11, 0.08) 50%, transparent 70%)' }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {filteredTitles.length === 0 && (
        <div className="text-center py-12 text-sl-text-muted">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p>Aucun titre dans cette catégorie</p>
        </div>
      )}
    </div>
  )
}
