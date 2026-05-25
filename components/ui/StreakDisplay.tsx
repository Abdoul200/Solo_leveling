'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Flame } from 'lucide-react'

interface StreakDisplayProps {
  streakDays: number
}

function getStreakConfig(days: number) {
  if (days === 0) return { color: '#64748b', glow: 'rgba(100, 116, 139, 0.3)', label: 'Débutant', milestone: false }
  if (days < 7)   return { color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.4)', label: 'Actif', milestone: false }
  if (days < 30)  return { color: '#a78bfa', glow: 'rgba(167, 139, 250, 0.5)', label: 'Régulier', milestone: days === 7 }
  if (days < 100) return { color: '#facc15', glow: 'rgba(250, 204, 21, 0.5)', label: 'Légendaire', milestone: days === 30 }
  return { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.6)', label: 'Immortel', milestone: days === 100 }
}

const MILESTONES = [7, 30, 100]

export default function StreakDisplay({ streakDays }: StreakDisplayProps) {
  const config = getStreakConfig(streakDays)
  const isMilestone = MILESTONES.includes(streakDays)

  return (
    <div className="relative">
      <motion.div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{
          background: `${config.color}15`,
          border: `1px solid ${config.color}30`,
        }}
        animate={{
          boxShadow: streakDays > 0
            ? [
                `0 0 8px ${config.glow}`,
                `0 0 16px ${config.glow}`,
                `0 0 8px ${config.glow}`,
              ]
            : 'none',
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Flamme animée */}
        <motion.div
          animate={
            streakDays > 0
              ? {
                  scale: [1, 1.15, 1],
                  rotate: [-5, 5, -5],
                }
              : {}
          }
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame
            className="w-5 h-5"
            style={{ color: streakDays === 0 ? '#475569' : config.color }}
          />
        </motion.div>

        <div>
          <motion.div
            className="text-xl font-black leading-none"
            style={{ color: config.color }}
            animate={isMilestone ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: 3 }}
          >
            {streakDays}
          </motion.div>
          <div className="text-xs" style={{ color: `${config.color}80` }}>
            {streakDays === 1 ? 'jour' : 'jours'}
          </div>
        </div>
      </motion.div>

      {/* Animation milestone */}
      <AnimatePresence>
        {isMilestone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -10 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold px-2 py-1 rounded-full"
            style={{
              background: config.color,
              color: 'white',
              boxShadow: `0 0 15px ${config.glow}`,
            }}
          >
            🎉 Milestone !
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
