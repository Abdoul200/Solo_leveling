'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Lock, CheckCircle, Filter } from 'lucide-react'
import { AVAILABLE_TITLES } from '@/lib/constants'
import { useGameStore } from '@/lib/store'
import toast from 'react-hot-toast'

const RARITY_COLORS: Record<string, string> = {
  commun: '#9ca3af',
  rare: '#3b82f6',
  épique: '#8b5cf6',
  légendaire: '#f59e0b',
}

const RARITY_LABELS: Record<string, string> = {
  commun: 'Commun',
  rare: 'Rare',
  épique: 'Épique',
  légendaire: 'Légendaire',
}

type FilterValue = 'tous' | 'débloqués' | 'verrouillés' | 'commun' | 'rare' | 'épique' | 'légendaire'

export default function TitresPage() {
  const { userProfile } = useGameStore()
  const [filter, setFilter] = useState<FilterValue>('tous')
  const [activeTitle, setActiveTitle] = useState<string | null>(userProfile?.active_title || null)
  const [equipping, setEquipping] = useState(false)

  const unlockedTitles: string[] = userProfile?.titles_unlocked || []

  const handleEquip = async (titleName: string) => {
    if (!userProfile) return
    if (activeTitle === titleName) return
    setEquipping(true)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, active_title: titleName }),
      })
      setActiveTitle(titleName)
      toast.success(`Titre "${titleName}" équipé !`)
    } catch {
      toast.error('Le système a détecté une anomalie.')
    } finally {
      setEquipping(false)
    }
  }

  const filteredTitles = AVAILABLE_TITLES.filter((title) => {
    const isUnlocked = unlockedTitles.includes(title.id)
    if (filter === 'débloqués') return isUnlocked
    if (filter === 'verrouillés') return !isUnlocked
    if (['commun', 'rare', 'épique', 'légendaire'].includes(filter)) return title.rarity === filter
    return true
  })

  const unlockedCount = AVAILABLE_TITLES.filter((t) => unlockedTitles.includes(t.id)).length
  const totalCount = AVAILABLE_TITLES.length

  const activeTitleData = AVAILABLE_TITLES.find((t) => t.name === activeTitle)

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-sl-text mb-1">Collection de Titres</h1>
        <p className="text-sm text-sl-text-muted">
          Débloqués : <span className="font-bold text-sl-text">{unlockedCount}</span> / {totalCount}
        </p>
      </div>

      {/* Titre actif */}
      {activeTitleData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
        >
          <Trophy className="w-5 h-5 text-sl-gold flex-shrink-0" />
          <div>
            <div className="text-xs text-sl-text-muted">Titre actif</div>
            <div className="font-bold text-sl-gold">〖{activeTitleData.name}〗</div>
          </div>
          <span className="ml-auto text-2xl">{activeTitleData.icon}</span>
        </motion.div>
      )}

      {/* Barre de progression */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex justify-between text-sm mb-2">
          <span className="text-sl-text-muted">Progression collection</span>
          <span className="text-sl-gold font-bold">{Math.round((unlockedCount / totalCount) * 100)}%</span>
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

      {/* Filtres en chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(
          ['tous', 'débloqués', 'verrouillés', 'commun', 'rare', 'épique', 'légendaire'] as FilterValue[]
        ).map((f) => {
          const color = RARITY_COLORS[f] || '#00d4ff'
          const isActive = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize"
              style={{
                background: isActive ? `${color}20` : 'rgba(255,255,255,0.04)',
                color: isActive ? color : '#94a3b8',
                border: isActive ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {f === 'tous' ? 'Tous' : f === 'débloqués' ? 'Débloqués' : f === 'verrouillés' ? 'Verrouillés' : RARITY_LABELS[f] || f}
            </button>
          )
        })}
      </div>

      {/* Grille de cartes */}
      {filteredTitles.length === 0 ? (
        <div className="text-center py-12 text-sl-text-muted">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p>Aucun titre dans cette catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTitles.map((title, i) => {
            const isUnlocked = unlockedTitles.includes(title.id)
            const isActive = activeTitle === title.name
            const rarityColor = RARITY_COLORS[title.rarity] || '#9ca3af'

            return (
              <motion.div
                key={title.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="relative rounded-xl p-4 transition-all"
                style={{
                  background: isActive
                    ? `${rarityColor}12`
                    : isUnlocked
                    ? `${rarityColor}08`
                    : 'rgba(255,255,255,0.02)',
                  border: isActive
                    ? `2px solid ${rarityColor}60`
                    : isUnlocked
                    ? `1px solid ${rarityColor}25`
                    : '1px solid rgba(255,255,255,0.05)',
                  opacity: isUnlocked ? 1 : 0.4,
                  boxShadow: isActive ? `0 0 20px ${rarityColor}25, 0 0 40px ${rarityColor}10` : 'none',
                }}
              >
                {/* Rareté + statut */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${rarityColor}15`, color: rarityColor }}
                  >
                    {RARITY_LABELS[title.rarity]}
                  </span>
                  {isUnlocked ? (
                    <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                  ) : (
                    <Lock className="w-4 h-4 text-sl-text-muted opacity-50" />
                  )}
                </div>

                {/* Icône + nom + description */}
                <div className="flex items-start gap-3">
                  <span className={`text-3xl flex-shrink-0 ${!isUnlocked ? 'grayscale' : ''}`}>
                    {isUnlocked ? title.icon : '🔒'}
                  </span>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-sm leading-tight ${isUnlocked ? 'text-sl-text' : 'text-sl-text-muted'}`}>
                      {isUnlocked ? title.name : '???'}
                    </h3>
                    <p className="text-xs text-sl-text-muted mt-1 leading-relaxed">
                      {isUnlocked ? title.description : title.condition}
                    </p>
                  </div>
                </div>

                {/* Bouton équiper / badge actif */}
                {isUnlocked && (
                  <div className="mt-3">
                    {isActive ? (
                      <div
                        className="w-full py-1.5 rounded-lg text-xs font-bold text-center"
                        style={{ background: `${rarityColor}20`, color: rarityColor }}
                      >
                        ✓ Titre équipé
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEquip(title.name)}
                        disabled={equipping}
                        className="w-full py-1.5 rounded-lg text-xs font-bold text-center transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: `${rarityColor}15`, color: rarityColor, border: `1px solid ${rarityColor}30` }}
                      >
                        Équiper
                      </button>
                    )}
                  </div>
                )}

                {/* Effet brillance légendaire */}
                {isUnlocked && title.rarity === 'légendaire' && (
                  <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, transparent 30%, rgba(245, 158, 11, 0.08) 50%, transparent 70%)',
                      }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
