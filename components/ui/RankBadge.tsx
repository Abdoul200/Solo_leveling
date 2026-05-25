'use client'

import { motion } from 'framer-motion'
import type { Rank } from '@/lib/types'
import { RANK_COLORS, RANK_GLOW_COLORS, getRankGradient } from '@/lib/ranks'

interface RankBadgeProps {
  rank: Rank
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  showLabel?: boolean
  className?: string
}

export default function RankBadge({
  rank,
  size = 'md',
  animated = true,
  showLabel = false,
  className = '',
}: RankBadgeProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  }

  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  }

  const glowColor = RANK_GLOW_COLORS[rank]
  const gradient = getRankGradient(rank)
  const isSpecial = rank === 'SS' || rank === 'SSS' || rank === 'Monarque'

  const badgeContent = (
    <div
      className={`
        relative flex items-center justify-center rounded-full font-bold
        ${sizeClasses[size]} ${className}
      `}
      style={{
        background: gradient,
        boxShadow: animated ? `0 0 15px ${glowColor}, 0 0 30px ${glowColor}` : `0 0 8px ${glowColor}`,
        border: `1px solid ${RANK_COLORS[rank]}50`,
      }}
    >
      {/* Contour brillant pour les rangs spéciaux */}
      {isSpecial && (
        <div
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${RANK_COLORS[rank]}, transparent)`,
            animation: animated ? 'rotate-aura 3s linear infinite' : 'none',
          }}
        />
      )}

      {/* Texte du rang */}
      <span
        className="relative z-10 font-black tracking-tight"
        style={{
          color: rank === 'Monarque' ? '#0a0a0f' : 'white',
          textShadow: rank === 'Monarque' ? 'none' : `0 0 8px ${RANK_COLORS[rank]}`,
          fontSize: rank === 'SSS' || rank === 'Monarque' ? '0.65em' : undefined,
        }}
      >
        {rank === 'Monarque' ? '👑' : rank}
      </span>
    </div>
  )

  if (animated) {
    return (
      <div className={`flex flex-col items-center gap-1 ${className}`}>
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={isSpecial ? {
            boxShadow: [
              `0 0 15px ${glowColor}`,
              `0 0 30px ${glowColor}, 0 0 50px ${glowColor}`,
              `0 0 15px ${glowColor}`,
            ],
          } : undefined}
          transition={isSpecial ? {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          } : undefined}
        >
          {badgeContent}
        </motion.div>
        {showLabel && (
          <span className={`text-sl-text-muted font-medium ${labelSizes[size]}`}>
            Rang {rank === 'Monarque' ? 'Monarque' : rank}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {badgeContent}
      {showLabel && (
        <span className={`text-sl-text-muted font-medium ${labelSizes[size]}`}>
          Rang {rank === 'Monarque' ? 'Monarque' : rank}
        </span>
      )}
    </div>
  )
}

// Composant de rang en ligne (pour les listes)
export function RankBadgeInline({ rank, className = '' }: { rank: Rank; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold ${className}`}
      style={{
        background: getRankGradient(rank),
        color: rank === 'Monarque' ? '#0a0a0f' : 'white',
        boxShadow: `0 0 8px ${RANK_GLOW_COLORS[rank]}`,
      }}
    >
      {rank === 'Monarque' ? '👑 MON' : `Rang ${rank}`}
    </span>
  )
}
