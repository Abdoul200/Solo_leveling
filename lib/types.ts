// Types TypeScript pour l'application Solo Leveling Student

// Rangs disponibles
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'Monarque'

// Profil utilisateur
export interface UserProfile {
  id: string
  email: string
  username: string
  avatar_url: string | null
  avatar_type: 'preset' | 'custom'
  aura_type: 'fire' | 'ice' | 'thunder' | 'shadow' | 'holy'
  banner_url: string | null
  banner_type: 'preset' | 'custom'
  global_rank: Rank
  global_xp: number
  global_level: number
  streak_days: number
  last_active_date: string
  titles_unlocked: string[]
  active_title: string | null
  skills_unlocked: string[]
  created_at: string
}

// Matière
export interface Subject {
  id: string
  user_id: string
  name: string
  color: string
  rank: Rank
  xp: number
  level: number
  icon: string
  created_at: string
}

// Entrée de cours (pour la répétition espacée)
export interface CourseEntry {
  id: string
  user_id: string
  subject_id: string
  title: string
  description: string | null
  studied_at: string
  review_dates: string[] // J+1, J+3, J+7, J+14, J+30
  created_at: string
}

// Quête
export interface Quest {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  description: string
  type: 'revision' | 'daily' | 'special' | 'physical'
  status: 'pending' | 'active' | 'completed' | 'failed' | 'expired'
  xp_reward: number
  min_duration_minutes: number
  time_spent_minutes: number
  timer_started_at: string | null
  due_date: string
  completed_at: string | null
  course_entry_id: string | null
  ai_generated: boolean
}

// Donjon
export interface Dungeon {
  id: string
  user_id: string
  subject_id: string | null
  title: string
  description: string
  type: 'sprint' | 'boss'
  rank: Rank
  status: 'available' | 'active' | 'completed' | 'failed'
  spawn_type: 'manual' | 'random' | 'boss'
  xp_reward: number
  time_limit_minutes: number | null
  health_points: number | null
  current_hp: number | null
  exam_date: string | null
  rewards: string[]
  spawned_at: string
  completed_at: string | null
}

// Séance d'entraînement
export interface WorkoutSession {
  id: string
  user_id: string
  name: string
  exercises: WorkoutExercise[]
  total_duration_minutes: number
  xp_earned: number
  completed_at: string
}

export interface WorkoutExercise {
  exercise_id: string
  name: string
  sets: WorkoutSet[]
}

export interface WorkoutSet {
  reps: number | null
  weight_kg: number | null
  duration_seconds: number | null
  completed: boolean
}

// Stats physiques
export interface PhysicalStats {
  id: string
  user_id: string
  weight_kg: number | null
  height_cm: number | null
  chest_cm: number | null
  waist_cm: number | null
  arms_cm: number | null
  physical_rank: Rank
  physical_xp: number
  recorded_at: string
}

// Titre
export interface Title {
  id: string
  name: string
  description: string
  condition: string
  rarity: 'commun' | 'rare' | 'épique' | 'légendaire'
  icon: string
}

// Compétence
export interface Skill {
  id: string
  name: string
  description: string
  effect: string
  unlock_condition: string
  icon: string
}

// Exercice de sport
export interface Exercise {
  id: string
  name: string
  category: 'force' | 'cardio' | 'souplesse' | 'explosivité' | 'endurance'
  muscle_groups: string[]
  description: string
  unit: 'reps' | 'time' | 'distance'
  icon: string
}

// Entrée du journal
export interface JournalEntry {
  id: string
  user_id: string
  content: string
  mood: 'excellent' | 'bien' | 'neutre' | 'difficile' | 'terrible'
  xp_gained_today: number
  quests_completed: number
  created_at: string
}

// Statistiques globales
export interface GlobalStats {
  total_xp: number
  total_quests_completed: number
  total_study_hours: number
  current_streak: number
  max_streak: number
  dungeons_cleared: number
  bosses_defeated: number
  titles_count: number
  subjects_count: number
}

// Données pour les graphiques
export interface WeeklyStudyData {
  day: string
  hours: number
  xp: number
}

export interface SubjectProgress {
  subject: string
  xp: number
  level: number
  rank: Rank
  color: string
}

// Config d'aura
export interface AuraConfig {
  type: 'fire' | 'ice' | 'thunder' | 'shadow' | 'holy'
  name: string
  color: string
  glowColor: string
  description: string
}

// Récompense de niveau
export interface LevelUpReward {
  level: number
  title?: string
  skill?: string
  xp_bonus?: number
}

// Notification
export interface AppNotification {
  id: string
  type: 'quest' | 'dungeon' | 'level_up' | 'streak' | 'review' | 'boss'
  title: string
  message: string
  read: boolean
  created_at: string
}
