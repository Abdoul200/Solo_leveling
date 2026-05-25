'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Star, Flame, Calendar, Smile, Meh, Frown } from 'lucide-react'
import type { JournalEntry } from '@/lib/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

type Mood = 'excellent' | 'bien' | 'neutre' | 'difficile' | 'terrible'

const MOOD_CONFIG: Record<Mood, { label: string; emoji: string; color: string }> = {
  excellent: { label: 'Excellent', emoji: '🔥', color: '#10b981' },
  bien: { label: 'Bien', emoji: '😊', color: '#00d4ff' },
  neutre: { label: 'Neutre', emoji: '😐', color: '#94a3b8' },
  difficile: { label: 'Difficile', emoji: '😔', color: '#f59e0b' },
  terrible: { label: 'Terrible', emoji: '💀', color: '#ef4444' },
}

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: 'j1',
    user_id: 'u1',
    content: 'Excellente journée ! J\'ai réussi à compléter toutes mes quêtes de révision et même à terminer le donjon sprint de rang C. Le cours d\'algèbre commence à vraiment faire sens. Je me sens en train de progresser vraiment vite. La série continue !',
    mood: 'excellent',
    xp_gained_today: 420,
    quests_completed: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'j2',
    user_id: 'u1',
    content: 'Journée plutôt bien. J\'ai eu du mal à me concentrer le matin mais l\'après-midi a été productif. 2 révisions terminées + séance de sport. Le boss d\'examen approche et ça me motive à travailler encore plus.',
    mood: 'bien',
    xp_gained_today: 280,
    quests_completed: 3,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'j3',
    user_id: 'u1',
    content: 'Journée difficile. Trop de distractions et j\'ai manqué 2 quêtes. La fatigue se fait sentir. Mais j\'ai quand même fait le minimum pour maintenir ma série. Demain sera meilleur.',
    mood: 'difficile',
    xp_gained_today: 60,
    quests_completed: 1,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'j4',
    user_id: 'u1',
    content: 'Super journée ! Rang C atteint en Informatique ! Ça fait un moment que je travaille vers cet objectif. La progression est réelle et motivante. J\'ai complété 5 quêtes dont une spéciale.',
    mood: 'excellent',
    xp_gained_today: 580,
    quests_completed: 5,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
]

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>(MOCK_ENTRIES)
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newMood, setNewMood] = useState<Mood>('bien')
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  const todayEntry = entries.find(e => {
    const entryDate = new Date(e.created_at)
    const today = new Date()
    return entryDate.toDateString() === today.toDateString()
  })

  const handleSaveEntry = () => {
    if (!newContent.trim()) {
      toast.error('Écris quelque chose dans ton journal')
      return
    }

    if (todayEntry) {
      setEntries(prev => prev.map(e =>
        e.id === todayEntry.id
          ? { ...e, content: newContent, mood: newMood }
          : e
      ))
      toast.success('Journal mis à jour')
    } else {
      const newEntry: JournalEntry = {
        id: `j_${Date.now()}`,
        user_id: 'u1',
        content: newContent,
        mood: newMood,
        xp_gained_today: 0,
        quests_completed: 0,
        created_at: new Date().toISOString(),
      }
      setEntries(prev => [newEntry, ...prev])
      toast.success('Entrée de journal sauvegardée')
    }

    setShowNewEntry(false)
    setNewContent('')
    setNewMood('bien')
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-sl-text mb-1">Journal du Chasseur</h1>
          <p className="text-sm text-sl-text-muted">Chronique de ton parcours vers le rang Monarque</p>
        </div>

        {!todayEntry && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewEntry(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white', boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)' }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle entrée
          </motion.button>
        )}
      </div>

      {/* Rappel journal du jour */}
      {!todayEntry && !showNewEntry && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 mb-6 flex items-center gap-3 cursor-pointer"
          style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)' }}
          onClick={() => setShowNewEntry(true)}
          whileHover={{ scale: 1.01 }}
        >
          <BookOpen className="w-5 h-5 text-sl-purple" />
          <div>
            <div className="font-medium text-sl-text text-sm">Aucune entrée aujourd&apos;hui</div>
            <div className="text-xs text-sl-text-muted">Écris dans ton journal pour +50 XP bonus</div>
          </div>
          <div className="ml-auto text-sl-purple text-sm font-semibold">Écrire →</div>
        </motion.div>
      )}

      {/* Formulaire nouvelle entrée */}
      <AnimatePresence>
        {showNewEntry && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="rounded-xl p-5" style={{ background: 'rgba(15, 15, 26, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div className="text-sm font-bold text-sl-text mb-4">
                {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
              </div>

              {/* Sélection humeur */}
              <div className="mb-4">
                <div className="text-xs text-sl-text-muted mb-2 uppercase tracking-wider">Comment s&apos;est passée la journée ?</div>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(MOOD_CONFIG) as [Mood, typeof MOOD_CONFIG[Mood]][]).map(([mood, config]) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setNewMood(mood)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                      style={{
                        background: newMood === mood ? `${config.color}20` : 'rgba(255,255,255,0.04)',
                        border: newMood === mood ? `1px solid ${config.color}` : '1px solid rgba(255,255,255,0.08)',
                        color: newMood === mood ? config.color : '#94a3b8',
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
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Raconte ta journée... Qu'as-tu accompli ? Quelles difficultés as-tu rencontrées ? Comment te sens-tu par rapport à ta progression ?"
                rows={6}
                className="w-full py-3 px-4 rounded-xl text-sm outline-none resize-none mb-4"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: '#e2e8f0',
                  lineHeight: '1.6',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)'}
              />

              <div className="flex gap-3">
                <button onClick={() => { setShowNewEntry(false); setNewContent('') }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Annuler
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSaveEntry}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white', boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)' }}>
                  <BookOpen className="w-4 h-4" />
                  Sauvegarder
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entrées du journal */}
      <div className="space-y-4">
        {entries.map((entry, i) => {
          const moodConfig = MOOD_CONFIG[entry.mood]
          const entryDate = new Date(entry.created_at)
          const isToday = entryDate.toDateString() === new Date().toDateString()
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
                border: isToday ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* En-tête */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
              >
                {/* Mood orb */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${moodConfig.color}15`, border: `1px solid ${moodConfig.color}30` }}
                >
                  {moodConfig.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="font-medium text-sl-text text-sm">
                      {isToday ? 'Aujourd\'hui' : format(entryDate, "EEEE d MMMM", { locale: fr })}
                    </div>
                    {isToday && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>
                        Actuel
                      </span>
                    )}
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

                        {isToday && (
                          <button
                            onClick={() => { setNewContent(entry.content); setNewMood(entry.mood); setShowNewEntry(true) }}
                            className="mt-3 text-xs text-sl-purple hover:text-sl-blue transition-colors"
                          >
                            ✏️ Modifier cette entrée
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-sl-purple opacity-20" />
          <p className="text-sl-text-muted">Commence à écrire dans ton journal</p>
        </div>
      )}
    </div>
  )
}
