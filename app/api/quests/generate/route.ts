import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSupabaseClient } from '@/lib/supabase'
import { generateSpacedRepetitionDates } from '@/lib/gameEngine'
import type { Quest, Subject, CourseEntry } from '@/lib/types'
import { XP_REWARDS, MIN_QUEST_DURATIONS, SPACED_REPETITION_INTERVALS } from '@/lib/constants'
import { addHours } from 'date-fns'

// ============================================================
// POST /api/quests/generate
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // 1. Fetch le profil utilisateur + matières
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('global_rank, global_level, streak_days, skills_unlocked')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('xp', { ascending: true }) // Priorité aux matières les plus faibles

    // 2. Fetch les quêtes récentes (dernières 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentQuests } = await supabase
      .from('quests')
      .select('title, type, subject_id, status')
      .eq('user_id', userId)
      .gte('created_at', yesterday)

    // 3. Fetch les révisions espacées dues aujourd'hui
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const { data: courseEntries } = await supabase
      .from('course_entries')
      .select('id, title, subject_id, studied_at, review_dates')
      .eq('user_id', userId)

    // Identifier les révisions dues aujourd'hui
    const dueRevisions: Array<{ entry: CourseEntry; intervalDays: number }> = []
    if (courseEntries) {
      for (const entry of courseEntries as CourseEntry[]) {
        const reviewDates = generateSpacedRepetitionDates(new Date(entry.studied_at))
        reviewDates.forEach((reviewDate, idx) => {
          if (reviewDate >= todayStart && reviewDate <= todayEnd) {
            dueRevisions.push({
              entry,
              intervalDays: SPACED_REPETITION_INTERVALS[idx],
            })
          }
        })
      }
    }

    // 4. Générer les quêtes de révision espacée en priorité
    const revisionQuests: Partial<Quest>[] = dueRevisions.map((rev) => ({
      user_id: userId,
      subject_id: rev.entry.subject_id,
      title: `Révision : ${rev.entry.title}`,
      description: `Révision espacée (J+${rev.intervalDays}) — Relis tes notes et teste tes connaissances sur "${rev.entry.title}". Plus l'intervalle est long, plus l'ancrage mémoriel est profond.`,
      type: 'revision' as const,
      status: 'pending' as const,
      xp_reward: Math.round(XP_REWARDS.quest_revision_base * (1 + (SPACED_REPETITION_INTERVALS.indexOf(rev.intervalDays) * 0.15))),
      min_duration_minutes: MIN_QUEST_DURATIONS.revision,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: todayEnd.toISOString(),
      completed_at: null,
      course_entry_id: rev.entry.id,
      ai_generated: false,
    }))

    // 5. Générer des quêtes IA si GEMINI disponible, sinon prédéfinies
    let aiQuests: Partial<Quest>[] = []
    const maxAiQuests = Math.max(0, 5 - revisionQuests.length)

    if (maxAiQuests > 0) {
      if (process.env.GEMINI_API_KEY) {
        aiQuests = await generateAIQuests(
          userId,
          profile,
          subjects as Subject[] || [],
          recentQuests || [],
          dueRevisions.length,
          maxAiQuests
        )
      } else {
        aiQuests = generateFallbackQuests(userId, subjects as Subject[] || [], recentQuests || [], maxAiQuests)
      }
    }

    const allQuests = [...revisionQuests, ...aiQuests]

    // 6. Sauvegarder les quêtes en DB
    const savedQuests: Quest[] = []
    for (const quest of allQuests) {
      const { data, error } = await supabase
        .from('quests')
        .insert(quest)
        .select()
        .single()

      if (!error && data) {
        savedQuests.push(data as Quest)
      }
    }

    return NextResponse.json({
      quests: savedQuests,
      revision_count: revisionQuests.length,
      ai_count: aiQuests.length,
      generated_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Erreur génération quêtes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération des quêtes' },
      { status: 500 }
    )
  }
}

// ============================================================
// GÉNÉRATION IA VIA GEMINI
// ============================================================

