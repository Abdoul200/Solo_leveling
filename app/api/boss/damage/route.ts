import { NextResponse } from 'next/server'
import { createServerSupabaseClient, updateXP } from '@/lib/supabase'
import { calculateBossDamage } from '@/lib/gameEngine'
import { checkTitleUnlock, checkSkillUnlock } from '@/lib/gameEngine'
import type { Rank } from '@/lib/types'

// ============================================================
// POST /api/boss/damage — Infliger des dégâts au boss
// Body: { bossId, userId, questId? }
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bossId, userId, questId, damage: manualDamage } = body

    if (!bossId || !userId) {
      return NextResponse.json(
        { error: 'bossId et userId sont requis' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Récupérer le boss
    const { data: boss, error: bossError } = await supabase
      .from('dungeons')
      .select('*')
      .eq('id', bossId)
      .eq('user_id', userId)
      .eq('type', 'boss')
      .single()

    if (bossError || !boss) {
      return NextResponse.json({ error: 'Boss introuvable' }, { status: 404 })
    }

    if (boss.status === 'completed') {
      return NextResponse.json({ error: 'Ce boss est déjà vaincu' }, { status: 400 })
    }

    if (boss.status === 'failed') {
      return NextResponse.json({ error: 'Ce boss a expiré' }, { status: 400 })
    }

    if (boss.current_hp === null || boss.current_hp === undefined) {
      return NextResponse.json({ error: 'Ce donjon n\'est pas un boss' }, { status: 400 })
    }

    // Calculer les dégâts
    let damage = manualDamage

    if (!damage && questId) {
      // Récupérer l'XP de la quête
      const { data: quest } = await supabase
        .from('quests')
        .select('xp_reward')
        .eq('id', questId)
        .eq('user_id', userId)
        .single()

      if (quest) {
        damage = calculateBossDamage(quest.xp_reward, boss.health_points || 100)
      }
    }

    if (!damage) {
      damage = calculateBossDamage(50, boss.health_points || 100) // Dégâts par défaut
    }

    const newHP = Math.max(0, boss.current_hp - damage)
    const bossDefeated = newHP <= 0

    // Mettre à jour les HP du boss
    const { data: updatedBoss, error: updateError } = await supabase
      .from('dungeons')
      .update({
        current_hp: newHP,
        status: bossDefeated ? 'completed' : boss.status,
        completed_at: bossDefeated ? new Date().toISOString() : null,
      })
      .eq('id', bossId)
      .select()
      .single()

    if (updateError) throw updateError

    let xpResult = null
    let newTitles: string[] = []
    let newSkills: string[] = []

    // Si boss vaincu → déclencher les récompenses
    if (bossDefeated) {
      const bossXP = boss.xp_reward

      xpResult = await updateXP(userId, boss.subject_id, bossXP)

      // Récupérer le profil frais
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('streak_days, titles_unlocked, skills_unlocked, global_rank')
        .eq('id', userId)
        .single()

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

      if (freshProfile) {
        const userStats = {
          quests_completed: questStats?.length ?? 0,
          daily_quests_completed: questStats?.filter((q: { type: string }) => q.type === 'daily').length ?? 0,
          dungeons_cleared: dungeonStats?.length ?? 0,
          bosses_defeated: dungeonStats?.filter((d: { type: string }) => d.type === 'boss').length ?? 0,
          streak_days: freshProfile.streak_days,
          workouts_completed: workoutStats?.length ?? 0,
          global_rank: (xpResult.newRank || freshProfile.global_rank) as Rank,
          titles_unlocked: freshProfile.titles_unlocked || [],
          skills_unlocked: freshProfile.skills_unlocked || [],
        }

        newTitles = checkTitleUnlock(userStats, 'first_dungeon')
        newSkills = checkSkillUnlock(userStats)

        if (newTitles.length > 0 || newSkills.length > 0) {
          await supabase
            .from('profiles')
            .update({
              titles_unlocked: [...(freshProfile.titles_unlocked || []), ...newTitles],
              skills_unlocked: [...(freshProfile.skills_unlocked || []), ...newSkills],
            })
            .eq('id', userId)
        }
      }
    }

    return NextResponse.json({
      boss: updatedBoss,
      damage_dealt: damage,
      current_hp: newHP,
      max_hp: boss.health_points,
      boss_defeated: bossDefeated,
      hp_percentage: boss.health_points ? Math.round((newHP / boss.health_points) * 100) : 0,
      xp_result: xpResult,
      new_titles: newTitles,
      new_skills: newSkills,
      message: bossDefeated
        ? `Boss vaincu ! +${boss.xp_reward} XP`
        : `${damage} dégâts infligés au boss ! PV restants: ${newHP}/${boss.health_points}`,
    })

  } catch (error) {
    console.error('Erreur dégâts boss:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
