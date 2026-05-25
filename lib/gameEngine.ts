/**
 * Moteur de jeu — logique centralisée Solo Leveling
 * Toutes les formules et calculs de gameplay
 */

import type { Rank, UserProfile, Subject } from './types'
import { RANKS, RANK_XP_THRESHOLDS, calculateRank } from './ranks'
import { AVAILABLE_TITLES, AVAILABLE_SKILLS, SPACED_REPETITION_INTERVALS, XP_REWARDS } from './constants'

// ============================================================
// PROBABILITÉ DE SPAWN DE DONJON
// ============================================================

/**
 * Calcule la probabilité de spawn d'un donjon aléatoire (0–1)
 * Facteurs: rang global, jours depuis dernier donjon, quêtes complétées cette semaine
 */
export function calculateDungeonSpawnProbability(
  userProfile: Pick<UserProfile, 'global_rank' | 'global_level'>,
  lastDungeonDate: Date | null,
  questsCompletedThisWeek: number
): number {
  // Probabilité de base selon le rang
  const rankProbabilities: Record<Rank, number> = {
    E: 0.10,
    D: 0.13,
    C: 0.15,
    B: 0.18,
    A: 0.20,
    S: 0.22,
    SS: 0.25,
    SSS: 0.28,
    Monarque: 0.30,
  }

  let probability = rankProbabilities[userProfile.global_rank] ?? 0.10

  // Bonus selon les jours depuis le dernier donjon
  if (lastDungeonDate) {
    const daysSinceLast = Math.floor(
      (Date.now() - lastDungeonDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    // +2% par jour d'absence (max +20%)
    probability += Math.min(daysSinceLast * 0.02, 0.20)
  } else {
    // Premier donjon → forte probabilité
    probability += 0.25
  }

  // Bonus selon les quêtes complétées cette semaine
  if (questsCompletedThisWeek >= 10) probability += 0.10
  else if (questsCompletedThisWeek >= 5) probability += 0.05
  else if (questsCompletedThisWeek >= 3) probability += 0.02

  return Math.min(probability, 0.85) // Plafond à 85%
}

// ============================================================
// RÉCOMPENSES DE DONJON
// ============================================================

/**
 * Génère les récompenses selon le rang du donjon
 */
export function generateDungeonRewards(rank: Rank): {
  xp: number
  titles: string[]
  skills: string[]
} {
  const xpByRank: Record<Rank, number> = {
    E: 200,
    D: 350,
    C: 550,
    B: 800,
    A: 1200,
    S: 1800,
    SS: 2800,
    SSS: 4500,
    Monarque: 7500,
  }

  const titlesByRank: Record<string, string[]> = {
    E: ['first-dungeon'],
    D: ['dungeons-5'],
    B: ['dungeons-5'],
    A: ['dungeons-20'],
    S: ['rank-s'],
    SS: ['all-dungeons'],
    SSS: ['all-dungeons'],
    Monarque: ['rank-monarch', 'all-dungeons'],
  }

  const skillsByRank: Record<string, string[]> = {
    D: ['dungeon-sense'],
    A: ['boss-hunter'],
    S: ['shadow-monarch-power'],
  }

  return {
    xp: xpByRank[rank] ?? 200,
    titles: titlesByRank[rank] ?? [],
    skills: skillsByRank[rank] ?? [],
  }
}

// ============================================================
// BOSS HP
// ============================================================

/**
 * Calcule les HP d'un boss selon le rang de la matière
 * Rang E = 100 HP, Monarque = 1000 HP
 */
export function calculateBossHP(subjectRank: Rank): number {
  const hpByRank: Record<Rank, number> = {
    E: 100,
    D: 175,
    C: 275,
    B: 400,
    A: 550,
    S: 700,
    SS: 825,
    SSS: 925,
    Monarque: 1000,
  }
  return hpByRank[subjectRank] ?? 100
}

// ============================================================
// XP DES QUÊTES
// ============================================================

/**
 * Calcule l'XP d'une quête selon son type, durée et rang de la matière
 */
export function calculateQuestXP(
  questType: 'revision' | 'daily' | 'special' | 'physical',
  durationMinutes: number,
  subjectRank: Rank = 'E'
): number {
  const baseXPByType: Record<string, number> = {
    revision: XP_REWARDS.quest_revision_base,
    daily: XP_REWARDS.quest_daily_base,
    special: XP_REWARDS.quest_special_base,
    physical: XP_REWARDS.quest_physical_base,
  }

  const baseXP = baseXPByType[questType] ?? XP_REWARDS.quest_daily_base

  // Multiplicateur selon la durée (bonus pour les longues sessions)
  let durationMultiplier = 1.0
  if (durationMinutes >= 60) durationMultiplier = 1.5
  else if (durationMinutes >= 45) durationMultiplier = 1.3
  else if (durationMinutes >= 30) durationMultiplier = 1.15

  // Multiplicateur selon le rang de la matière
  const rankIndex = RANKS.indexOf(subjectRank)
  const rankMultiplier = 1 + rankIndex * 0.05 // +5% par rang

  return Math.round(baseXP * durationMultiplier * rankMultiplier)
}

// ============================================================
// DÉBLOCAGE DE TITRES
// ============================================================

interface UserStats {
  quests_completed: number
  daily_quests_completed: number
  dungeons_cleared: number
  bosses_defeated: number
  streak_days: number
  workouts_completed: number
  global_rank: Rank
  titles_unlocked: string[]
  skills_unlocked?: string[]
  all_subjects_rank_b?: boolean
}

/**
 * Vérifie quels nouveaux titres sont débloqués selon les stats
 * Retourne les IDs des nouveaux titres débloqués
 */
export function checkTitleUnlock(userStats: UserStats, action?: string): string[] {
  const newTitles: string[] = []

  for (const title of AVAILABLE_TITLES) {
    // Déjà débloqué
    if (userStats.titles_unlocked.includes(title.id)) continue

    let unlocked = false

    switch (title.condition) {
      case 'quests_completed >= 1':
        unlocked = userStats.quests_completed >= 1
        break
      case 'daily_quests_completed >= 10':
        unlocked = userStats.daily_quests_completed >= 10
        break
      case 'dungeons_cleared >= 1':
        unlocked = userStats.dungeons_cleared >= 1
        break
      case 'streak_days >= 3':
        unlocked = userStats.streak_days >= 3
        break
      case 'rank >= D':
        unlocked = RANKS.indexOf(userStats.global_rank) >= RANKS.indexOf('D')
        break
      case 'streak_days >= 7':
        unlocked = userStats.streak_days >= 7
        break
      case 'rank >= C':
        unlocked = RANKS.indexOf(userStats.global_rank) >= RANKS.indexOf('C')
        break
      case 'dungeons_cleared >= 5':
        unlocked = userStats.dungeons_cleared >= 5
        break
      case 'quests_completed >= 50':
        unlocked = userStats.quests_completed >= 50
        break
      case 'bosses_defeated >= 1':
        unlocked = userStats.bosses_defeated >= 1
        break
      case 'workouts_completed >= 10':
        unlocked = userStats.workouts_completed >= 10
        break
      case 'streak_days >= 30':
        unlocked = userStats.streak_days >= 30
        break
      case 'rank >= A':
        unlocked = RANKS.indexOf(userStats.global_rank) >= RANKS.indexOf('A')
        break
      case 'dungeons_cleared >= 20':
        unlocked = userStats.dungeons_cleared >= 20
        break
      case 'bosses_defeated >= 5':
        unlocked = userStats.bosses_defeated >= 5
        break
      case 'quests_completed >= 200':
        unlocked = userStats.quests_completed >= 200
        break
      case 'all_subjects_rank_b':
        unlocked = userStats.all_subjects_rank_b ?? false
        break
      case 'streak_days >= 100':
        unlocked = userStats.streak_days >= 100
        break
      case 'rank >= S':
        unlocked = RANKS.indexOf(userStats.global_rank) >= RANKS.indexOf('S')
        break
      case 'rank >= Monarque':
        unlocked = RANKS.indexOf(userStats.global_rank) >= RANKS.indexOf('Monarque')
        break
    }

    if (unlocked) {
      newTitles.push(title.id)
    }
  }

  // Action spécifique (ex: compléter un premier donjon)
  if (action === 'first_dungeon' && !userStats.titles_unlocked.includes('first-dungeon')) {
    if (!newTitles.includes('first-dungeon')) newTitles.push('first-dungeon')
  }

  return newTitles
}

// ============================================================
// DÉBLOCAGE DE COMPÉTENCES
// ============================================================

/**
 * Vérifie quelles nouvelles compétences sont débloquées
 */
export function checkSkillUnlock(userStats: UserStats): string[] {
  const newSkills: string[] = []

  const conditionMet: Record<string, boolean> = {
    rank_d: RANKS.indexOf(userStats.global_rank) >= RANKS.indexOf('D'),
    quests_50: userStats.quests_completed >= 50,
    streak_7: userStats.streak_days >= 7,
    dungeons_5: userStats.dungeons_cleared >= 5,
    bosses_1: userStats.bosses_defeated >= 1,
    workouts_10: userStats.workouts_completed >= 10,
    reviews_20: userStats.quests_completed >= 20, // proxy
    rank_s: RANKS.indexOf(userStats.global_rank) >= RANKS.indexOf('S'),
  }

  for (const skill of AVAILABLE_SKILLS) {
    const alreadyUnlocked = userStats.skills_unlocked?.includes(skill.id)
    if (!alreadyUnlocked && conditionMet[skill.unlock_condition]) {
      newSkills.push(skill.id)
    }
  }

  return newSkills
}

// ============================================================
// RÉVISION ESPACÉE
// ============================================================

/**
 * Génère les dates de révision espacée à partir d'une date d'étude
 * Intervalles: J+1, J+3, J+7, J+14, J+30
 */
export function generateSpacedRepetitionDates(studiedAt: Date): Date[] {
  return SPACED_REPETITION_INTERVALS.map((days) => {
    const date = new Date(studiedAt)
    date.setDate(date.getDate() + days)
    return date
  })
}

// ============================================================
// DÉGÂTS AU BOSS
// ============================================================

/**
 * Calcule les dégâts infligés au boss par une quête complétée
 */
export function calculateBossDamage(questXP: number, bossMaxHP: number): number {
  // Les dégâts sont proportionnels à l'XP de la quête vs HP max du boss
  // Une quête standard (50 XP) inflige ~5% des HP sur un boss E (100 HP)
  const damageRatio = questXP / 1000 // Normalise l'XP
  const damage = Math.round(bossMaxHP * damageRatio)
  return Math.max(damage, 5) // Minimum 5 dégâts par quête
}

// ============================================================
// RANGS DE DONJONS
// ============================================================

/**
 * Détermine le rang d'un donjon selon le rang de l'utilisateur
 */
export function calculateDungeonRank(userRank: Rank): Rank {
  const rankIndex = RANKS.indexOf(userRank)
  // Le donjon est légèrement inférieur ou égal au rang de l'utilisateur
  const minIndex = Math.max(0, rankIndex - 1)
  const maxIndex = Math.min(rankIndex + 1, RANKS.length - 1)
  const randomIndex = Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex
  return RANKS[randomIndex]
}

// ============================================================
// CALCUL GLOBAL RANK DEPUIS LES MATIÈRES
// ============================================================

/**
 * Calcule le rang global d'un utilisateur basé sur ses matières
 */
export function calculateGlobalRankFromSubjects(subjects: Subject[]): Rank {
  if (!subjects || subjects.length === 0) return 'E'

  const totalXP = subjects.reduce((sum, s) => sum + s.xp, 0)
  const avgXP = Math.floor(totalXP / subjects.length)

  return calculateRank(avgXP)
}

// ============================================================
// XP POUR LES RÉVISIONS ESPACÉES
// ============================================================

/**
 * Calcule l'XP bonus pour une révision espacée selon l'intervalle
 */
export function calculateReviewXP(intervalDays: number, baseXP: number): number {
  // Plus l'intervalle est long, plus la révision est précieuse
  const multipliers: Record<number, number> = {
    1: 1.0,
    3: 1.2,
    7: 1.4,
    14: 1.6,
    30: 2.0,
  }
  const multiplier = multipliers[intervalDays] ?? 1.0
  return Math.round(baseXP * multiplier)
}

// ============================================================
// STATS AGRÉGÉES
// ============================================================

/**
 * Calcule les statistiques agrégées pour le profil
 */
export function calculateAggregatedStats(data: {
  quests: Array<{ status: string; type: string; time_spent_minutes: number }>
  dungeons: Array<{ status: string; type: string }>
  workouts: Array<{ id: string }>
  streak_days: number
  max_streak: number
  titles_count: number
  subjects_count: number
  global_xp: number
}) {
  const completedQuests = data.quests.filter((q) => q.status === 'completed')
  const totalStudyMinutes = completedQuests.reduce(
    (sum, q) => sum + (q.time_spent_minutes ?? 0),
    0
  )

  return {
    total_xp: data.global_xp,
    total_quests_completed: completedQuests.length,
    total_study_hours: Math.round(totalStudyMinutes / 60),
    current_streak: data.streak_days,
    max_streak: data.max_streak,
    dungeons_cleared: data.dungeons.filter((d) => d.status === 'completed').length,
    bosses_defeated: data.dungeons.filter(
      (d) => d.status === 'completed' && d.type === 'boss'
    ).length,
    titles_count: data.titles_count,
    subjects_count: data.subjects_count,
  }
}
