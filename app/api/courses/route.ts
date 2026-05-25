import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { SPACED_REPETITION_INTERVALS, XP_REWARDS } from '@/lib/constants'
import { addDays } from 'date-fns'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId requis' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerSupabaseClient() as any

  const { data, error } = await supabase
    .from('course_entries')
    .select('*')
    .eq('user_id', userId)
    .order('studied_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ courses: data })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, subjectId, title, description, studiedAt } = body

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId et title sont requis' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerSupabaseClient() as any

    const studiedDate = studiedAt ? new Date(studiedAt) : new Date()

    // Calculer les dates de révision (J+1, J+3, J+7, J+14, J+30)
    const reviewDates = SPACED_REPETITION_INTERVALS.map(days =>
      addDays(studiedDate, days).toISOString()
    )

    // Créer l'entrée de cours
    const courseEntry = {
      user_id: userId,
      subject_id: subjectId || null,
      title,
      description: description || null,
      studied_at: studiedDate.toISOString(),
      review_dates: reviewDates,
    }

    const { data: course, error: courseError } = await supabase
      .from('course_entries')
      .insert(courseEntry)
      .select()
      .single()

    if (courseError) throw courseError

    // Créer les quêtes de révision automatiquement
    const revisionQuests = SPACED_REPETITION_INTERVALS.map((days) => {
      const dueDate = addDays(studiedDate, days)
      return {
        user_id: userId,
        subject_id: subjectId || null,
        title: `${title} (J+${days})`,
        description: description
          ? `Révision J+${days} : ${description}`
          : `Révise le cours "${title}" étudié il y a ${days} jour(s). Teste-toi sur les points clés.`,
        type: 'revision',
        status: 'pending',
        xp_reward: XP_REWARDS.quest_revision_base,
        min_duration_minutes: 20,
        time_spent_minutes: 0,
        timer_started_at: null,
        due_date: dueDate.toISOString(),
        completed_at: null,
        course_entry_id: course.id,
        ai_generated: false,
      }
    })

    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .insert(revisionQuests)
      .select()

    if (questsError) {
      console.error('Erreur création quêtes révision:', questsError)
    }

    return NextResponse.json({
      course,
      quests: quests || [],
      message: `Cours ajouté ! ${SPACED_REPETITION_INTERVALS.length} révisions programmées.`,
      review_dates: reviewDates,
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur création cours:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!courseId || !userId) {
      return NextResponse.json({ error: 'id et userId requis' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerSupabaseClient() as any

    // Supprimer les quêtes associées
    await supabase
      .from('quests')
      .delete()
      .eq('course_entry_id', courseId)
      .eq('user_id', userId)
      .neq('status', 'completed')

    // Supprimer le cours
    const { error } = await supabase
      .from('course_entries')
      .delete()
      .eq('id', courseId)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ message: 'Cours supprimé' })

  } catch (error) {
    console.error('Erreur suppression cours:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
