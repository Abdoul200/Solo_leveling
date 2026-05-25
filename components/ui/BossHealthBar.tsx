'use client'

import { motion } from 'framer-motion'
import { CalendarDays, Skull } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BossHealthBarProps {
  currentHP: number
  maxHP: number
  examDate: string
  examTitle: string
  subjectName?: string
}

export default function BossHealthBar({
  currentHP,
  maxHP,
  examDate,
  examTitle,
  subjectName,
}: BossHealthBarProps) {
  const hpPercent = maxHP > 0 ? (currentHP / maxHP) * 100 : 0
  const daysLeft = differenceInDays(new Date(examDate), new Date())
  const isCritical = hpPercent < 20
  const isDanger = daysLeft <= 3

  const daysColor = daysLeft > 7
    ? '#10b981'
    : daysLeft >= 3
      ? '#f59e0b'
      : '#ef4444'

  const hpColor = hpPercent > 60
    ? '#ef4444'
    : hpPercent > 30
      ? '#dc2626'
      : '#b91c1c'

  return (
    <motion.div
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        background: isCritical
          ? 'rgba(239, 68, 68, 0.1)'
          : 'rgba(30, 10, 10, 0.95)',
        border: `2px solid ${isCritical ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.3)'}`,
      }}
      animate={
        isCritical
          ? {
              boxShadow: [
                '0 0 10px rgba(239, 68, 68, 0.2)',
                '0 0 30px rgba(239, 68, 68, 0.5)',
                '0 0 10px rgba(239, 68, 68, 0.2)',
              ],
            }
          : {}
      }
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      {/* Fond pulsant critique */}
      {isCritical && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ background: 'rgba(239, 68, 68, 0.05)' }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between mb-3">
        <motion.div
          className="flex items-center gap-2 text-xs font-bold"
          style={{ color: '#ef4444' }}
          animate={isCritical ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <Skull className="w-4 h-4" />
          <span>BOSS ACTIF</span>
        </motion.div>

        <div
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            color: daysColor,
            background: `${daysColor}15`,
            border: `1px solid ${daysColor}40`,
          }}
        >
          {daysLeft <= 0 ? '⚠️ AUJOURD\'HUI !' : `J-${daysLeft}`}
        </div>
      </div>

      {/* Titre */}
      <h3 className="font-black text-sl-text mb-1 text-sm leading-tight">{examTitle}</h3>
      {subjectName && (
        <div className="text-xs text-sl-text-muted mb-3">{subjectName}</div>
      )}

      {/* Barre de vie */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-sl-text-muted">❤️ Points de Vie</span>
          <span style={{ color: hpColor, fontWeight: 'bold' }}>
            {currentHP}/{maxHP} PV
          </span>
        </div>

        <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{
              width: `${hpPercent}%`,
              background: `linear-gradient(90deg, #dc2626, ${hpColor})`,
            }}
            animate={
              isCritical
                ? { opacity: [1, 0.6, 1] }
                : { opacity: [0.9, 1, 0.9] }
            }
            transition={{ duration: isCritical ? 0.8 : 2, repeat: Infinity }}
          >
            {/* Shimmer */}
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </div>

        <div className="flex justify-between text-xs mt-1 text-sl-text-muted">
          <span>{Math.round(hpPercent)}% restant</span>
          {isCritical && (
            <motion.span
              style={{ color: '#ef4444' }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              ⚠️ CRITIQUE
            </motion.span>
          )}
        </div>
      </div>

      {/* Date d'examen */}
      <div
        className="flex items-center gap-2 text-xs mt-3 pt-3 border-t border-white/5"
        style={{ color: daysColor }}
      >
        <CalendarDays className="w-3.5 h-3.5" />
        <span>
          Examen le{' '}
          {format(new Date(examDate), 'EEEE d MMMM yyyy', { locale: fr })}
        </span>
      </div>
    </motion.div>
  )
}
