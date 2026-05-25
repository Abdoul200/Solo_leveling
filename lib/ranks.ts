import type { Rank } from './types'

// Liste des rangs dans l'ordre croissant
export const RANKS: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Monarque']

// Couleurs associées à chaque rang
export const RANK_COLORS: Record<Rank, string> = {
  'E': '#6b7280',
  'D': '#10b981',
  'C': '#3b82f6',
  'B': '#8b5cf6',
  'A': '#f59e0b',
  'S': '#ef4444',
  'SS': '#f97316',
  'SSS': '#ec4899',
  'Monarque': '#00d4ff',
}

// Couleurs de glow pour les effets visuels
export const RANK_GLOW_COLORS: Record<Rank, string> = {
  'E': 'rgba(107, 114, 128, 0.4)',
  'D': 'rgba(16, 185, 129, 0.4)',
  'C': 'rgba(59, 130, 246, 0.4)',
  'B': 'rgba(139, 92, 246, 0.4)',
  'A': 'rgba(245, 158, 11, 0.4)',
  'S': 'rgba(239, 68, 68, 0.4)',
  'SS': 'rgba(249, 115, 22, 0.4)',
  'SSS': 'rgba(236, 72, 153, 0.4)',
  'Monarque': 'rgba(0, 212, 255, 0.5)',
}

// Seuils XP pour chaque rang
export const RANK_XP_THRESHOLDS: Record<Rank, number> = {
  'E': 0,
  'D': 500,
  'C': 1500,
  'B': 3500,
  'A': 7000,
  'S': 12000,
  'SS': 20000,
  'SSS': 35000,
  'Monarque': 60000,
}

// Niveaux par palier (20 niveaux par rang)
export const LEVELS_PER_RANK = 20

// XP par niveau dans un rang
export const XP_PER_LEVEL = 50

// Calculer le rang en fonction de l'XP total
export function calculateRank(xp: number): Rank {
  const ranks = [...RANKS].reverse()
  for (const rank of ranks) {
    if (xp >= RANK_XP_THRESHOLDS[rank]) {
      return rank
    }
  }
  return 'E'
}

// Calculer le niveau (1-20) dans un rang
export function calculateLevel(xp: number): number {
  const rank = calculateRank(xp)
  const rankThreshold = RANK_XP_THRESHOLDS[rank]
  const xpInRank = xp - rankThreshold
  const level = Math.floor(xpInRank / XP_PER_LEVEL) + 1
  return Math.min(level, LEVELS_PER_RANK)
}

// XP nécessaire pour atteindre le prochain rang
export function getXpToNextRank(currentXp: number, rank: Rank): number {
  const currentRankIndex = RANKS.indexOf(rank)
  if (currentRankIndex === RANKS.length - 1) {
    return 0 // Déjà au rang maximum
  }
  const nextRank = RANKS[currentRankIndex + 1]
  return RANK_XP_THRESHOLDS[nextRank] - currentXp
}

// Progression en pourcentage dans le rang actuel (0-100)
export function getRankProgress(currentXp: number, rank: Rank): number {
  const rankThreshold = RANK_XP_THRESHOLDS[rank]
  const currentRankIndex = RANKS.indexOf(rank)

  if (currentRankIndex === RANKS.length - 1) {
    return 100 // Rang maximum
  }

  const nextRank = RANKS[currentRankIndex + 1]
  const nextRankThreshold = RANK_XP_THRESHOLDS[nextRank]
  const xpInCurrentRank = currentXp - rankThreshold
  const xpNeededForNextRank = nextRankThreshold - rankThreshold

  return Math.min(Math.round((xpInCurrentRank / xpNeededForNextRank) * 100), 100)
}

// Progression en pourcentage dans le niveau actuel (0-100)
export function getLevelProgress(currentXp: number): number {
  const rank = calculateRank(currentXp)
  const rankThreshold = RANK_XP_THRESHOLDS[rank]
  const xpInRank = currentXp - rankThreshold
  const levelXp = xpInRank % XP_PER_LEVEL
  return Math.round((levelXp / XP_PER_LEVEL) * 100)
}

// XP total nécessaire pour un rang donné
export function getXpForRank(rank: Rank): number {
  return RANK_XP_THRESHOLDS[rank]
}

// Nom complet du rang avec son emoji
export function getRankDisplay(rank: Rank): { short: string; full: string; emoji: string } {
  const displays: Record<Rank, { short: string; full: string; emoji: string }> = {
    'E': { short: 'E', full: 'Rang E', emoji: '⬛' },
    'D': { short: 'D', full: 'Rang D', emoji: '🟩' },
    'C': { short: 'C', full: 'Rang C', emoji: '🟦' },
    'B': { short: 'B', full: 'Rang B', emoji: '🟪' },
    'A': { short: 'A', full: 'Rang A', emoji: '🟨' },
    'S': { short: 'S', full: 'Rang S', emoji: '🟥' },
    'SS': { short: 'SS', full: 'Rang SS', emoji: '🔶' },
    'SSS': { short: 'SSS', full: 'Rang SSS', emoji: '💎' },
    'Monarque': { short: 'MON', full: 'Monarque', emoji: '👑' },
  }
  return displays[rank]
}

// Description du rang
export function getRankDescription(rank: Rank): string {
  const descriptions: Record<Rank, string> = {
    'E': 'Éveillé novice — Les premières lueurs du potentiel',
    'D': 'Chasseur débutant — La maîtrise commence',
    'C': 'Chasseur intermédiaire — Les fondations sont solides',
    'B': 'Chasseur confirmé — Le pouvoir grandit',
    'A': 'Chasseur élite — La maîtrise se forge',
    'S': 'Chasseur légendaire — La légende prend forme',
    'SS': 'Chasseur mythique — Au-delà des limites',
    'SSS': 'Chasseur transcendant — La limite est brisée',
    'Monarque': 'Monarque — Le souverain absolu',
  }
  return descriptions[rank]
}

// Gradient CSS pour le rang
export function getRankGradient(rank: Rank): string {
  const gradients: Record<Rank, string> = {
    'E': 'linear-gradient(135deg, #4b5563, #6b7280)',
    'D': 'linear-gradient(135deg, #059669, #10b981)',
    'C': 'linear-gradient(135deg, #2563eb, #3b82f6)',
    'B': 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
    'A': 'linear-gradient(135deg, #d97706, #f59e0b)',
    'S': 'linear-gradient(135deg, #dc2626, #ef4444)',
    'SS': 'linear-gradient(135deg, #ea580c, #f97316)',
    'SSS': 'linear-gradient(135deg, #db2777, #ec4899)',
    'Monarque': 'linear-gradient(135deg, #0ea5e9, #00d4ff, #8b5cf6)',
  }
  return gradients[rank]
}

// Fix pour la fonction getLevelProgress (utiliser le bon paramètre)
export function getLevelProgressFixed(currentXp: number): number {
  const rank = calculateRank(currentXp)
  const rankThreshold = RANK_XP_THRESHOLDS[rank]
  const xpInRank = currentXp - rankThreshold
  const levelXp = xpInRank % XP_PER_LEVEL
  return Math.round((levelXp / XP_PER_LEVEL) * 100)
}
