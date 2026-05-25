import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient as createClientComp, createServerComponentClient as createServerComp, createRouteHandlerClient as createRouteHandler } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { UserProfile, Subject, Quest, Dungeon, CourseEntry, WorkoutSession, PhysicalStats, JournalEntry } from './types'
import { calculateRank, calculateLevel, RANKS } from './ranks'

// Types de la base de données Supabase
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at'> & { id: string }
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>
      }
      subjects: {
        Row: Subject
        Insert: Omit<Subject, 'id' | 'created_at'>
        Update: Partial<Omit<Subject, 'id' | 'user_id' | 'created_at'>>
      }
      quests: {
        Row: Quest
        Insert: Omit<Quest, 'id'>
        Update: Partial<Omit<Quest, 'id' | 'user_id'>>
      }
      dungeons: {
        Row: Dungeon
        Insert: Omit<Dungeon, 'id'>
        Update: Partial<Omit<Dungeon, 'id' | 'user_id'>>
      }
      course_entries: {
        Row: CourseEntry
        Insert: Omit<CourseEntry, 'id' | 'created_at'>
        Update: Partial<Omit<CourseEntry, 'id' | 'user_id' | 'created_at'>>
      }
      workout_sessions: {
        Row: WorkoutSession
        Insert: Omit<WorkoutSession, 'id'>
        Update: Partial<Omit<WorkoutSession, 'id' | 'user_id'>>
      }
      physical_stats: {
        Row: PhysicalStats
        Insert: Omit<PhysicalStats, 'id'>
        Update: Partial<Omit<PhysicalStats, 'id' | 'user_id'>>
      }
      journal_entries: {
        Row: JournalEntry
        Insert: Omit<JournalEntry, 'id'>
        Update: Partial<Omit<JournalEntry, 'id' | 'user_id'>>
      }
    }
  }
}

// URL et clé Supabase depuis les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Client Supabase pour le côté client (composants client)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) as any

// Client pour les composants client (avec auth-helpers)
export function createClientComponentClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClientComp() as any
}

// Client pour les server components
export function createServerComponentClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerComp({ cookies }) as any
}

// Client pour les API routes (route handlers)
export function createRouteHandlerClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createRouteHandler({ cookies }) as any
}

// Client Supabase côté serveur (avec service role key — bypass RLS)
export function createServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as any
}

// ============================================================
// HELPERS CÔTÉ SERVEUR
// ============================================================

// Récupérer l'utilisateur depuis le contexte serveur
export async function getUser() {
  try {
    const sb = createServerComponentClient()
    const { data: { user }, error } = await sb.auth.getUser()
    if (error) return null
    return user
  } catch {
    return null
  }
}

// Récupérer le profil complet avec les matières
export async function getUserProfile(userId: string) {
  const sb = createServerSupabaseClient()

  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return { profile: null, subjects: [], error: profileError }
  }

  const { data: subjects } = await sb
    .from('subjects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  return { profile, subjects: subjects || [], error: null }
}

// Résultat d'une mise à jour XP
export interface UpdateXPResult {
  success: boolean
  levelUp: boolean
  rankUp: boolean
  oldRank: string
  newRank: string
  oldLevel: number
  newLevel: number
  newXP: number
  error?: string
}

// Mettre à jour l'XP d'un utilisateur pour une matière donnée
// Recalcule automatiquement le rang et le niveau
export async function updateXP(
  userId: string,
  subjectId: string | null,
  xpAmount: number
): Promise<UpdateXPResult> {
  const sb = createServerSupabaseClient()

  try {
    // Récupérer le profil actuel
    const { data: profile, error: profileError } = await sb
      .from('profiles')
      .select('global_xp, global_rank, global_level')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, levelUp: false, rankUp: false, oldRank: 'E', newRank: 'E', oldLevel: 1, newLevel: 1, newXP: 0, error: 'Profil introuvable' }
    }

    const oldXP = profile.global_xp
    const oldRank = profile.global_rank
    const oldLevel = profile.global_level
    const newXP = oldXP + xpAmount

    const newRank = calculateRank(newXP)
    const newLevel = calculateLevel(newXP)

    const rankUp = RANKS.indexOf(newRank) > RANKS.indexOf(oldRank as string)
    const levelUp = newLevel > oldLevel || rankUp

    // Mettre à jour le profil global
    await sb
      .from('profiles')
      .update({
        global_xp: newXP,
        global_rank: newRank,
        global_level: newLevel,
        last_active_date: new Date().toISOString(),
      })
      .eq('id', userId)

    // Mettre à jour la matière si définie
    if (subjectId) {
      const { data: subject } = await sb
        .from('subjects')
        .select('xp, rank, level')
        .eq('id', subjectId)
        .single()

      if (subject) {
        const newSubjectXP = subject.xp + xpAmount
        const newSubjectRank = calculateRank(newSubjectXP)
        const newSubjectLevel = calculateLevel(newSubjectXP)

        await sb
          .from('subjects')
          .update({
            xp: newSubjectXP,
            rank: newSubjectRank,
            level: newSubjectLevel,
          })
          .eq('id', subjectId)
      }
    }

    return {
      success: true,
      levelUp,
      rankUp,
      oldRank,
      newRank,
      oldLevel,
      newLevel,
      newXP,
    }
  } catch (error) {
    console.error('Erreur updateXP:', error)
    return { success: false, levelUp: false, rankUp: false, oldRank: 'E', newRank: 'E', oldLevel: 1, newLevel: 1, newXP: 0, error: 'Erreur serveur' }
  }
}

// ============================================================
// FONCTIONS D'AUTHENTIFICATION
// ============================================================

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ============================================================
// FONCTIONS CRUD
// ============================================================

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

export async function getSubjects(userId: string) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function createSubject(subject: Omit<Subject, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('subjects')
    .insert(subject)
    .select()
    .single()
  return { data, error }
}

export async function getQuests(userId: string, status?: Quest['status']) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('quests')
    .select('*')
    .eq('user_id', userId)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('due_date', { ascending: true })
  return { data, error }
}

export async function updateQuestStatus(questId: string, status: Quest['status'], additionalData?: Partial<Quest>) {
  const { data, error } = await supabase
    .from('quests')
    .update({ status, ...additionalData })
    .eq('id', questId)
    .select()
    .single()
  return { data, error }
}

export async function getDungeons(userId: string, status?: Dungeon['status']) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('dungeons')
    .select('*')
    .eq('user_id', userId)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('spawned_at', { ascending: false })
  return { data, error }
}

export async function getCourseEntries(userId: string) {
  const { data, error } = await supabase
    .from('course_entries')
    .select('*')
    .eq('user_id', userId)
    .order('studied_at', { ascending: false })
  return { data, error }
}

export async function createCourseEntry(entry: Omit<CourseEntry, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('course_entries')
    .insert(entry)
    .select()
    .single()
  return { data, error }
}
