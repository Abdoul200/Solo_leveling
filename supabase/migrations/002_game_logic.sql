-- Migration 002 — Logique de jeu Solo Leveling
-- Créé le: 2025-05-25

-- ============================================
-- TABLE: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'quest' CHECK (type IN ('quest', 'dungeon', 'level_up', 'streak', 'review', 'boss')),
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs voient leurs notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs gèrent leurs notifications"
  ON notifications FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TABLE: push_subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs gèrent leurs abonnements push"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- INDEX SUPPLÉMENTAIRES
-- ============================================

-- Index sur quest due_date pour les révisions espacées
CREATE INDEX IF NOT EXISTS idx_quests_due_date_status
  ON quests(user_id, due_date, status)
  WHERE status IN ('pending', 'active');

-- Index sur course_entries studied_at pour les révisions
CREATE INDEX IF NOT EXISTS idx_course_entries_studied_at
  ON course_entries(user_id, studied_at DESC);

-- Index sur dungeons spawned_at
CREATE INDEX IF NOT EXISTS idx_dungeons_spawned_at
  ON dungeons(user_id, spawned_at DESC);

-- Index sur workout_sessions completed_at
CREATE INDEX IF NOT EXISTS idx_workout_completed_at
  ON workout_sessions(user_id, completed_at DESC);

-- ============================================
-- FONCTION: Calcul rang global depuis les matières
-- ============================================
CREATE OR REPLACE FUNCTION calculate_global_rank_from_subjects(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  total_xp INTEGER;
  avg_xp INTEGER;
  subject_count INTEGER;
  result_rank TEXT;
BEGIN
  SELECT COUNT(*), COALESCE(AVG(xp), 0)
  INTO subject_count, avg_xp
  FROM subjects
  WHERE user_id = p_user_id;

  IF subject_count = 0 THEN
    RETURN 'E';
  END IF;

  -- Déterminer le rang selon l'XP moyen
  IF avg_xp >= 60000 THEN result_rank := 'Monarque';
  ELSIF avg_xp >= 35000 THEN result_rank := 'SSS';
  ELSIF avg_xp >= 20000 THEN result_rank := 'SS';
  ELSIF avg_xp >= 12000 THEN result_rank := 'S';
  ELSIF avg_xp >= 7000 THEN result_rank := 'A';
  ELSIF avg_xp >= 3500 THEN result_rank := 'B';
  ELSIF avg_xp >= 1500 THEN result_rank := 'C';
  ELSIF avg_xp >= 500 THEN result_rank := 'D';
  ELSE result_rank := 'E';
  END IF;

  RETURN result_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-update global_rank quand une matière change de rang
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_global_rank()
RETURNS TRIGGER AS $$
DECLARE
  new_rank TEXT;
BEGIN
  -- Calculer le nouveau rang global
  new_rank := calculate_global_rank_from_subjects(NEW.user_id);

  -- Mettre à jour le profil si le rang a changé
  UPDATE profiles
  SET global_rank = new_rank
  WHERE id = NEW.user_id
    AND global_rank != new_rank;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subject_rank_change ON subjects;
CREATE TRIGGER on_subject_rank_change
  AFTER UPDATE OF rank ON subjects
  FOR EACH ROW
  WHEN (OLD.rank IS DISTINCT FROM NEW.rank)
  EXECUTE FUNCTION trigger_update_global_rank();

-- ============================================
-- TRIGGER: Auto-update last_active_date au login
-- (Géré côté application via /api/streak/check)
-- ============================================

-- ============================================
-- FONCTION: Nettoyer les quêtes expirées
-- ============================================
CREATE OR REPLACE FUNCTION expire_old_quests()
RETURNS void AS $$
BEGIN
  UPDATE quests
  SET status = 'expired'
  WHERE status IN ('pending', 'active')
    AND due_date < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VUE: Profile avec stats de jeu
-- ============================================
CREATE OR REPLACE VIEW profile_game_stats AS
SELECT
  p.id,
  p.username,
  p.global_rank,
  p.global_xp,
  p.global_level,
  p.streak_days,
  p.active_title,
  p.aura_type,
  COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'completed') AS total_quests_completed,
  COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'completed' AND q.type = 'revision') AS total_revisions,
  COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'completed' AND q.type = 'physical') AS total_physical_quests,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'completed') AS total_dungeons_cleared,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'completed' AND d.type = 'boss') AS total_bosses_defeated,
  COALESCE(SUM(q.time_spent_minutes) FILTER (WHERE q.status = 'completed'), 0) AS total_study_minutes,
  COUNT(DISTINCT w.id) AS total_workouts,
  COALESCE(SUM(w.xp_earned), 0) AS total_workout_xp,
  (SELECT COUNT(*) FROM subjects s WHERE s.user_id = p.id) AS subjects_count
FROM profiles p
LEFT JOIN quests q ON q.user_id = p.id
LEFT JOIN dungeons d ON d.user_id = p.id
LEFT JOIN workout_sessions w ON w.user_id = p.id
GROUP BY p.id, p.username, p.global_rank, p.global_xp, p.global_level,
         p.streak_days, p.active_title, p.aura_type;

-- ============================================
-- AJOUT COLONNE max_streak si non existante
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'max_streak'
  ) THEN
    ALTER TABLE profiles ADD COLUMN max_streak INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- MISE À JOUR DES POLITIQUES RLS (notifications)
-- ============================================
-- Les politiques INSERT pour notifications (service role bypass RLS)
CREATE POLICY "Service role peut insérer des notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);
