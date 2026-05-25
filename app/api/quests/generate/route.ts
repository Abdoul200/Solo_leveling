import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Quest, Subject } from '@/lib/types'
import { XP_REWARDS, MIN_QUEST_DURATIONS } from '@/lib/constants'
import { addHours } from 'date-fns'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, subjects, existingQuests, userRank, userLevel } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    // Si pas de clé Gemini, générer des quêtes par défaut
    if (!process.env.GEMINI_API_KEY) {
      const defaultQuests = generateDefaultQuests(userId, subjects)
      return NextResponse.json({ quests: defaultQuests })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const subjectList = subjects?.map((s: Subject) => `${s.name} (Rang ${s.rank})`).join(', ') || 'matières générales'

    const prompt = `Tu es le Système de Solo Leveling pour un étudiant.

Profil du chasseur:
- Rang global: ${userRank || 'E'}
- Niveau: ${userLevel || 1}
- Matières: ${subjectList}

Génère exactement 3 quêtes quotidiennes variées pour cet étudiant. Les quêtes doivent être:
1. Une quête de révision (type: "daily") - générale pour la journée
2. Une quête de concentration (type: "daily") - focus et productivité
3. Une quête physique ou mentale (type: "physical") - exercice ou méditation

Réponds UNIQUEMENT avec un JSON valide (sans markdown) avec ce format exact:
[
  {
    "title": "titre court et accrocheur en français",
    "description": "description détaillée en français (2-3 phrases)",
    "type": "daily",
    "xp_reward": 60,
    "min_duration_minutes": 20
  }
]

Les titres doivent être inspirés de Solo Leveling (dramatiques, épiques).
Les récompenses XP entre 50-150.
Les durées entre 15-45 minutes.`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Parser le JSON
    let questsData
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questsData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Pas de JSON valide dans la réponse')
      }
    } catch {
      // Fallback sur des quêtes par défaut
      const defaultQuests = generateDefaultQuests(userId, subjects)
      return NextResponse.json({ quests: defaultQuests })
    }

    // Construire les objets Quest complets
    const quests: Partial<Quest>[] = questsData.map((q: {
      title: string
      description: string
      type: Quest['type']
      xp_reward: number
      min_duration_minutes: number
    }) => ({
      user_id: userId,
      subject_id: null,
      title: q.title,
      description: q.description,
      type: q.type || 'daily',
      status: 'pending',
      xp_reward: q.xp_reward || XP_REWARDS.quest_daily_base,
      min_duration_minutes: q.min_duration_minutes || MIN_QUEST_DURATIONS.daily,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: addHours(new Date(), 20).toISOString(),
      completed_at: null,
      course_entry_id: null,
      ai_generated: true,
    }))

    return NextResponse.json({ quests, generated_at: new Date().toISOString() })

  } catch (error) {
    console.error('Erreur génération quêtes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération des quêtes' },
      { status: 500 }
    )
  }
}

// Génère des quêtes par défaut si l'IA n'est pas disponible
function generateDefaultQuests(userId: string, subjects?: Subject[]): Partial<Quest>[] {
  const dueDate = addHours(new Date(), 20).toISOString()

  return [
    {
      user_id: userId,
      subject_id: subjects?.[0]?.id || null,
      title: 'Séance de Révision Active',
      description: 'Consacre 25 minutes à réviser activement tes notes du jour. Ferme tes documents et teste-toi sur les concepts clés.',
      type: 'daily',
      status: 'pending',
      xp_reward: 70,
      min_duration_minutes: 25,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: dueDate,
      completed_at: null,
      course_entry_id: null,
      ai_generated: true,
    },
    {
      user_id: userId,
      subject_id: null,
      title: 'Bloc de Concentration Absolue',
      description: 'Travaille en mode "zone" pendant 20 minutes: téléphone hors de portée, une seule tâche à la fois.',
      type: 'daily',
      status: 'pending',
      xp_reward: 60,
      min_duration_minutes: 20,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: dueDate,
      completed_at: null,
      course_entry_id: null,
      ai_generated: true,
    },
    {
      user_id: userId,
      subject_id: null,
      title: 'Entraînement Corps et Esprit',
      description: 'Effectue 30 minutes d\'activité physique pour libérer des endorphines et améliorer ta concentration.',
      type: 'physical',
      status: 'pending',
      xp_reward: 80,
      min_duration_minutes: 30,
      time_spent_minutes: 0,
      timer_started_at: null,
      due_date: dueDate,
      completed_at: null,
      course_entry_id: null,
      ai_generated: true,
    },
  ]
}
