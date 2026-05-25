import { createClient } from '@supabase/supabase-js'
import type { UserProfile, Subject, Quest, Dungeon, CourseEntry, WorkoutSession, PhysicalStats, JournalEntry } from './types'

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

// Client Supabase pour le côté client (non-typé pour éviter les erreurs de génériques)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) as any

// Client Supabase côté serveur (avec service role key)
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

// Fonctions utilitaires d'authentification

// Connexion avec email/password
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

// Inscription avec email/password
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

// Déconnexion
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Récupérer l'utilisateur actuel
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Récupérer la session actuelle
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Fonctions CRUD pour les profils

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

// Fonctions CRUD pour les matières

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

// Fonctions CRUD pour les quêtes

export async function getQuests(userId: string, status?: Quest['status']) {
  let query = supabase
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

// Fonctions CRUD pour les donjons

export async function getDungeons(userId: string, status?: Dungeon['status']) {
  let query = supabase
    .from('dungeons')
    .select('*')
    .eq('user_id', userId)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('spawned_at', { ascending: false })
  return { data, error }
}

// Fonctions CRUD pour les entrées de cours

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
