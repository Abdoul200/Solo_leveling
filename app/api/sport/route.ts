import { NextResponse } from 'next/server'
import { createServerSupabaseClient, updateXP } from '@/lib/supabase'
import type { WorkoutSession, WorkoutExercise, PhysicalStats } from '@/lib/types'

// ============================================================
// POST /api/sport/session — Sauvegarder une séance
// Body: { userId, name, exercises, duration }
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, name, exercises, duration } = body

    if (!userId || !name || !exercises) {
      return NextResponse.json(
        { error: 'userId, name et exercises sont requis' },
        { status: 400 }
      )
    }

    // Calculer l'XP gagnée (5 XP par série complétée)
    let xpEarned = 0
    const workoutExercises: WorkoutExercise[] = exercises

    for (const exercise of workoutExercises) {
      if (exercise.sets) {
        for (const set of exercise.sets) {
          if (set.completed) {
            xpEarned += 5
          }
        }
      }
    }

    // Bonus pour séance longue
    if (duration >= 60) xpEarned = Math.floor(xpEarned * 1.3)
    else if (duration >= 45) xpEarned = Math.floor(xpEarned * 1.2)
    else if (duration >= 30) xpEarned = Math.floor(xpEarned * 1.1)

    const supabase = createServerSupabaseClient()

    const sessionData: Omit<WorkoutSession, 'id'> = {
      user_id: userId,
      name,
      exercises: workoutExercises,
      total_duration_minutes: duration || 0,
      xp_earned: xpEarned,
      completed_at: new Date().toISOString(),
    }

    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert(sessionData)
      .select()
      .single()

    if (sessionError) throw sessionError

    // Mettre à jour le rang physique via updateXP (sans matière = rang physique global)
    // On met à jour le global XP + le physical_xp séparément
    const xpResult = await updateXP(userId, null, xpEarned)

    // Mettre à jour le physical_xp dans la dernière entrée physical_stats
    const { data: latestStats } = await supabase
      .from('physical_stats')
      .select('physical_xp, physical_rank')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (latestStats) {
      const newPhysicalXP = latestStats.physical_xp + xpEarned
      // Recalculer le rang physique
      const { calculateRank } = await import('@/lib/ranks')
      const newPhysicalRank = calculateRank(newPhysicalXP)

      await supabase
        .from('physical_stats')
        .update({ physical_xp: newPhysicalXP, physical_rank: newPhysicalRank })
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
    }

    return NextResponse.json({
      session,
      xp_earned: xpEarned,
      xp_result: xpResult,
      level_up: xpResult.levelUp,
      message: `Séance "${name}" sauvegardée ! +${xpEarned} XP`,
    })

  } catch (error) {
    console.error('Erreur sauvegarde séance sport:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// GET /api/sport?userId=xxx — Historique des séances
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data: sessions, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Stats physiques récentes
    const { data: physicalStats } = await supabase
      .from('physical_stats')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      sessions: sessions || [],
      physical_stats: physicalStats || [],
      total_sessions: sessions?.length ?? 0,
    })

  } catch (error) {
    console.error('Erreur historique sport:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/sport — Mettre à jour les mensurations
// ============================================================

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { userId, weight_kg, height_cm, chest_cm, waist_cm, arms_cm } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Récupérer les stats physiques actuelles pour le XP/rang
    const { data: currentStats } = await supabase
      .from('physical_stats')
      .select('physical_xp, physical_rank')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    const statsData: Omit<PhysicalStats, 'id'> = {
      user_id: userId,
      weight_kg: weight_kg ?? null,
      height_cm: height_cm ?? null,
      chest_cm: chest_cm ?? null,
      waist_cm: waist_cm ?? null,
      arms_cm: arms_cm ?? null,
      physical_rank: currentStats?.physical_rank || 'E',
      physical_xp: currentStats?.physical_xp || 0,
      recorded_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('physical_stats')
      .insert(statsData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      stats: data,
      message: 'Mensurations mises à jour',
    })

  } catch (error) {
    console.error('Erreur mise à jour mensurations:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
