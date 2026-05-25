import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerSupabaseClient() as any

    // Vérifier que la quête appartient à l'utilisateur
    const { data: quest, error: fetchError } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !quest) {
      return NextResponse.json({ error: 'Quête introuvable' }, { status: 404 })
    }

    switch (action) {
      case 'start': {
        if (quest.status !== 'pending') {
          return NextResponse.json({ error: 'La quête ne peut pas être démarrée' }, { status: 400 })
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

      case 'complete': {
        if (quest.status !== 'active') {
          return NextResponse.json({ error: 'La quête n\'est pas active' }, { status: 400 })
        }

        const timeSpent = quest.timer_started_at
          ? Math.floor((Date.now() - new Date(quest.timer_started_at).getTime()) / 60000)
          : 0

        const totalTimeSpent = quest.time_spent_minutes + timeSpent

        // Vérifier le temps minimum
        if (totalTimeSpent < quest.min_duration_minutes) {
          return NextResponse.json(
            { error: `Minimum ${quest.min_duration_minutes} minutes requis. Temps actuel: ${totalTimeSpent} min` },
            { status: 400 }
          )
        }

        const { data, error } = await supabase
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

        if (error) throw error

        // Ajouter XP au profil
        await addXpToProfile(supabase, userId, quest.xp_reward, quest.subject_id)

        return NextResponse.json({
          quest: data,
          xp_gained: quest.xp_reward,
          message: 'Quête accomplie !',
        })
      }

      case 'abandon': {
        if (quest.status !== 'active') {
          return NextResponse.json({ error: 'La quête n\'est pas active' }, { status: 400 })
        }

        const timeSpent = quest.timer_started_at
          ? Math.floor((Date.now() - new Date(quest.timer_started_at).getTime()) / 60000)
          : 0

        const { data, error } = await supabase
          .from('quests')
          .update({
            status: 'failed',
            time_spent_minutes: quest.time_spent_minutes + timeSpent,
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
    console.error('Erreur timer:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Ajouter XP au profil et à la matière
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addXpToProfile(
  supabase: any,
  userId: string,
  xp: number,
  subjectId: string | null
) {
  try {
    // Récupérer le profil actuel
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_xp')
      .eq('id', userId)
      .single()

    if (profile) {
      const newXp = profile.global_xp + xp

      await supabase
        .from('profiles')
        .update({ global_xp: newXp, last_active_date: new Date().toISOString() })
        .eq('id', userId)
    }

    // XP pour la matière si définie
    if (subjectId) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('xp')
        .eq('id', subjectId)
        .single()

      if (subject) {
        await supabase
          .from('subjects')
          .update({ xp: subject.xp + xp })
          .eq('id', subjectId)
      }
    }
  } catch (error) {
    console.error('Erreur ajout XP:', error)
  }
}
