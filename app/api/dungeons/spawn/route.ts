import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { Dungeon, Rank } from '@/lib/types'
import { RANKS } from '@/lib/ranks'


// Probabilité de spawn par rang (en %)
const SPAWN_PROBABILITY = 0.15 // 15% de chance par vérification

// Rangs disponibles pour les spawns aléatoires
const SPAWN_RANKS: Rank[] = ['E', 'D', 'C', 'B']

// Templates de donjons
const DUNGEON_TEMPLATES = [
  {
    titles: [
      'Crypte des Connaissances Oubliées',
      'Tour de la Maîtrise',
      'Abîme de la Révision',
      'Citadelle du Savoir',
      'Labyrinthe de la Logique',
    ],
    descriptions: [
      'Une épreuve de concentration intensive t\'attend dans ce donjon.',
      'Les gardiens du savoir testent ta maîtrise.',
      'Surmonte ce défi pour prouver ta valeur.',
      'Une session de travail intense est requise pour franchir ce donjon.',
    ],
    type: 'sprint' as const,
    time_limits: [60, 90, 120],
    xp_base: 200,
  },
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, userRank, force = false } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    // Vérifier la probabilité de spawn (sauf si forcé)
    if (!force && Math.random() > SPAWN_PROBABILITY) {
      return NextResponse.json({ spawned: false, message: 'Aucun donjon apparu' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerSupabaseClient() as any

    // Vérifier les donjons actifs existants
    const { data: activeDungeons } = await supabase
      .from('dungeons')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'available')

    // Limiter à 3 donjons disponibles maximum
    if (activeDungeons && activeDungeons.length >= 3 && !force) {
      return NextResponse.json({ spawned: false, message: 'Trop de donjons disponibles' })
    }

    // Déterminer le rang du donjon (basé sur le rang de l'utilisateur)
    const userRankIndex = RANKS.indexOf(userRank || 'E')
    const maxRankIndex = Math.min(userRankIndex + 1, SPAWN_RANKS.length - 1)
    const minRankIndex = Math.max(0, userRankIndex - 1)
    const rankIndex = Math.floor(Math.random() * (maxRankIndex - minRankIndex + 1)) + minRankIndex
    const dungeonRank: Rank = SPAWN_RANKS[Math.min(rankIndex, SPAWN_RANKS.length - 1)]

    // Sélectionner un template
    const template = DUNGEON_TEMPLATES[Math.floor(Math.random() * DUNGEON_TEMPLATES.length)]
    const title = template.titles[Math.floor(Math.random() * template.titles.length)]
    const description = template.descriptions[Math.floor(Math.random() * template.descriptions.length)]
    const timeLimit = template.time_limits[Math.floor(Math.random() * template.time_limits.length)]

    // Calculer le XP en fonction du rang
    const rankMultipliers: Record<Rank, number> = { E: 1, D: 1.5, C: 2, B: 3, A: 4, S: 5, SS: 7, SSS: 10, Monarque: 15 }
    const xpReward = Math.floor(template.xp_base * (rankMultipliers[dungeonRank] || 1))

    const newDungeon: Omit<Dungeon, 'id'> = {
      user_id: userId,
      subject_id: null,
      title,
      description,
      type: template.type,
      rank: dungeonRank,
      status: 'available',
      spawn_type: 'random',
      xp_reward: xpReward,
      time_limit_minutes: timeLimit,
      health_points: null,
      current_hp: null,
      exam_date: null,
      rewards: [
        `+${xpReward} XP`,
        `Badge Rang ${dungeonRank}`,
        dungeonRank === 'S' || dungeonRank === 'SS' || dungeonRank === 'SSS' ? 'Titre spécial' : null,
      ].filter(Boolean) as string[],
      spawned_at: new Date().toISOString(),
      completed_at: null,
    }

    const { data: dungeon, error } = await supabase
      .from('dungeons')
      .insert(newDungeon)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      spawned: true,
      dungeon,
      message: `Donjon de Rang ${dungeonRank} apparu !`,
    })

  } catch (error) {
    console.error('Erreur spawn donjon:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