async function generateAIQuests(
  userId: string,
  profile: { global_rank: string; global_level: number; streak_days: number },
  subjects: Subject[],
  recentQuests: Array<{ title: string; type: string }>,
  revisionCount: number,
  maxQuests: number
): Promise<Partial<Quest>[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const subjectList = subjects
    .map((s) => `${s.name} (Rang ${s.rank}, ${s.xp} XP)`)
    .join(', ')

  const recentTitles = recentQuests.map((q) => q.title).join(', ')

  const prompt = `Tu es le Système de Solo Leveling pour un étudiant.

Profil du chasseur:
- Rang global: ${profile.global_rank}
- Niveau: ${profile.global_level}
- Série active: ${profile.streak_days} jours
- Matières (du plus faible au plus fort): ${subjectList || 'Aucune matière définie'}
- Quêtes récentes (à éviter): ${recentTitles || 'Aucune'}
- Révisions espacées déjà créées: ${revisionCount}

Génère exactement ${maxQuests} quêtes variées pour cet étudiant. Mix souhaité:
- 1-2 quêtes d'étude/révision générale (type: "daily")
- 1 quête de concentration pure (type: "daily")
- 1 quête physique ou de bien-être (type: "physical")
- Si matières disponibles: privilégie les matières au rang le plus bas

Réponds UNIQUEMENT avec un JSON valide (sans markdown) avec ce format exact:
[
  {
    "title": "titre court et accrocheur en français (style Solo Leveling)",
    "description": "description détaillée en français (2-3 phrases, immersive)",
    "type": "daily",
    "subject_index": 0,
    "xp_reward": 70,
    "min_duration_minutes": 25
  }
]

subject_index: index de la matière dans la liste fournie (-1 si quête générale).
Titres style Solo Leveling: dramatiques, épiques, motivants.
XP entre 50-150. Durées entre 15-60 minutes.`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Pas de JSON valide')

    const questsData = JSON.parse(jsonMatch[0])
    const dueDate = addHours(new Date(), 20).toISOString()

    return questsData.slice(0, maxQuests).map((q: {
      title: string
      description: string
      type: Quest['type']
      subject_index: number
      xp_reward: number
      min_duration_minutes: number
    }) => ({
      user_id: userId,
      subject_id: (q.subject_index >= 0 && subjects[q.subject_index]) ? subjects[q.subject_index].id : null,
      title: q.title,
      description: q.description,
      type: q.type || 'daily',
      status: 'pending',
      xp_reward: q.xp_reward || XP_REWARDS.quest_daily_base,
      min_duration_minutes: q.min_duration_minutes || MIN_QUEST_DURATIONS.daily,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: dueDate,
      completed_at: null,
      course_entry_id: null,
      ai_generated: true,
    }))
  } catch {
    return generateFallbackQuests(userId, subjects, [], maxQuests)
  }
}

// ============================================================
// GÉNÉRATION DE REPLI (sans IA)
// ============================================================

function generateFallbackQuests(
  userId: string,
  subjects: Subject[],
  recentQuests: Array<{ title: string; type: string }>,
  maxQuests: number
): Partial<Quest>[] {
  const dueDate = addHours(new Date(), 20).toISOString()
  const weakestSubject = subjects[0] || null
  const recentTitles = new Set(recentQuests.map((q) => q.title))

  const templates: Partial<Quest>[] = [
    {
      user_id: userId,
      subject_id: weakestSubject?.id || null,
      title: 'Séance de Révision Active',
      description: `Consacre 25 minutes à réviser activement${weakestSubject ? ` en ${weakestSubject.name}` : ''}. Ferme tes documents et teste-toi sur les concepts clés.`,
      type: 'daily',
      status: 'pending',
      xp_reward: 70,
      min_duration_minutes: 25,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: dueDate,
      completed_at: null,
      course_entry_id: null,
      ai_generated: false,
    },
    {
      user_id: userId,
      subject_id: null,
      title: 'Bloc de Concentration Absolue',
      description: 'Travaille en mode "zone" pendant 20 minutes: téléphone hors de portée, une seule tâche à la fois. Le chasseur se forge dans la solitude.',
      type: 'daily',
      status: 'pending',
      xp_reward: 60,
      min_duration_minutes: 20,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: dueDate,
      completed_at: null,
      course_entry_id: null,
      ai_generated: false,
    },
    {
      user_id: userId,
      subject_id: null,
      title: 'Entraînement Corps et Esprit',
      description: 'Effectue 30 minutes d\'activité physique pour libérer des endorphines et améliorer ta concentration. Un chasseur fort est un chasseur qui s\'entraîne.',
      type: 'physical',
      status: 'pending',
      xp_reward: 80,
      min_duration_minutes: 30,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: dueDate,
      completed_at: null,
      course_entry_id: null,
      ai_generated: false,
    },
    {
      user_id: userId,
      subject_id: subjects[1]?.id || weakestSubject?.id || null,
      title: 'Session Pomodoro de Maîtrise',
      description: `Lance 2 cycles Pomodoro (25min travail + 5min repos)${subjects[1] ? ` sur ${subjects[1].name}` : ''}. La discipline construit les Monarques.`,
      type: 'daily',
      status: 'pending',
      xp_reward: 90,
      min_duration_minutes: 50,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: dueDate,
      completed_at: null,
      course_entry_id: null,
      ai_generated: false,
    },
    {
      user_id: userId,
      subject_id: null,
      title: 'Cartographie des Connaissances',
      description: 'Crée une carte mentale des concepts importants que tu dois maîtriser. Visualise les liens entre les idées pour ancrer ta compréhension.',
      type: 'special',
      status: 'pending',
      xp_reward: 120,
      min_duration_minutes: 30,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: dueDate,
      completed_at: null,
      course_entry_id: null,
      ai_generated: false,
    },
  ]

  // Filtrer les quêtes déjà faites récemment
  const filtered = templates.filter((t) => !recentTitles.has(t.title!))
  return (filtered.length >= maxQuests ? filtered : templates).slice(0, maxQuests)
}
