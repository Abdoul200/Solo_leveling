import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

// ============================================================
// GET /api/profile?userId=xxx — Fetch profil complet
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    // Matières
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('xp', { ascending: false })

    // Statistiques agrégées
    const { data: questStats } = await supabase
      .from('quests')
      .select('status, type, time_spent_minutes')
      .eq('user_id', userId)

    const { data: dungeonStats } = await supabase
      .from('dungeons')
      .select('status, type')
      .eq('user_id', userId)

    const { data: workoutStats } = await supabase
      .from('workout_sessions')
      .select('id, xp_earned, total_duration_minutes')
      .eq('user_id', userId)

    // Calcul des stats agrégées
    type QuestStat = { status: string; type: string; time_spent_minutes: number }
    type DungeonStat = { status: string; type: string }
    type WorkoutStat = { id: string; xp_earned: number; total_duration_minutes: number }

    const completedQuests = (questStats as QuestStat[] | null)?.filter((q) => q.status === 'completed') ?? []
    const totalStudyMinutes = completedQuests.reduce((sum, q) => sum + (q.time_spent_minutes || 0), 0)
    const completedDungeons = (dungeonStats as DungeonStat[] | null)?.filter((d) => d.status === 'completed') ?? []
    const defeatedBosses = completedDungeons.filter((d) => d.type === 'boss')
    const totalWorkoutMinutes = (workoutStats as WorkoutStat[] | null)?.reduce((sum, w) => sum + (w.total_duration_minutes || 0), 0) ?? 0
    const totalWorkoutXP = (workoutStats as WorkoutStat[] | null)?.reduce((sum, w) => sum + (w.xp_earned || 0), 0) ?? 0

    const stats = {
      total_xp: profile.global_xp,
      total_quests_completed: completedQuests.length,
      total_study_hours: Math.round(totalStudyMinutes / 60 * 10) / 10,
      total_study_minutes: totalStudyMinutes,
      current_streak: profile.streak_days,
      dungeons_cleared: completedDungeons.length,
      bosses_defeated: defeatedBosses.length,
      titles_count: (profile.titles_unlocked || []).length,
      skills_count: (profile.skills_unlocked || []).length,
      subjects_count: subjects?.length ?? 0,
      workouts_completed: workoutStats?.length ?? 0,
      total_workout_minutes: totalWorkoutMinutes,
      total_workout_xp: totalWorkoutXP,
    }

    return NextResponse.json({
      profile,
      subjects: subjects || [],
      stats,
    })

  } catch (error) {
    console.error('Erreur fetch profil:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/profile — Mettre à jour le profil
// ============================================================

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { userId, ...updates } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    // Champs autorisés à la mise à jour
    const allowedFields: (keyof UserProfile)[] = [
      'username',
      'avatar_url',
      'avatar_type',
      'aura_type',
      'banner_url',
      'banner_type',
      'active_title',
    ]

    const safeUpdates: Partial<UserProfile> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field]
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ valide à mettre à jour' },
        { status: 400 }
      )
    }

    // Valider le titre actif s'il est fourni
    if (safeUpdates.active_title !== undefined && safeUpdates.active_title !== null) {
      const supabase = createServerSupabaseClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('titles_unlocked')
        .eq('id', userId)
        .single()

      if (profile && !profile.titles_unlocked.includes(safeUpdates.active_title)) {
        return NextResponse.json(
          { error: 'Ce titre n\'est pas débloqué' },
          { status: 403 }
        )
      }
    }

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ profile: data, message: 'Profil mis à jour' })

  } catch (error) {
    console.error('Erreur mise à jour profil:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
