import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { JournalEntry } from '@/lib/types'

// ============================================================
// GET /api/journal?userId=xxx — Fetch entrées journal
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '30')

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ entries: [] })
      }
      throw error
    }

    return NextResponse.json({ entries: data || [] })

  } catch (error) {
    console.error('Erreur fetch journal:', error)
    return NextResponse.json(
      { error: 'Le système a détecté une anomalie lors de la récupération du journal' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/journal — Créer une entrée
// Body: { userId, content, mood }
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, content, mood } = body as {
      userId: string
      content: string
      mood: JournalEntry['mood']
    }

    if (!userId || !content || !mood) {
      return NextResponse.json(
        { error: 'userId, content et mood sont requis' },
        { status: 400 }
      )
    }

    const validMoods: JournalEntry['mood'][] = ['excellent', 'bien', 'neutre', 'difficile', 'terrible']
    if (!validMoods.includes(mood)) {
      return NextResponse.json({ error: 'Humeur invalide' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Récupérer les stats du jour
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data: todayQuests } = await supabase
      .from('quests')
      .select('xp_reward, status')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', todayStart.toISOString())
      .lte('completed_at', todayEnd.toISOString())

    const xpGainedToday = (todayQuests || []).reduce(
      (sum: number, q: { xp_reward?: number }) => sum + (q.xp_reward || 0), 0
    )
    const questsCompletedToday = (todayQuests || []).length

    // Vérifier si une entrée existe déjà aujourd'hui
    const { data: existingEntry } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .single()

    let data: JournalEntry | null = null
    let error = null

    if (existingEntry) {
      // Mettre à jour l'entrée existante
      const result = await supabase
        .from('journal_entries')
        .update({
          content,
          mood,
          xp_gained_today: xpGainedToday,
          quests_completed: questsCompletedToday,
        })
        .eq('id', existingEntry.id)
        .eq('user_id', userId)
        .select()
        .single()

      data = result.data as JournalEntry | null
      error = result.error
    } else {
      // Créer une nouvelle entrée
      const result = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          content,
          mood,
          xp_gained_today: xpGainedToday,
          quests_completed: questsCompletedToday,
        })
        .select()
        .single()

      data = result.data as JournalEntry | null
      error = result.error

      // Bonus XP journaling
      if (!error && data) {
        await supabase
          .from('profiles')
          .update({ global_xp: supabase.rpc('increment_xp', { user_id: userId, amount: 50 }) })
          .eq('id', userId)
      }
    }

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          entry: null,
          message: 'Table journal_entries non encore créée',
        })
      }
      throw error
    }

    return NextResponse.json(
      {
        entry: data,
        message: existingEntry ? 'Journal mis à jour' : 'Entrée de journal créée',
        xp_gained: xpGainedToday,
        quests_completed: questsCompletedToday,
      },
      { status: existingEntry ? 200 : 201 }
    )

  } catch (error) {
    console.error('Erreur création journal:', error)
    return NextResponse.json(
      { error: 'Le système a détecté une anomalie lors de la sauvegarde du journal' },
      { status: 500 }
    )
  }
}
