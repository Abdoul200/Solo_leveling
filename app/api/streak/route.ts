import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { checkTitleUnlock } from '@/lib/gameEngine'
import type { Rank } from '@/lib/types'

// ============================================================
// POST /api/streak/check — Vérifier et mettre à jour le streak
// Body: { userId }
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('streak_days, last_active_date, global_rank, titles_unlocked, skills_unlocked')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const lastActiveDate = new Date(profile.last_active_date)
    const lastActiveDay = new Date(lastActiveDate)
    lastActiveDay.setHours(0, 0, 0, 0)

    let currentStreak = profile.streak_days
    let streakBroken = false
    let streakIncremented = false

    // Vérifier si l'utilisateur a déjà été actif aujourd'hui
    const alreadyActiveToday = lastActiveDay.getTime() === today.getTime()

    if (!alreadyActiveToday) {
      // Vérifier s'il y a eu une activité hier
      const wasActiveYesterday = lastActiveDay.getTime() === yesterday.getTime()

      if (wasActiveYesterday) {
        // Vérifier si l'utilisateur a fait au moins 1 quête ou 1 séance sport aujourd'hui
        const todayStart = today.toISOString()
        const todayEnd = new Date(today)
        todayEnd.setHours(23, 59, 59, 999)

        const { count: questsToday } = await supabase
          .from('quests')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'completed')
          .gte('completed_at', todayStart)

        const { count: workoutsToday } = await supabase
          .from('workout_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('completed_at', todayStart)

        const hasActivityToday = (questsToday ?? 0) > 0 || (workoutsToday ?? 0) > 0

        if (hasActivityToday) {
          // Incrémenter le streak
          currentStreak += 1
          streakIncremented = true
        }
        // Sinon on attend que l'utilisateur soit actif
      } else {
        // Pas d'activité hier → streak brisé si streak > 0
        if (currentStreak > 0 && lastActiveDay.getTime() < yesterday.getTime()) {
          streakBroken = true
          currentStreak = 0
        }
      }
    }

    // Mettre à jour le profil
    if (streakBroken || streakIncremented) {
      await supabase
        .from('profiles')
        .update({
          streak_days: currentStreak,
          last_active_date: now.toISOString(),
        })
        .eq('id', userId)
    } else if (!alreadyActiveToday) {
      // Juste mettre à jour la date d'activité
      await supabase
        .from('profiles')
        .update({ last_active_date: now.toISOString() })
        .eq('id', userId)
    }

    // Vérifier si le streak débloque un titre
    let newTitle: string | null = null
    const streakTitles: Record<number, string> = {
      3: 'streak-3',
      7: 'streak-7',
      30: 'streak-30',
      100: 'streak-100',
    }

    const streakThreshold = Object.keys(streakTitles)
      .map(Number)
      .find((threshold) => currentStreak >= threshold && !profile.titles_unlocked.includes(streakTitles[threshold]))

    if (streakThreshold) {
      const titleId = streakTitles[streakThreshold]

      // Récupérer les stats pour checkTitleUnlock
      const { data: dungeonStats } = await supabase
        .from('dungeons')
        .select('status, type')
        .eq('user_id', userId)
        .eq('status', 'completed')

      const { data: questStats } = await supabase
        .from('quests')
        .select('status, type')
        .eq('user_id', userId)
        .eq('status', 'completed')

      const { data: workoutStats } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', userId)

      type QuestRow = { status: string; type: string }
      type DungeonRow = { status: string; type: string }
      const userStats = {
        quests_completed: questStats?.length ?? 0,
        daily_quests_completed: (questStats as QuestRow[] | null)?.filter((q) => q.type === 'daily').length ?? 0,
        dungeons_cleared: dungeonStats?.length ?? 0,
        bosses_defeated: (dungeonStats as DungeonRow[] | null)?.filter((d) => d.type === 'boss').length ?? 0,
        streak_days: currentStreak,
        workouts_completed: workoutStats?.length ?? 0,
        global_rank: profile.global_rank as Rank,
        titles_unlocked: profile.titles_unlocked || [],
        skills_unlocked: profile.skills_unlocked || [],
      }

      const newTitles = checkTitleUnlock(userStats)
      if (newTitles.includes(titleId)) {
        newTitle = titleId

        // Sauvegarder le nouveau titre
        const updatedTitles = [...(profile.titles_unlocked || []), titleId]
        await supabase
          .from('profiles')
          .update({ titles_unlocked: updatedTitles })
          .eq('id', userId)
      }
    }

    return NextResponse.json({
      currentStreak,
      streakBroken,
      streakIncremented,
      newTitle,
      message: streakBroken
        ? `Série brisée après ${profile.streak_days} jours`
        : streakIncremented
          ? `Série de ${currentStreak} jours maintenue !`
          : `Série actuelle: ${currentStreak} jours`,
    })

  } catch (error) {
    console.error('Erreur vérification streak:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
