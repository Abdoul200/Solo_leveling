import { NextResponse } from 'next/server'
import { createServerSupabaseClient, updateXP } from '@/lib/supabase'
import { checkTitleUnlock, checkSkillUnlock } from '@/lib/gameEngine'
import type { Quest } from '@/lib/types'

// ============================================================
// POST /api/quests/timer
// Body: { questId, action: 'start' | 'pause' | 'complete' | 'abandon', userId }
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { questId, action, userId } = body

    if (!questId || !action || !userId) {
      return NextResponse.json(
        { error: 'questId, action et userId sont requis' },
        { status: 400 }
      )
    }

    const validActions = ['start', 'pause', 'complete', 'abandon']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Action invalide. Valeurs acceptées: start, pause, complete, abandon' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Récupérer la quête
    const { data: quest, error: fetchError } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !quest) {
      return NextResponse.json({ error: 'Quête introuvable' }, { status: 404 })
    }

    const q = quest as Quest

    switch (action) {
      // ──────────────────────────────────────────
      case 'start': {
        if (q.status !== 'pending' && q.status !== 'active') {
          return NextResponse.json(
            { error: `La quête ne peut pas être démarrée (statut: ${q.status})` },
            { status: 400 }
          )
        }

        const { data, error } = await supabase
          .from('quests')
          .update({
            status: 'active',
            timer_started_at: new Date().toISOString(),
          })
          .eq('id', questId)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ quest: data, message: 'Quête démarrée' })
      }

      // ──────────────────────────────────────────
      case 'pause': {
        if (q.status !== 'active') {
          return NextResponse.json(
            { error: 'La quête n\'est pas active' },
            { status: 400 }
          )
        }

        const elapsedMinutes = q.timer_started_at
          ? Math.floor((Date.now() - new Date(q.timer_started_at).getTime()) / 60000)
          : 0

        const newTimeSpent = q.time_spent_minutes + elapsedMinutes

        const { data, error } = await supabase
          .from('quests')
          .update({
            status: 'pending',
            time_spent_minutes: newTimeSpent,
            timer_started_at: null,
          })
          .eq('id', questId)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({
          quest: data,
          time_spent_minutes: newTimeSpent,
          message: 'Quête mise en pause',
        })
      }

      // ──────────────────────────────────────────
      case 'complete': {
        if (q.status !== 'active' && q.status !== 'pending') {
          return NextResponse.json(
            { error: 'La quête ne peut pas être complétée dans son état actuel' },
            { status: 400 }
          )
        }

        const elapsedMinutes = q.timer_started_at
          ? Math.floor((Date.now() - new Date(q.timer_started_at).getTime()) / 60000)
          : 0

        const totalTimeSpent = q.time_spent_minutes + elapsedMinutes

        // Vérifier le temps minimum
        if (totalTimeSpent < q.min_duration_minutes) {
          return NextResponse.json(
            {
              error: `Temps insuffisant. Minimum requis: ${q.min_duration_minutes} minutes. Temps actuel: ${totalTimeSpent} min`,
              time_spent: totalTimeSpent,
              time_required: q.min_duration_minutes,
            },
            { status: 400 }
          )
        }

        // Marquer la quête comme complétée
        const { data: completedQuest, error: updateError } = await supabase
          .from('quests')
          .update({
            status: 'completed',
            time_spent_minutes: totalTimeSpent,
            timer_started_at: null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', questId)
          .select()
          .single()

        if (updateError) throw updateError

        // Attribuer l'XP via updateXP()
        const xpResult = await updateXP(userId, q.subject_id, q.xp_reward)

        // Récupérer les stats pour vérifier les titres/compétences
        const { data: stats } = await supabase
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

        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('streak_days, titles_unlocked, skills_unlocked, global_rank')
          .eq('id', userId)
          .single()

        let newTitles: string[] = []
        let newSkills: string[] = []

        if (freshProfile && stats) {
          type DungeonRow = { status: string; type: string }
          type QuestRow = { status: string; type: string }
          const completedQuestsCount = stats.length
          const dungeonCount = (dungeonStats as DungeonRow[] | null)?.filter((d) => d.status === 'completed').length ?? 0
          const bossCount = (dungeonStats as DungeonRow[] | null)?.filter((d) => d.status === 'completed' && d.type === 'boss').length ?? 0

          const userStats = {
            quests_completed: completedQuestsCount,
            daily_quests_completed: (stats as QuestRow[]).filter((q) => q.type === 'daily').length,
            dungeons_cleared: dungeonCount,
            bosses_defeated: bossCount,
            streak_days: freshProfile.streak_days,
            workouts_completed: workoutStats?.length ?? 0,
            global_rank: 'E' as import('@/lib/types').Rank,
            titles_unlocked: freshProfile.titles_unlocked || [],
            skills_unlocked: freshProfile.skills_unlocked || [],
          }

          // Utiliser le bon type pour global_rank
          const statsWithRank = {
            ...userStats,
            global_rank: (xpResult.newRank || freshProfile.global_rank) as import('@/lib/types').Rank,
          }

          newTitles = checkTitleUnlock(statsWithRank)
          newSkills = checkSkillUnlock({ ...statsWithRank, skills_unlocked: freshProfile.skills_unlocked || [] })

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

        return NextResponse.json({
          quest: completedQuest,
          xp_earned: q.xp_reward,
          xp_result: xpResult,
          level_up: xpResult.levelUp,
          rank_up: xpResult.rankUp,
          new_rank: xpResult.newRank,
          old_rank: xpResult.oldRank,
          new_titles: newTitles,
          new_skills: newSkills,
          message: 'Quête accomplie ! XP attribué.',
        })
      }

      // ──────────────────────────────────────────
      case 'abandon': {
        if (q.status !== 'active' && q.status !== 'pending') {
          return NextResponse.json(
            { error: 'La quête ne peut pas être abandonnée dans son état actuel' },
            { status: 400 }
          )
        }

        const elapsedMinutes = q.timer_started_at
          ? Math.floor((Date.now() - new Date(q.timer_started_at).getTime()) / 60000)
          : 0

        const { data, error } = await supabase
          .from('quests')
          .update({
            status: 'failed',
            time_spent_minutes: q.time_spent_minutes + elapsedMinutes,
            timer_started_at: null,
          })
          .eq('id', questId)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ quest: data, message: 'Quête abandonnée' })
      }

      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

  } catch (error) {
    console.error('Erreur timer quête:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
