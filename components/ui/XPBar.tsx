'use client'

import { motion } from 'framer-motion'
import type { Rank } from '@/lib/types'
import { RANK_COLORS, getRankProgress, getXpToNextRank, RANK_XP_THRESHOLDS, RANKS } from '@/lib/ranks'

interface XPBarProps {
  currentXp: number
  rank: Rank
  level?: number
  showNumbers?: boolean
  showRank?: boolean
  compact?: boolean
  animated?: boolean
  color?: string
  className?: string
}

export default function XPBar({
  currentXp,
  rank,
  level,
  showNumbers = true,
  showRank = false,
  compact = false,
  animated = true,
  color,
  className = '',
}: XPBarProps) {
  const progress = getRankProgress(currentXp, rank)
  const xpToNext = getXpToNextRank(currentXp, rank)
  const rankIndex = RANKS.indexOf(rank)
  const isMaxRank = rankIndex === RANKS.length - 1

  const barColor = color || RANK_COLORS[rank]
  const nextRank = isMaxRank ? null : RANKS[rankIndex + 1]

  const rankThreshold = RANK_XP_THRESHOLDS[rank]
  const nextThreshold = nextRank ? RANK_XP_THRESHOLDS[nextRank] : rankThreshold
  const xpInCurrentRank = currentXp - rankThreshold
  const xpForRankUp = nextThreshold - rankThreshold

  const barElement = (
    <div className={`relative ${compact ? 'h-2' : 'h-3'} bg-white/5 rounded-full overflow-hidden`}>
      {/* Fond de la barre */}
      <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* Barre de progression */}
      {animated ? (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
            boxShadow: `0 0 10px ${barColor}60`,
          }}
        />
      ) : (
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
            boxShadow: `0 0 10px ${barColor}60`,
          }}
        />
      )}

      {/* Effet de brillance animé */}
      {animated && (
        <motion.div
          className="absolute inset-y-0 w-20 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          }}
          animate={{ x: ['-80px', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        />
      )}
    </div>
  )

  if (compact) {
    return (
      <div className={`w-full ${className}`}>
        {barElement}
      </div>
    )
  }

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {/* En-tête avec rang et niveau */}
      {(showRank || level !== undefined) && (
        <div className="flex items-center justify-between text-xs text-sl-text-muted">
          {showRank && (
            <span style={{ color: barColor }}>Rang {rank}</span>
          )}
          {level !== undefined && (
            <span className="font-medium" style={{ color: barColor }}>
              Niv. {level}
            </span>
          )}
        </div>
      )}

      {/* Barre */}
      {barElement}

      {/* Informations XP */}
      {showNumbers && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-sl-text-muted">
            {isMaxRank ? (
              <span style={{ color: barColor }}>Rang maximum atteint !</span>
            ) : (
              <>
                <span style={{ color: barColor }}>{xpInCurrentRank.toLocaleString('fr-FR')}</span>
                <span className="text-sl-text-muted"> / {xpForRankUp.toLocaleString('fr-FR')} XP</span>
              </>
            )}
          </span>
          {!isMaxRank && (
            <span className="text-sl-text-muted">
              {xpToNext.toLocaleString('fr-FR')} XP → Rang {nextRank}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Barre XP compacte pour les matières
export function SubjectXPBar({
  currentXp,
  rank,
  color,
  className = '',
}: {
  currentXp: number
  rank: Rank
  color?: string
  className?: string
}) {
  const progress = getRankProgress(currentXp, rank)
  const barColor = color || RANK_COLORS[rank]

  return (
    <div className={`relative h-1.5 bg-white/5 rounded-full overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${barColor}80, ${barColor})`,
          boxShadow: `0 0 6px ${barColor}50`,
        }}
      />
    </div>
  )
}
