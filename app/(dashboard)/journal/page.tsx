'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Star, Flame, Calendar, Smile } from 'lucide-react'
import type { JournalEntry } from '@/lib/types'
import { useGameStore } from '@/lib/store'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

type Mood = JournalEntry['mood']

const MOOD_CONFIG: Record<Mood, { label: string; emoji: string; color: string }> = {
  excellent: { label: 'Excellent', emoji: '🔥', color: '#10b981' },
  bien: { label: 'Bien', emoji: '😊', color: '#00d4ff' },
  neutre: { label: 'Neutre', emoji: '😐', color: '#94a3b8' },
  difficile: { label: 'Difficile', emoji: '😔', color: '#f59e0b' },
  terrible: { label: 'Terrible', emoji: '💀', color: '#ef4444' },
}

export default function JournalPage() {
  const { userProfile } = useGameStore()

  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<Mood>('neutre')
  const [submitting, setSubmitting] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [editingToday, setEditingToday] = useState(false)

  useEffect(() => {
    if (!userProfile) return
    const fetchEntries = async () => {
      setLoading(true)
      const res = await fetch(`/api/journal?userId=${userProfile.id}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
      setLoading(false)
    }
    fetchEntries()
  }, [userProfile])

  const todayEntry = entries.find(e => {
    const d = new Date(e.created_at)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })

  const showForm = !todayEntry || editingToday

  const handleSubmit = async () => {
    if (!userProfile || !content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, content, mood }),
      })
      if (res.ok) {
        const data = await res.json()
        setEntries(prev => [data.entry, ...prev.filter((e: JournalEntry) => e.id !== data.entry.id)])
        setContent('')
        setMood('neutre')
        setEditingToday(false)
        toast.success('Entrée du journal sauvegardée !')
      } else {
        toast.error('Le système a détecté une anomalie.')
      }
    } catch {
      toast.error('Le système a détecté une anomalie.')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date()

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-sl-text mb-1 flex items-center gap-2">
            📖 Journal du Chasseur
          </h1>
          <p className="text-sm text-sl-text-muted">
            {format(today, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
      </div>

      {/* Rappel / pas d'entrée du jour */}
      {!todayEntry && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 mb-6 flex items-center gap-3 cursor-pointer"
          style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)' }}
          onClick={() => setEditingToday(true)}
        >
          <BookOpen className="w-5 h-5 text-sl-purple" />
          <div>
            <div className="font-medium text-sl-text text-sm">Aucune entrée aujourd&apos;hui</div>
            <div className="text-xs text-sl-text-muted">Écris dans ton journal pour +50 XP bonus</div>
          </div>
          <div className="ml-auto text-sl-purple text-sm font-semibold">Écrire →</div>
        </motion.div>
      )}

      {/* Section : Entrée du jour */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="rounded-xl p-5" style={{ background: 'rgba(15, 15, 26, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div className="text-sm font-bold text-sl-text mb-4">
                {format(today, "EEEE d MMMM yyyy", { locale: fr })}
              </div>

              {/* Sélection humeur */}
              <div className="mb-4">
                <div className="text-xs text-sl-text-muted mb-2 uppercase tracking-wider">
                  Comment s&apos;est passée la journée ?
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(MOOD_CONFIG) as [Mood, typeof MOOD_CONFIG[Mood]][]).map(([moodKey, config]) => (
                    <button
                      key={moodKey}
                      type="button"
                      onClick={() => setMood(moodKey)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                      style={{
                        background: mood === moodKey ? `${config.color}20` : 'rgba(255,255,255,0.04)',
                        border: mood === moodKey ? `1px solid ${config.color}` : '1px solid rgba(255,255,255,0.08)',
                        color: mood === moodKey ? config.color : '#94a3b8',
                      }}
                    >
                      <span>{config.emoji}</span>
                      <span>{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone de texte */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Raconte ta journée... Qu'as-tu accompli ? Quelles difficultés as-tu rencontrées ? Comment te sens-tu par rapport à ta progression ?"
                rows={6}
                className="w-full py-3 px-4 rounded-xl text-sm outline-none resize-none mb-4"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: '#e2e8f0',
                  lineHeight: '1.6',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)' }}
              />

              <div className="flex gap-3">
                {editingToday && (
                  <button
                    onClick={() => { setEditingToday(false); setContent('') }}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Annuler
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={submitting || !content.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                    color: 'white',
                    boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)',
                    opacity: submitting || !content.trim() ? 0.7 : 1,
                  }}
                >
                  <BookOpen className="w-4 h-4" />
                  {submitting ? 'Sauvegarde...' : 'Sceller l\'entrée'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entrée du jour mise en avant */}
      {todayEntry && !editingToday && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl overflow-hidden mb-6"
          style={{ border: '1px solid rgba(139, 92, 246, 0.4)', background: 'rgba(139, 92, 246, 0.06)' }}
        >
          <div className="flex items-center gap-3 p-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{
                background: `${MOOD_CONFIG[todayEntry.mood].color}15`,
                border: `1px solid ${MOOD_CONFIG[todayEntry.mood].color}30`,
              }}
            >
              {MOOD_CONFIG[todayEntry.mood].emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="font-medium text-sl-text text-sm">Aujourd&apos;hui</div>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>
                  Actuel
                </span>
              </div>
              <div className="text-xs text-sl-text-muted truncate">{todayEntry.content.slice(0, 80)}...</div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="flex items-center gap-1 text-sl-gold text-xs font-medium">
                <Star className="w-3 h-3" />
                +{todayEntry.xp_gained_today}
              </div>
              <div className="text-xs text-sl-text-muted mt-0.5">{todayEntry.quests_completed} quêtes</div>
            </div>
          </div>
          <div className="px-4 pb-4">
            <p className="text-sm text-sl-text leading-relaxed whitespace-pre-wrap">{todayEntry.content}</p>
            <button
              onClick={() => { setContent(todayEntry.content); setMood(todayEntry.mood); setEditingToday(true) }}
              className="mt-3 text-xs text-sl-purple hover:text-sl-blue transition-colors"
            >
              ✏️ Modifier cette entrée
            </button>
          </div>
        </motion.div>
      )}

      {/* Historique */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', height: 80 }} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {entries
            .filter(e => {
              const d = new Date(e.created_at)
              return d.toDateString() !== new Date().toDateString()
            })
            .map((entry, i) => {
              const moodConfig = MOOD_CONFIG[entry.mood]
              const entryDate = new Date(entry.created_at)
              const isExpanded = expandedEntry === entry.id

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* En-tête */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: `${moodConfig.color}15`, border: `1px solid ${moodConfig.color}30` }}
                    >
                      {moodConfig.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sl-text text-sm mb-0.5">
                        {format(entryDate, "EEEE d MMMM", { locale: fr })}
                      </div>
                      <div className="text-xs text-sl-text-muted truncate">{entry.content.slice(0, 80)}...</div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 text-sl-gold text-xs font-medium">
                        <Star className="w-3 h-3" />
                        +{entry.xp_gained_today}
                      </div>
                      <div className="text-xs text-sl-text-muted mt-0.5">{entry.quests_completed} quêtes</div>
                    </div>
                  </div>

                  {/* Contenu expandé */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0">
                          <div className="pt-3 border-t border-white/5">
                            <p className="text-sm text-sl-text leading-relaxed whitespace-pre-wrap">{entry.content}</p>

                            <div className="flex items-center gap-4 mt-4 text-xs text-sl-text-muted">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {format(entryDate, "HH:mm", { locale: fr })}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-sl-gold" />
                                <span className="text-sl-gold">+{entry.xp_gained_today} XP gagnés</span>
                              </div>
                              <div className="flex items-center gap-1.5" style={{ color: moodConfig.color }}>
                                <Smile className="w-3.5 h-3.5" />
                                {moodConfig.label}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-sl-purple opacity-20" />
          <p className="text-sl-text-muted">Commence à écrire dans ton journal</p>
        </div>
      )}
    </div>
  )
}
