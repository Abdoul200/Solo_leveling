'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Sword, Clock, Star } from 'lucide-react'
import type { Dungeon } from '@/lib/types'
import { RANK_COLORS, getRankGradient } from '@/lib/ranks'

interface DungeonAlertProps {
  dungeon: Dungeon | null
  onEnter?: (dungeonId: string) => void
  onDismiss?: () => void
  subjectName?: string
}

export default function DungeonAlert({ dungeon, onEnter, onDismiss, subjectName }: DungeonAlertProps) {
  const [visible, setVisible] = useState(false)
  const [scanLine, setScanLine] = useState(false)

  useEffect(() => {
    if (dungeon) {
      setVisible(true)
      const timer = setTimeout(() => setScanLine(true), 300)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [dungeon])

  if (!dungeon) return null

  const rankColor = RANK_COLORS[dungeon.rank]
  const gradient = getRankGradient(dungeon.rank)

  const handleEnter = () => {
    if (dungeon && onEnter) {
      onEnter(dungeon.id)
    }
    setVisible(false)
  }

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Alerte du donjon */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
            animate={{
              scale: [0.3, 1.05, 0.98, 1],
              opacity: [0, 1, 1, 1],
              rotate: [-10, 2, -1, 0],
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              duration: 0.6,
              times: [0, 0.5, 0.75, 1],
              ease: 'easeOut',
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-md pointer-events-auto overflow-hidden rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f2a 50%, #0a0a0f 100%)',
                border: `2px solid ${rankColor}`,
                boxShadow: `0 0 40px ${rankColor}50, 0 0 80px ${rankColor}20, inset 0 0 30px ${rankColor}10`,
              }}
            >
              {/* Scan line effect */}
              {scanLine && (
                <motion.div
                  className="absolute left-0 right-0 h-px pointer-events-none z-10"
                  style={{ background: `linear-gradient(90deg, transparent, ${rankColor}, transparent)` }}
                  animate={{ top: ['-2px', '102%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                />
              )}

              {/* En-tête d'alerte */}
              <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ background: `linear-gradient(90deg, ${rankColor}20, transparent)` }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <AlertTriangle className="w-6 h-6" style={{ color: rankColor }} />
                  </motion.div>
                  <div>
                    <div className="text-xs font-mono tracking-widest" style={{ color: rankColor }}>
                      ALERTE SYSTÈME
                    </div>
                    <div className="text-xs text-sl-text-muted font-mono tracking-wider">
                      PORTAIL DIMENSIONNEL DÉTECTÉ
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 rounded text-sl-text-muted hover:text-sl-text transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corps de l'alerte */}
              <div className="px-6 py-5">
                {/* Rang du donjon */}
                <div className="flex items-center justify-center mb-4">
                  <motion.div
                    animate={{
                      boxShadow: [
                        `0 0 20px ${rankColor}50`,
                        `0 0 40px ${rankColor}80`,
                        `0 0 20px ${rankColor}50`,
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl"
                    style={{
                      background: gradient,
                      color: 'white',
                      border: `2px solid ${rankColor}`,
                    }}
                  >
                    {dungeon.rank === 'Monarque' ? '👑' : dungeon.rank}
                  </motion.div>
                </div>

                {/* Titre */}
                <h2
                  className="text-2xl font-black text-center mb-1"
                  style={{ color: rankColor, textShadow: `0 0 20px ${rankColor}60` }}
                >
                  {dungeon.title}
                </h2>

                {/* Type de donjon */}
                <div className="text-center text-sm text-sl-text-muted mb-4">
                  {dungeon.type === 'boss' ? '💀 DONJON BOSS' : '⚔️ DONJON SPRINT'}
                  {subjectName && ` — ${subjectName}`}
                </div>

                {/* Description */}
                <p className="text-sm text-sl-text-muted text-center leading-relaxed mb-5">
                  {dungeon.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ background: `${rankColor}10`, border: `1px solid ${rankColor}20` }}
                  >
                    <Star className="w-4 h-4 mx-auto mb-1" style={{ color: rankColor }} />
                    <div className="text-xs text-sl-text-muted">Récompense</div>
                    <div className="font-bold text-sm" style={{ color: rankColor }}>
                      +{dungeon.xp_reward} XP
                    </div>
                  </div>

                  {dungeon.time_limit_minutes && (
                    <div
                      className="rounded-lg p-3 text-center"
                      style={{ background: `${rankColor}10`, border: `1px solid ${rankColor}20` }}
                    >
                      <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: rankColor }} />
                      <div className="text-xs text-sl-text-muted">Limite</div>
                      <div className="font-bold text-sm" style={{ color: rankColor }}>
                        {dungeon.time_limit_minutes}min
                      </div>
                    </div>
                  )}

                  {dungeon.health_points && (
                    <div
                      className="rounded-lg p-3 text-center"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    >
                      <span className="text-lg block mb-1">❤️</span>
                      <div className="text-xs text-sl-text-muted">PV Boss</div>
                      <div className="font-bold text-sm text-sl-red">
                        {dungeon.health_points}
                      </div>
                    </div>
                  )}

                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ background: `${rankColor}10`, border: `1px solid ${rankColor}20` }}
                  >
                    <Sword className="w-4 h-4 mx-auto mb-1" style={{ color: rankColor }} />
                    <div className="text-xs text-sl-text-muted">Rang</div>
                    <div className="font-bold text-sm" style={{ color: rankColor }}>
                      {dungeon.rank}
                    </div>
                  </div>
                </div>

                {/* Récompenses */}
                {dungeon.rewards.length > 0 && (
                  <div className="mb-5">
                    <div className="text-xs text-sl-text-muted mb-2 text-center">Récompenses potentielles</div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {dungeon.rewards.map((reward, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ background: `${rankColor}15`, color: rankColor, border: `1px solid ${rankColor}30` }}
                        >
                          {reward}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boutons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDismiss}
                    className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: '#94a3b8',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    Ignorer
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleEnter}
                    className="flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                    style={{
                      background: gradient,
                      color: 'white',
                      border: `1px solid ${rankColor}50`,
                      boxShadow: `0 0 20px ${rankColor}40`,
                    }}
                  >
                    <Sword className="w-4 h-4" />
                    Entrer dans le Donjon
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
