'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, TrendingUp, ChevronRight } from 'lucide-react'
import type { Rank } from '@/lib/types'
import { RANK_COLORS, getRankGradient } from '@/lib/ranks'

interface LevelUpModalProps {
  show: boolean
  newLevel?: number
  newRank?: Rank
  previousRank?: Rank
  xpGained?: number
  titleUnlocked?: string
  skillUnlocked?: string
  onClose: () => void
}

export default function LevelUpModal({
  show,
  newLevel,
  newRank,
  previousRank,
  xpGained = 0,
  titleUnlocked,
  skillUnlocked,
  onClose,
}: LevelUpModalProps) {
  const [showContent, setShowContent] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([])

  const isRankUp = !!newRank && newRank !== previousRank
  const rankColor = newRank ? RANK_COLORS[newRank] : '#00d4ff'
  const gradient = newRank ? getRankGradient(newRank) : 'linear-gradient(135deg, #00d4ff, #8b5cf6)'

  useEffect(() => {
    if (show) {
      // Générer des particules
      const colors = ['#00d4ff', '#8b5cf6', '#f59e0b', '#10b981']
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => setShowContent(true), 300)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
      setParticles([])
    }
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Flash d'écran */}
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[60] pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.4) 0%, transparent 70%)' }}
          />

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Particules */}
          <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  background: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.5, 1, 0],
                  y: [0, -60 - Math.random() * 40],
                  x: [(Math.random() - 0.5) * 60],
                }}
                transition={{
                  duration: 1.5 + Math.random(),
                  delay: p.delay,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          {/* Modal principal */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.05, 0.97, 1], opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.6, times: [0, 0.5, 0.8, 1] }}
            className="fixed inset-0 z-[55] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-sm pointer-events-auto overflow-hidden rounded-2xl text-center"
              style={{
                background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f2a 50%, #0a0a0f 100%)',
                border: `2px solid ${rankColor}`,
                boxShadow: `0 0 60px ${rankColor}50, 0 0 120px ${rankColor}20`,
              }}
            >
              {/* Anneau lumineux tournant */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  style={{
                    background: `conic-gradient(from 0deg, transparent, ${rankColor}30, transparent, ${rankColor}20, transparent)`,
                  }}
                />
              </div>

              <div className="relative z-10 px-8 py-8">
                {/* Texte système */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs font-mono tracking-widest mb-4"
                  style={{ color: rankColor }}
                >
                  {isRankUp ? '── PERCÉE DE RANG ──' : '── NIVEAU SUPÉRIEUR ──'}
                </motion.div>

                {/* Grande icône */}
                <AnimatePresence>
                  {showContent && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                      className="relative mx-auto mb-6"
                      style={{ width: 100, height: 100 }}
                    >
                      {/* Anneaux pulsants */}
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute inset-0 rounded-full"
                          style={{ border: `2px solid ${rankColor}` }}
                          animate={{
                            scale: [1, 1.5 + i * 0.3],
                            opacity: [0.6, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            delay: i * 0.3,
                            repeat: Infinity,
                            ease: 'easeOut',
                          }}
                        />
                      ))}

                      <div
                        className="w-full h-full rounded-full flex items-center justify-center font-black"
                        style={{
                          background: gradient,
                          boxShadow: `0 0 30px ${rankColor}60`,
                          fontSize: isRankUp ? '2rem' : '2.5rem',
                        }}
                      >
                        {isRankUp ? (newRank === 'Monarque' ? '👑' : newRank) : '⬆️'}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Titre principal */}
                <AnimatePresence>
                  {showContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <h2
                        className="text-3xl font-black mb-2"
                        style={{
                          color: rankColor,
                          textShadow: `0 0 20px ${rankColor}80`,
                        }}
                      >
                        {isRankUp ? 'RANG ATTEINT !' : 'NIVEAU ATTEINT !'}
                      </h2>

                      <p className="text-sl-text-muted text-sm mb-4">
                        {isRankUp
                          ? `Tu es passé de Rang ${previousRank} à Rang ${newRank}`
                          : `Niveau ${newLevel} atteint !`
                        }
                      </p>

                      {/* XP gagnés */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center justify-center gap-2 mb-5"
                      >
                        <Star className="w-5 h-5 text-sl-gold" />
                        <span className="text-sl-gold font-bold text-xl">+{xpGained} XP</span>
                        <TrendingUp className="w-5 h-5 text-sl-gold" />
                      </motion.div>

                      {/* Titre débloqué */}
                      {titleUnlocked && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 }}
                          className="mb-3 px-4 py-3 rounded-lg text-sm"
                          style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          <div className="text-sl-gold font-bold text-xs mb-1 uppercase tracking-wider">Titre débloqué</div>
                          <div className="text-sl-text font-semibold">{titleUnlocked}</div>
                        </motion.div>
                      )}

                      {/* Compétence débloquée */}
                      {skillUnlocked && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 }}
                          className="mb-5 px-4 py-3 rounded-lg text-sm"
                          style={{
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                          }}
                        >
                          <div className="text-sl-purple font-bold text-xs mb-1 uppercase tracking-wider">Compétence débloquée</div>
                          <div className="text-sl-text font-semibold">{skillUnlocked}</div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bouton fermer */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  style={{
                    background: gradient,
                    boxShadow: `0 0 20px ${rankColor}40`,
                  }}
                >
                  Continuer
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
