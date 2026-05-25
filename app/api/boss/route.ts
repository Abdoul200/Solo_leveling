import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { calculateBossHP, calculateBossDamage } from '@/lib/gameEngine'
import type { Rank, Dungeon } from '@/lib/types'
import { RANKS, RANK_XP_THRESHOLDS } from '@/lib/ranks'
import { XP_REWARDS } from '@/lib/constants'

// ============================================================
// POST /api/boss — Créer un boss (annoncer un examen)
// Body: { userId, subjectId, examTitle, examDate, description }
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, subjectId, examTitle, examDate, description } = body

    if (!userId || !subjectId || !examTitle || !examDate) {
      return NextResponse.json(
        { error: 'userId, subjectId, examTitle et examDate sont requis' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Récupérer la matière pour connaître son rang
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('name, rank, xp')
      .eq('id', subjectId)
      .eq('user_id', userId)
      .single()

    if (subjectError || !subject) {
      return NextResponse.json({ error: 'Matière introuvable' }, { status: 404 })
    }

    const subjectRank = subject.rank as Rank
    const bossHP = calculateBossHP(subjectRank)

    // Calculer le XP du boss
    const rankIdx = RANKS.indexOf(subjectRank)
    const bossXP = Math.floor(XP_REWARDS.dungeon_boss_base * (1 + rankIdx * 0.3))

    // Construire le boss dungeon
    const bossDungeon: Omit<Dungeon, 'id'> = {
      user_id: userId,
      subject_id: subjectId,
      title: examTitle,
      description: description || `Examen de ${subject.name} — Le boss final t\'attend. Prépare-toi avec toutes tes révisions.`,
      type: 'boss',
      rank: subjectRank,
      status: 'available',
      spawn_type: 'boss',
      xp_reward: bossXP,
      time_limit_minutes: null,
      health_points: bossHP,
      current_hp: bossHP,
      exam_date: examDate,
      rewards: [
        `+${bossXP} XP`,
        `Titre: Tueur de Boss`,
        `Compétence: Boss Hunter`,
      ],
      spawned_at: new Date().toISOString(),
      completed_at: null,
    }

    const { data: dungeon, error: dungeonError } = await supabase
      .from('dungeons')
      .insert(bossDungeon)
      .select()
      .single()

    if (dungeonError) throw dungeonError

    // Générer automatiquement les quêtes de révision pré-examen
    const examDateObj = new Date(examDate)
    const today = new Date()
    const daysUntilExam = Math.ceil((examDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const revisionSchedule = getRevisionSchedule(daysUntilExam)
    const revisionQuests = []

    for (const dayBefore of revisionSchedule) {
      const questDate = new Date(examDateObj)
      questDate.setDate(questDate.getDate() - dayBefore)

      if (questDate > today) {
        questDate.setHours(20, 0, 0, 0) // Due à 20h

        const questData = {
          user_id: userId,
          subject_id: subjectId,
          title: `Révision Boss J-${dayBefore} : ${subject.name}`,
          description: `Prépare l'examen "${examTitle}" en révisant ${subject.name}. Il reste ${dayBefore} jour${dayBefore > 1 ? 's' : ''} avant le combat final.`,
          type: 'revision' as const,
          status: 'pending' as const,
          xp_reward: Math.round(XP_REWARDS.quest_revision_base * (1 + (dayBefore <= 2 ? 0.5 : dayBefore <= 5 ? 0.3 : 0.1))),
          min_duration_minutes: dayBefore <= 2 ? 45 : 30,
          time_spent_minutes: 0,
          timer_started_at: null,
          due_date: questDate.toISOString(),
          completed_at: null,
          course_entry_id: null,
          ai_generated: false,
        }

        const { data: quest } = await supabase
          .from('quests')
          .insert(questData)
          .select()
          .single()

        if (quest) revisionQuests.push(quest)
      }
    }

    return NextResponse.json({
      dungeon,
      revision_quests: revisionQuests,
      boss_hp: bossHP,
      days_until_exam: daysUntilExam,
      message: `Boss créé pour l'examen "${examTitle}" le ${new Date(examDate).toLocaleDateString('fr-FR')}`,
    })

  } catch (error) {
    console.error('Erreur création boss:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Déterminer le calendrier de révision selon le temps restant
function getRevisionSchedule(daysUntilExam: number): number[] {
  if (daysUntilExam >= 30) return [30, 21, 14, 7, 5, 3, 2, 1]
  if (daysUntilExam >= 14) return [14, 10, 7, 5, 3, 2, 1]
  if (daysUntilExam >= 7) return [7, 5, 3, 2, 1]
  if (daysUntilExam >= 3) return [3, 2, 1]
  if (daysUntilExam >= 2) return [2, 1]
  if (daysUntilExam >= 1) return [1]
  return []
}

// Prévenir la réutilisation de RANK_XP_THRESHOLDS
void RANK_XP_THRESHOLDS
