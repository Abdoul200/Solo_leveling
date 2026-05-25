'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Star, Play, CheckCircle, XCircle, Timer, Zap } from 'lucide-react'
import type { Quest } from '@/lib/types'
import { format, isAfter } from 'date-fns'
import { fr } from 'date-fns/locale'

interface QuestCardProps {
  quest: Quest
  onStart?: (questId: string) => void
  onComplete?: (questId: string) => void
  onAbandon?: (questId: string) => void
  subjectName?: string
  subjectColor?: string
  className?: string
}

const QUEST_TYPE_LABELS = {
  revision: 'Révision',
  daily: 'Quotidien',
  special: 'Spécial',
  physical: 'Combat Physique',
}

const QUEST_TYPE_ICONS = {
  revision: '📖',
  daily: '⭐',
  special: '💎',
  physical: '⚔️',
}

const QUEST_TYPE_COLORS = {
  revision: '#3b82f6',
  daily: '#f59e0b',
  special: '#8b5cf6',
  physical: '#ef4444',
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: '#94a3b8' },
  active: { label: 'En cours', color: '#00d4ff' },
  completed: { label: 'Accomplie', color: '#10b981' },
  failed: { label: 'Échouée', color: '#ef4444' },
  expired: { label: 'Expirée', color: '#6b7280' },
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function QuestCard({
  quest,
  onStart,
  onComplete,
  onAbandon,
  subjectName,
  subjectColor,
  className = '',
}: QuestCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)

  const typeColor = QUEST_TYPE_COLORS[quest.type]
  const statusConfig = STATUS_CONFIG[quest.status]
  const isActive = quest.status === 'active'
  const isPending = quest.status === 'pending'
  const isCompleted = quest.status === 'completed'
  const isFailed = quest.status === 'failed' || quest.status === 'expired'

  const isOverdue = !isCompleted && !isFailed && isAfter(new Date(), new Date(quest.due_date))

  // Timer pour les quêtes actives
  useEffect(() => {
    if (!isActive || !quest.timer_started_at) return

    const updateTimer = () => {
      const started = new Date(quest.timer_started_at!).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - started) / 1000)
      setElapsedSeconds(elapsed + (quest.time_spent_minutes * 60))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isActive, quest.timer_started_at, quest.time_spent_minutes])

  const progressPercent = isActive
    ? Math.min((elapsedSeconds / (quest.min_duration_minutes * 60)) * 100, 100)
    : isCompleted
    ? 100
    : 0

  const canComplete = isActive && elapsedSeconds >= quest.min_duration_minutes * 60

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative overflow-hidden rounded-sl border transition-all duration-300 cursor-pointer
        ${isCompleted ? 'opacity-60' : ''}
        ${isFailed ? 'opacity-50' : ''}
        ${className}
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)',
        borderColor: isActive
          ? `${typeColor}60`
          : isCompleted
          ? 'rgba(16, 185, 129, 0.3)'
          : isFailed
          ? 'rgba(239, 68, 68, 0.2)'
          : 'rgba(0, 212, 255, 0.15)',
        boxShadow: isActive ? `0 0 20px ${typeColor}20` : 'none',
      }}
      onClick={() => setIsExpanded(!isExpanded)}
      whileHover={{ scale: isFailed || isCompleted ? 1 : 1.01 }}
    >
      {/* Barre de progression (si active) */}
      {isActive && (
        <div className="absolute top-0 left-0 h-0.5 bg-white/10 w-full">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${typeColor}80, ${typeColor})` }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      <div className="p-4">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Icône type */}
            <span className="text-xl flex-shrink-0">{QUEST_TYPE_ICONS[quest.type]}</span>

            {/* Titre */}
            <div className="min-w-0">
              <h3 className="font-semibold text-sl-text leading-tight truncate">
                {quest.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {/* Badge type */}
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: `${typeColor}20`, color: typeColor }}
                >
                  {QUEST_TYPE_LABELS[quest.type]}
                </span>

                {/* Matière */}
                {subjectName && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ background: `${subjectColor || '#8b5cf6'}20`, color: subjectColor || '#8b5cf6' }}
                  >
                    {subjectName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* XP et statut */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-sl-gold" />
              <span className="text-sl-gold font-bold text-sm">+{quest.xp_reward} XP</span>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${statusConfig.color}15`,
                color: statusConfig.color,
                border: `1px solid ${statusConfig.color}30`,
              }}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Timer actif */}
        {isActive && (
          <div className="flex items-center justify-between mt-3 py-2 px-3 rounded-lg"
            style={{ background: `${typeColor}10`, border: `1px solid ${typeColor}20` }}>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 animate-pulse" style={{ color: typeColor }} />
              <span className="font-mono font-bold text-lg" style={{ color: typeColor }}>
                {formatDuration(elapsedSeconds)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs text-sl-text-muted">Minimum</div>
              <div className="text-sm font-medium text-sl-text">
                {quest.min_duration_minutes}min
              </div>
            </div>
          </div>
        )}

        {/* Contenu expandé */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-sm text-sl-text-muted leading-relaxed">
                  {quest.description}
                </p>

                {/* Date limite */}
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3.5 h-3.5 text-sl-text-muted" />
                  <span className={`text-xs ${isOverdue ? 'text-sl-red' : 'text-sl-text-muted'}`}>
                    {isOverdue ? '⚠️ ' : ''}Limite :{' '}
                    {format(new Date(quest.due_date), "dd MMM à HH'h'mm", { locale: fr })}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boutons d'action */}
        {(isPending || isActive) && (
          <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            {isPending && onStart && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onStart(quest.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold text-sm transition-all"
                style={{
                  background: `linear-gradient(135deg, ${typeColor}40, ${typeColor}60)`,
                  color: 'white',
                  border: `1px solid ${typeColor}50`,
                  boxShadow: `0 0 12px ${typeColor}20`,
                }}
              >
                <Play className="w-4 h-4" />
                Démarrer
              </motion.button>
            )}

            {isActive && (
              <>
                <motion.button
                  whileHover={{ scale: canComplete ? 1.03 : 1 }}
                  whileTap={{ scale: canComplete ? 0.97 : 1 }}
                  onClick={() => canComplete && onComplete?.(quest.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                    canComplete ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                  style={{
                    background: canComplete ? 'linear-gradient(135deg, #059669, #10b981)' : 'rgba(255,255,255,0.05)',
                    color: canComplete ? 'white' : '#6b7280',
                    border: canComplete ? '1px solid #10b98150' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: canComplete ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  {canComplete ? 'Terminer' : `Encore ${Math.ceil((quest.min_duration_minutes * 60 - elapsedSeconds) / 60)}min`}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onAbandon?.(quest.id)}
                  className="flex items-center justify-center p-2 rounded-lg transition-all"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                  }}
                >
                  <XCircle className="w-4 h-4" />
                </motion.button>
              </>
            )}
          </div>
        )}

        {/* Badge IA générée */}
        {quest.ai_generated && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>
              <Zap className="w-3 h-3" />
              IA
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
