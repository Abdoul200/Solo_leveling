-- Migration initiale Solo Leveling Student App
-- Créé le: 2025-05-25

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: profiles
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  avatar_type TEXT NOT NULL DEFAULT 'preset' CHECK (avatar_type IN ('preset', 'custom')),
  aura_type TEXT NOT NULL DEFAULT 'shadow' CHECK (aura_type IN ('fire', 'ice', 'thunder', 'shadow', 'holy')),
  banner_url TEXT,
  banner_type TEXT NOT NULL DEFAULT 'preset' CHECK (banner_type IN ('preset', 'custom')),
  global_rank TEXT NOT NULL DEFAULT 'E' CHECK (global_rank IN ('E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Monarque')),
  global_xp INTEGER NOT NULL DEFAULT 0,
  global_level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  titles_unlocked TEXT[] NOT NULL DEFAULT '{}',
  active_title TEXT,
  skills_unlocked TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_global_rank ON profiles(global_rank);

-- ============================================
-- TABLE: subjects (matières)
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00d4ff',
  rank TEXT NOT NULL DEFAULT 'E' CHECK (rank IN ('E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Monarque')),
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  icon TEXT NOT NULL DEFAULT '📚',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);

-- ============================================
-- TABLE: course_entries (entrées de cours)
-- ============================================
CREATE TABLE IF NOT EXISTS course_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  studied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_dates TIMESTAMPTZ[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_entries_user_id ON course_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_course_entries_subject_id ON course_entries(subject_id);

-- ============================================
-- TABLE: quests (quêtes)
-- ============================================
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'daily' CHECK (type IN ('revision', 'daily', 'special', 'physical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'expired')),
  xp_reward INTEGER NOT NULL DEFAULT 50,
  min_duration_minutes INTEGER NOT NULL DEFAULT 15,
  time_spent_minutes INTEGER NOT NULL DEFAULT 0,
  timer_started_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  course_entry_id UUID REFERENCES course_entries(id) ON DELETE SET NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quests_user_id ON quests(user_id);
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_due_date ON quests(due_date);
CREATE INDEX IF NOT EXISTS idx_quests_course_entry_id ON quests(course_entry_id);

-- ============================================
-- TABLE: dungeons (donjons)
-- ============================================
CREATE TABLE IF NOT EXISTS dungeons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'sprint' CHECK (type IN ('sprint', 'boss')),
  rank TEXT NOT NULL DEFAULT 'E' CHECK (rank IN ('E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Monarque')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed', 'failed')),
  spawn_type TEXT NOT NULL DEFAULT 'manual' CHECK (spawn_type IN ('manual', 'random', 'boss')),
  xp_reward INTEGER NOT NULL DEFAULT 200,
  time_limit_minutes INTEGER,
  health_points INTEGER,
  current_hp INTEGER,
  exam_date TIMESTAMPTZ,
  rewards TEXT[] NOT NULL DEFAULT '{}',
  spawned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dungeons_user_id ON dungeons(user_id);
CREATE INDEX IF NOT EXISTS idx_dungeons_status ON dungeons(status);
CREATE INDEX IF NOT EXISTS idx_dungeons_type ON dungeons(type);

-- ============================================
-- TABLE: workout_sessions (séances de sport)
-- ============================================
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]',
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_at ON workout_sessions(completed_at);

-- ============================================
-- TABLE: physical_stats (stats physiques)
-- ============================================
CREATE TABLE IF NOT EXISTS physical_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,1),
  chest_cm DECIMAL(5,1),
  waist_cm DECIMAL(5,1),
  arms_cm DECIMAL(5,1),
  physical_rank TEXT NOT NULL DEFAULT 'E' CHECK (physical_rank IN ('E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Monarque')),
  physical_xp INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_stats_user_id ON physical_stats(user_id);

-- ============================================
-- TABLE: journal_entries (entrées du journal)
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood TEXT NOT NULL DEFAULT 'neutre' CHECK (mood IN ('excellent', 'bien', 'neutre', 'difficile', 'terrible')),
  xp_gained_today INTEGER NOT NULL DEFAULT 0,
  quests_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dungeons ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles
CREATE POLICY "Les utilisateurs voient leur propre profil"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Les utilisateurs modifient leur propre profil"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Les utilisateurs créent leur propre profil"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies pour subjects
CREATE POLICY "Les utilisateurs voient leurs matières"
  ON subjects FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs gèrent leurs matières"
  ON subjects FOR ALL USING (auth.uid() = user_id);

-- Policies pour course_entries
CREATE POLICY "Les utilisateurs voient leurs cours"
  ON course_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs gèrent leurs cours"
  ON course_entries FOR ALL USING (auth.uid() = user_id);

-- Policies pour quests
CREATE POLICY "Les utilisateurs voient leurs quêtes"
  ON quests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs gèrent leurs quêtes"
  ON quests FOR ALL USING (auth.uid() = user_id);

-- Policies pour dungeons
CREATE POLICY "Les utilisateurs voient leurs donjons"
  ON dungeons FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs gèrent leurs donjons"
  ON dungeons FOR ALL USING (auth.uid() = user_id);

-- Policies pour workout_sessions
CREATE POLICY "Les utilisateurs voient leurs séances"
  ON workout_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs gèrent leurs séances"
  ON workout_sessions FOR ALL USING (auth.uid() = user_id);

-- Policies pour physical_stats
CREATE POLICY "Les utilisateurs voient leurs stats physiques"
  ON physical_stats FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs gèrent leurs stats physiques"
  ON physical_stats FOR ALL USING (auth.uid() = user_id);

-- Policies pour journal_entries
CREATE POLICY "Les utilisateurs voient leur journal"
  ON journal_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs gèrent leur journal"
  ON journal_entries FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FONCTIONS & TRIGGERS
-- ============================================

-- Fonction pour créer le profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer le profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = OLD.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue: profil avec statistiques calculées
CREATE OR REPLACE VIEW profile_stats AS
SELECT
  p.id,
  p.username,
  p.global_rank,
  p.global_xp,
  p.global_level,
  p.streak_days,
  COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'completed') AS total_quests_completed,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'completed') AS total_dungeons_cleared,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'completed' AND d.type = 'boss') AS total_bosses_defeated,
  COALESCE(SUM(q.time_spent_minutes) FILTER (WHERE q.status = 'completed'), 0) AS total_study_minutes
FROM profiles p
LEFT JOIN quests q ON q.user_id = p.id
LEFT JOIN dungeons d ON d.user_id = p.id
GROUP BY p.id, p.username, p.global_rank, p.global_xp, p.global_level, p.streak_days;
