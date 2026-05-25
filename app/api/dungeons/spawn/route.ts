import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { calculateDungeonSpawnProbability, calculateDungeonRank, generateDungeonRewards } from '@/lib/gameEngine'
import type { Dungeon, Rank, Subject } from '@/lib/types'
import { RANKS } from '@/lib/ranks'

// Templates de titres et descriptions de donjons
const DUNGEON_TITLES = [
  'Crypte des Connaissances Oubliées',
  'Tour de la Maîtrise Absolue',
  'Abîme de la Révision Éternelle',
  'Citadelle du Savoir Interdit',
  'Labyrinthe de la Logique Pure',
  'Sanctuaire de la Concentration',
  'Caverne des Théorèmes Perdus',
  'Forteresse de la Discipline',
  'Donjon des Épreuves Mentales',
  'Temple de l\'Éveil Intellectuel',
]

const DUNGEON_DESCRIPTIONS = [
  'Une épreuve de concentration intensive t\'attend dans ce donjon. Seuls les chasseurs déterminés en sortiront victorieux.',
  'Les gardiens du savoir testent ta maîtrise des connaissances. Prépare-toi à donner le meilleur de toi-même.',
  'Surmonte ce défi pour prouver ta valeur en tant que chasseur. La récompense sera à la hauteur de l\'effort.',
  'Une session de travail intense est requise pour franchir ce donjon. Le Système a créé cette épreuve pour toi.',
  'Les ombres du donjon ne reculent que devant la lumière de la connaissance. Étudie et triomphe.',
]

// ============================================================
// POST /api/dungeons/spawn
// Body: { userId, type: 'random' | 'manual', subjectId?, userRank? }
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, type = 'random', subjectId, userRank, force = false } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Récupérer les données de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_rank, global_level')
      .eq('id', userId)
      .single()

    const currentRank: Rank = (userRank || profile?.global_rank || 'E') as Rank

    // Vérifier les donjons disponibles existants
    const { data: activeDungeons } = await supabase
      .from('dungeons')
      .select('id, spawned_at')
      .eq('user_id', userId)
      .eq('status', 'available')
      .order('spawned_at', { ascending: false })

    if (!force && activeDungeons && activeDungeons.length >= 3) {
      return NextResponse.json({
        spawned: false,
        message: 'Trop de donjons disponibles — complète d\'abord les donjons existants',
      })
    }

    // Calcul probabilité pour spawn aléatoire
    if (type === 'random' && !force) {
      // Récupérer le dernier donjon complété
      const { data: lastDungeon } = await supabase
        .from('dungeons')
        .select('completed_at, spawned_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      // Quêtes complétées cette semaine
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count: questsThisWeek } = await supabase
        .from('quests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', weekAgo)

      const lastDungeonDate = lastDungeon?.completed_at
        ? new Date(lastDungeon.completed_at)
        : lastDungeon?.spawned_at
          ? new Date(lastDungeon.spawned_at)
          : null

      const spawnProb = calculateDungeonSpawnProbability(
        { global_rank: currentRank, global_level: profile?.global_level || 1 },
        lastDungeonDate,
        questsThisWeek || 0
      )

      if (Math.random() > spawnProb) {
        return NextResponse.json({ spawned: false, message: 'Aucun donjon apparu cette fois', probability: spawnProb })
      }
    }

    // Déterminer le rang du donjon
    const dungeonRank = calculateDungeonRank(currentRank)

    // Déterminer la matière (aléatoire parmi les matières de l'user si non spécifiée)
    let selectedSubjectId: string | null = subjectId || null
    let subjectRank: Rank = 'E'

    if (!selectedSubjectId) {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, rank')
        .eq('user_id', userId)

      if (subjects && subjects.length > 0) {
        const randomSubject = (subjects as Subject[])[Math.floor(Math.random() * subjects.length)]
        selectedSubjectId = randomSubject.id
        subjectRank = randomSubject.rank as Rank
      }
    } else {
      const { data: subject } = await supabase
        .from('subjects')
        .select('rank')
        .eq('id', selectedSubjectId)
        .single()
      if (subject) subjectRank = subject.rank as Rank
    }

    // Générer les récompenses
    const rewards = generateDungeonRewards(dungeonRank)

    // Calculer les multiplicateurs XP selon le rang
    const rankMultipliers: Record<Rank, number> = {
      E: 1, D: 1.5, C: 2, B: 3, A: 4, S: 5, SS: 7, SSS: 10, Monarque: 15,
    }
    const xpReward = Math.floor(rewards.xp * (rankMultipliers[dungeonRank] / rankMultipliers['E']))

    // Calculer la limite de temps (donjons sprint)
    const timeLimits = [60, 90, 120, 150]
    const rankIdx = RANKS.indexOf(dungeonRank)
    const timeLimit = timeLimits[Math.min(rankIdx, timeLimits.length - 1)]

    // Construire le titre avec la matière si dispo
    const randomTitle = DUNGEON_TITLES[Math.floor(Math.random() * DUNGEON_TITLES.length)]
    const randomDescription = DUNGEON_DESCRIPTIONS[Math.floor(Math.random() * DUNGEON_DESCRIPTIONS.length)]

    const rewardsList = [
      `+${xpReward} XP`,
      `Badge Rang ${dungeonRank}`,
      ...rewards.titles.map((t) => `Titre: ${t}`),
      ...rewards.skills.map((s) => `Compétence: ${s}`),
    ].filter(Boolean)

    const newDungeon: Omit<Dungeon, 'id'> = {
      user_id: userId,
      subject_id: selectedSubjectId,
      title: randomTitle,
      description: randomDescription,
      type: 'sprint',
      rank: dungeonRank,
      status: 'available',
      spawn_type: type === 'manual' ? 'manual' : 'random',
      xp_reward: xpReward,
      time_limit_minutes: timeLimit,
      health_points: null,
      current_hp: null,
      exam_date: null,
      rewards: rewardsList,
      spawned_at: new Date().toISOString(),
      completed_at: null,
    }

    const { data: dungeon, error } = await supabase
      .from('dungeons')
      .insert(newDungeon)
      .select()
      .single()

    if (error) throw error

    // Créer une notification en DB
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'dungeon',
        title: 'Donjon détecté !',
        message: `Un donjon de Rang ${dungeonRank} est apparu : ${randomTitle}`,
        read: false,
      })
      .select()
      .maybeSingle() // Silencieux si la table n'existe pas encore

    return NextResponse.json({
      spawned: true,
      dungeon,
      subject_rank: subjectRank,
      message: `Donjon de Rang ${dungeonRank} apparu !`,
    })

  } catch (error) {
    console.error('Erreur spawn donjon:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
