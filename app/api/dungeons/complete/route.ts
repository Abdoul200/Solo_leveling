import { NextResponse } from 'next/server'
import { createServerSupabaseClient, updateXP } from '@/lib/supabase'
import { checkTitleUnlock, checkSkillUnlock, generateDungeonRewards } from '@/lib/gameEngine'
import type { Rank } from '@/lib/types'

// ============================================================
// POST /api/dungeons/complete
// Body: { dungeonId, userId }
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { dungeonId, userId } = body

    if (!dungeonId || !userId) {
      return NextResponse.json(
        { error: 'dungeonId et userId sont requis' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Récupérer le donjon
    const { data: dungeon, error: fetchError } = await supabase
      .from('dungeons')
      .select('*')
      .eq('id', dungeonId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !dungeon) {
      return NextResponse.json({ error: 'Donjon introuvable' }, { status: 404 })
    }

    if (dungeon.status === 'completed') {
      return NextResponse.json({ error: 'Ce donjon est déjà complété' }, { status: 400 })
    }

    if (dungeon.status === 'failed') {
      return NextResponse.json({ error: 'Ce donjon a échoué' }, { status: 400 })
    }

    // Calculer le XP avec bonus de temps
    const baseXP = dungeon.xp_reward
    let bonusXP = 0

    // Bonus si complété rapidement (pour les donjons sprint avec limite de temps)
    if (dungeon.time_limit_minutes && dungeon.type === 'sprint') {
      // On accorde un bonus symbolique pour avoir complété le donjon
      bonusXP = Math.floor(baseXP * 0.1)
    }

    const totalXP = baseXP + bonusXP

    // Marquer le donjon comme complété
    const { data: completedDungeon, error: updateError } = await supabase
      .from('dungeons')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', dungeonId)
      .select()
      .single()

    if (updateError) throw updateError

    // Attribuer l'XP
    const xpResult = await updateXP(userId, dungeon.subject_id, totalXP)

    // Récupérer le profil frais pour vérifier les titres
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('streak_days, titles_unlocked, skills_unlocked, global_rank')
      .eq('id', userId)
      .single()

    // Récupérer les stats agrégées
    const { data: questStats } = await supabase
      .from('quests')
      .select('status, type')
      .eq('user_id', userId)
      .eq('status', 'completed')

    const { data: dungeonStats } = await supabase
      .from('dungeons')
      .select('status, type')
      .eq('user_id', userId)
      .eq('status', 'completed')

    const { data: workoutStats } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)

    let newTitles: string[] = []
    let newSkills: string[] = []

    if (freshProfile) {
      const dungeonCount = dungeonStats?.length ?? 0
      const bossCount = dungeonStats?.filter((d: { type: string; status: string }) => d.type === 'boss').length ?? 0

      const userStats = {
        quests_completed: questStats?.length ?? 0,
        daily_quests_completed: questStats?.filter((q: { type: string }) => q.type === 'daily').length ?? 0,
        dungeons_cleared: dungeonCount,
        bosses_defeated: bossCount,
        streak_days: freshProfile.streak_days,
        workouts_completed: workoutStats?.length ?? 0,
        global_rank: (xpResult.newRank || freshProfile.global_rank) as Rank,
        titles_unlocked: freshProfile.titles_unlocked || [],
        skills_unlocked: freshProfile.skills_unlocked || [],
      }

      // Pour le premier donjon
      const action = dungeonCount === 1 ? 'first_dungeon' : undefined
      newTitles = checkTitleUnlock(userStats, action)
      newSkills = checkSkillUnlock(userStats)

      // Sauvegarder les nouveaux titres/compétences
      if (newTitles.length > 0 || newSkills.length > 0) {
        const updatedTitles = [...(freshProfile.titles_unlocked || []), ...newTitles]
        const updatedSkills = [...(freshProfile.skills_unlocked || []), ...newSkills]

        await supabase
          .from('profiles')
          .update({
            titles_unlocked: updatedTitles,
            skills_unlocked: updatedSkills,
          })
          .eq('id', userId)
      }
    }

    // Récupérer les noms des récompenses depuis les constantes
    const { titles: potentialTitles, skills: potentialSkills } = generateDungeonRewards(dungeon.rank as Rank)

    return NextResponse.json({
      dungeon: completedDungeon,
      xp_earned: totalXP,
      base_xp: baseXP,
      bonus_xp: bonusXP,
      xp_result: xpResult,
      level_up: xpResult.levelUp,
      rank_up: xpResult.rankUp,
      new_rank: xpResult.newRank,
      old_rank: xpResult.oldRank,
      new_titles: newTitles,
      new_skills: newSkills,
      potential_titles: potentialTitles,
      potential_skills: potentialSkills,
      message: `Donjon ${dungeon.title} vaincu ! +${totalXP} XP`,
    })

  } catch (error) {
    console.error('Erreur complétion donjon:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
