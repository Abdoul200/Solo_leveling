import type { Exercise, Title, Skill, AuraConfig } from './types'

// Avatars presets disponibles (SVG/émoji représentatifs)
export const PRESET_AVATARS = [
  { id: 'shadow-monarch', emoji: '👤', name: 'Monarque des Ombres', color: '#8b5cf6' },
  { id: 'fire-hunter', emoji: '🔥', name: 'Chasseur de Feu', color: '#ef4444' },
  { id: 'ice-mage', emoji: '❄️', name: 'Mage de Glace', color: '#60a5fa' },
  { id: 'thunder-blade', emoji: '⚡', name: 'Lame du Tonnerre', color: '#facc15' },
  { id: 'holy-knight', emoji: '⚔️', name: 'Chevalier Sacré', color: '#fbbf24' },
  { id: 'dark-assassin', emoji: '🗡️', name: 'Assassin des Ténèbres', color: '#1e293b' },
  { id: 'beast-tamer', emoji: '🐺', name: 'Dompteur de Bêtes', color: '#10b981' },
  { id: 'arch-mage', emoji: '🔮', name: 'Archi-Mage', color: '#a78bfa' },
  { id: 'iron-body', emoji: '🛡️', name: 'Corps de Fer', color: '#94a3b8' },
  { id: 'wind-walker', emoji: '💨', name: 'Marcheur du Vent', color: '#67e8f9' },
  { id: 'poison-master', emoji: '☠️', name: 'Maître du Poison', color: '#84cc16' },
  { id: 'blood-knight', emoji: '🩸', name: 'Chevalier de Sang', color: '#dc2626' },
]

// Configurations des auras
export const AURA_CONFIGS: AuraConfig[] = [
  {
    type: 'shadow',
    name: 'Aura des Ombres',
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    description: 'Une aura mystérieuse venue des profondeurs des ténèbres',
  },
  {
    type: 'fire',
    name: 'Aura de Feu',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    description: 'Les flammes de la détermination brûlent avec intensité',
  },
  {
    type: 'ice',
    name: 'Aura de Glace',
    color: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.6)',
    description: 'Un calme glacial qui refroidit même les âmes les plus ardentes',
  },
  {
    type: 'thunder',
    name: 'Aura du Tonnerre',
    color: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.6)',
    description: 'La foudre et la vitesse fusionnent dans cette aura électrique',
  },
  {
    type: 'holy',
    name: 'Aura Sacrée',
    color: '#fde68a',
    glowColor: 'rgba(253, 224, 71, 0.6)',
    description: 'Une lumière divine qui repousse les ténèbres',
  },
]

// Bannières presets
export const PRESET_BANNERS = [
  { id: 'dungeon-gate', name: 'Portail de Donjon', gradient: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)' },
  { id: 'shadow-realm', name: 'Royaume des Ombres', gradient: 'linear-gradient(135deg, #1a0a2e 0%, #4c1d95 50%, #1a0a2e 100%)' },
  { id: 'blue-mana', name: 'Mana Bleu', gradient: 'linear-gradient(135deg, #0a1628 0%, #0e4d6c 50%, #0a1628 100%)' },
  { id: 'fire-realm', name: 'Royaume de Feu', gradient: 'linear-gradient(135deg, #1a0a0a 0%, #7f1d1d 50%, #1a0a0a 100%)' },
  { id: 'thunder-sky', name: 'Ciel du Tonnerre', gradient: 'linear-gradient(135deg, #1a1a0a 0%, #78350f 50%, #1a1a0a 100%)' },
  { id: 'void-space', name: 'Espace du Vide', gradient: 'linear-gradient(135deg, #000000 0%, #0f172a 50%, #000000 100%)' },
]

// Base de données d'exercices (50+ exercices)
export const EXERCISES_DATABASE: Exercise[] = [
  // Force - Poitrine
  { id: 'bench-press', name: 'Développé couché', category: 'force', muscle_groups: ['pectoraux', 'triceps', 'deltoïdes'], description: 'Exercice de base pour la poitrine', unit: 'reps', icon: '🏋️' },
  { id: 'push-up', name: 'Pompes', category: 'force', muscle_groups: ['pectoraux', 'triceps', 'épaules'], description: 'Exercice au poids du corps pour la poitrine', unit: 'reps', icon: '💪' },
  { id: 'incline-press', name: 'Développé incliné', category: 'force', muscle_groups: ['pectoraux supérieurs', 'triceps'], description: 'Développé couché incliné pour les pectoraux hauts', unit: 'reps', icon: '🏋️' },
  { id: 'chest-fly', name: 'Écarté poulie', category: 'force', muscle_groups: ['pectoraux'], description: 'Isolation des pectoraux', unit: 'reps', icon: '✈️' },

  // Force - Dos
  { id: 'pull-up', name: 'Tractions', category: 'force', muscle_groups: ['dorsaux', 'biceps', 'trapèzes'], description: 'Exercice fondamental pour le dos', unit: 'reps', icon: '🔼' },
  { id: 'deadlift', name: 'Soulevé de terre', category: 'force', muscle_groups: ['dorsaux', 'ischios', 'fessiers', 'trapèzes'], description: 'Le roi des exercices de force', unit: 'reps', icon: '💎' },
  { id: 'barbell-row', name: 'Rowing barre', category: 'force', muscle_groups: ['dorsaux', 'biceps', 'trapèzes'], description: 'Tirage horizontal pour l\'épaisseur du dos', unit: 'reps', icon: '🏋️' },
  { id: 'lat-pulldown', name: 'Tirage poulie haute', category: 'force', muscle_groups: ['dorsaux', 'biceps'], description: 'Développement de la largeur du dos', unit: 'reps', icon: '⬇️' },
  { id: 'cable-row', name: 'Rowing poulie basse', category: 'force', muscle_groups: ['dorsaux', 'biceps', 'trapèzes'], description: 'Tirage horizontal à la poulie', unit: 'reps', icon: '↩️' },

  // Force - Jambes
  { id: 'squat', name: 'Squat', category: 'force', muscle_groups: ['quadriceps', 'fessiers', 'ischios'], description: 'Le roi des exercices pour les jambes', unit: 'reps', icon: '🦵' },
  { id: 'leg-press', name: 'Presse à cuisses', category: 'force', muscle_groups: ['quadriceps', 'fessiers'], description: 'Développement des cuisses à la machine', unit: 'reps', icon: '🏋️' },
  { id: 'lunges', name: 'Fentes', category: 'force', muscle_groups: ['quadriceps', 'fessiers', 'ischios'], description: 'Exercice unilatéral pour les jambes', unit: 'reps', icon: '👟' },
  { id: 'leg-curl', name: 'Curl jambes', category: 'force', muscle_groups: ['ischios'], description: 'Isolation des ischio-jambiers', unit: 'reps', icon: '🦵' },
  { id: 'calf-raise', name: 'Mollets debout', category: 'force', muscle_groups: ['mollets'], description: 'Développement des mollets', unit: 'reps', icon: '👟' },
  { id: 'bulgarian-squat', name: 'Squat bulgare', category: 'force', muscle_groups: ['quadriceps', 'fessiers', 'ischios'], description: 'Squat sur une jambe avec pied arrière surélevé', unit: 'reps', icon: '⚡' },

  // Force - Épaules
  { id: 'overhead-press', name: 'Développé militaire', category: 'force', muscle_groups: ['deltoïdes', 'triceps', 'trapèzes'], description: 'Exercice de base pour les épaules', unit: 'reps', icon: '🏋️' },
  { id: 'lateral-raise', name: 'Élévations latérales', category: 'force', muscle_groups: ['deltoïdes latéraux'], description: 'Isolation des deltoïdes latéraux', unit: 'reps', icon: '✈️' },
  { id: 'front-raise', name: 'Élévations frontales', category: 'force', muscle_groups: ['deltoïdes antérieurs'], description: 'Isolation des deltoïdes antérieurs', unit: 'reps', icon: '⬆️' },
  { id: 'upright-row', name: 'Rowing vertical', category: 'force', muscle_groups: ['deltoïdes', 'trapèzes'], description: 'Développement des épaules et trapèzes', unit: 'reps', icon: '⬆️' },

  // Force - Bras
  { id: 'bicep-curl', name: 'Curl biceps', category: 'force', muscle_groups: ['biceps'], description: 'Exercice de base pour les biceps', unit: 'reps', icon: '💪' },
  { id: 'hammer-curl', name: 'Curl marteau', category: 'force', muscle_groups: ['biceps', 'brachial'], description: 'Curl neutre pour l\'épaisseur des bras', unit: 'reps', icon: '🔨' },
  { id: 'tricep-pushdown', name: 'Extension triceps poulie', category: 'force', muscle_groups: ['triceps'], description: 'Isolation des triceps à la poulie', unit: 'reps', icon: '⬇️' },
  { id: 'skull-crusher', name: 'Barre front', category: 'force', muscle_groups: ['triceps'], description: 'Isolation des triceps allongé', unit: 'reps', icon: '💀' },
  { id: 'dips', name: 'Dips', category: 'force', muscle_groups: ['triceps', 'pectoraux', 'épaules'], description: 'Exercice au poids du corps pour triceps/poitrine', unit: 'reps', icon: '⬇️' },

  // Force - Abdominaux
  { id: 'crunch', name: 'Crunch', category: 'force', muscle_groups: ['abdominaux'], description: 'Exercice de base pour les abdos', unit: 'reps', icon: '🔥' },
  { id: 'plank', name: 'Planche', category: 'force', muscle_groups: ['core', 'abdominaux', 'dorsaux'], description: 'Gainage statique', unit: 'time', icon: '🛡️' },
  { id: 'leg-raise', name: 'Levée de jambes', category: 'force', muscle_groups: ['abdominaux inférieurs'], description: 'Isolation des abdos bas', unit: 'reps', icon: '🦵' },
  { id: 'russian-twist', name: 'Twist russe', category: 'force', muscle_groups: ['obliques', 'abdominaux'], description: 'Rotation du tronc pour les obliques', unit: 'reps', icon: '🔄' },
  { id: 'ab-wheel', name: 'Roue abdominale', category: 'force', muscle_groups: ['core', 'abdominaux', 'dorsaux'], description: 'Exercice avancé pour le core', unit: 'reps', icon: '⚙️' },

  // Cardio
  { id: 'running', name: 'Course à pied', category: 'cardio', muscle_groups: ['jambes', 'cardio'], description: 'Course en plein air ou sur tapis', unit: 'time', icon: '🏃' },
  { id: 'cycling', name: 'Vélo', category: 'cardio', muscle_groups: ['jambes', 'cardio'], description: 'Vélo stationnaire ou en plein air', unit: 'time', icon: '🚴' },
  { id: 'jump-rope', name: 'Corde à sauter', category: 'cardio', muscle_groups: ['mollets', 'cardio'], description: 'Cardio haute intensité', unit: 'time', icon: '🪢' },
  { id: 'burpees', name: 'Burpees', category: 'force', muscle_groups: ['corps entier', 'cardio'], description: 'Exercice complet à haute intensité', unit: 'reps', icon: '💥' },
  { id: 'mountain-climber', name: 'Grimpeur de montagne', category: 'cardio', muscle_groups: ['core', 'épaules', 'jambes'], description: 'Cardio dynamique en position de planche', unit: 'time', icon: '⛰️' },
  { id: 'rowing-machine', name: 'Rameur', category: 'cardio', muscle_groups: ['dos', 'jambes', 'bras'], description: 'Cardio complet sur rameur', unit: 'time', icon: '🚣' },
  { id: 'sprint', name: 'Sprint', category: 'explosivité', muscle_groups: ['jambes', 'cardio'], description: 'Course à vitesse maximale', unit: 'time', icon: '⚡' },
  { id: 'hiit', name: 'HIIT', category: 'cardio', muscle_groups: ['corps entier'], description: 'Entraînement par intervalles haute intensité', unit: 'time', icon: '🔥' },

  // Explosivité
  { id: 'box-jump', name: 'Box Jump', category: 'explosivité', muscle_groups: ['quadriceps', 'fessiers', 'mollets'], description: 'Saut sur une boîte pour développer la puissance', unit: 'reps', icon: '📦' },
  { id: 'power-clean', name: 'Épaulé', category: 'explosivité', muscle_groups: ['corps entier'], description: 'Mouvement olympique d\'haltérophilie', unit: 'reps', icon: '⚡' },
  { id: 'jump-squat', name: 'Squat sauté', category: 'explosivité', muscle_groups: ['quadriceps', 'fessiers', 'mollets'], description: 'Squat avec saut explosif', unit: 'reps', icon: '🦘' },
  { id: 'kettlebell-swing', name: 'Swing kettlebell', category: 'explosivité', muscle_groups: ['fessiers', 'ischios', 'dos'], description: 'Balancement de kettlebell pour la puissance', unit: 'reps', icon: '🔔' },

  // Souplesse / Mobilité
  { id: 'yoga-flow', name: 'Yoga flow', category: 'souplesse', muscle_groups: ['corps entier'], description: 'Séquence de postures de yoga', unit: 'time', icon: '🧘' },
  { id: 'stretching', name: 'Étirements', category: 'souplesse', muscle_groups: ['corps entier'], description: 'Étirements statiques globaux', unit: 'time', icon: '🤸' },
  { id: 'hip-mobility', name: 'Mobilité hanches', category: 'souplesse', muscle_groups: ['hanches', 'fessiers'], description: 'Exercices de mobilité pour les hanches', unit: 'time', icon: '🔄' },
  { id: 'foam-rolling', name: 'Rouleau de mousse', category: 'souplesse', muscle_groups: ['corps entier'], description: 'Auto-massage avec rouleau de mousse', unit: 'time', icon: '🌀' },

  // Endurance
  { id: 'long-run', name: 'Course longue', category: 'endurance', muscle_groups: ['jambes', 'cardio'], description: 'Course à allure modérée sur longue durée', unit: 'time', icon: '🏃' },
  { id: 'swimming', name: 'Natation', category: 'endurance', muscle_groups: ['corps entier', 'cardio'], description: 'Nage en piscine ou en eau libre', unit: 'time', icon: '🏊' },
  { id: 'trail-running', name: 'Trail running', category: 'endurance', muscle_groups: ['jambes', 'core', 'cardio'], description: 'Course en terrain varié', unit: 'time', icon: '🏔️' },
  { id: 'circuit-training', name: 'Circuit training', category: 'endurance', muscle_groups: ['corps entier'], description: 'Enchaînement d\'exercices sans repos', unit: 'time', icon: '🔁' },
]

// Titres disponibles
export const AVAILABLE_TITLES: Title[] = [
  // Communs
  { id: 'first-quest', name: 'Premier Pas', description: 'Compléter sa première quête', condition: 'quests_completed >= 1', rarity: 'commun', icon: '👣' },
  { id: 'daily-grind', name: 'Le Grinch', description: 'Compléter 10 quêtes quotidiennes', condition: 'daily_quests_completed >= 10', rarity: 'commun', icon: '⚙️' },
  { id: 'first-dungeon', name: 'Explorateur', description: 'Terminer son premier donjon', condition: 'dungeons_cleared >= 1', rarity: 'commun', icon: '🗺️' },
  { id: 'streak-3', name: 'En Rythme', description: 'Maintenir une série de 3 jours', condition: 'streak_days >= 3', rarity: 'commun', icon: '📅' },
  { id: 'rank-d', name: 'Chasseur Naissant', description: 'Atteindre le rang D', condition: 'rank >= D', rarity: 'commun', icon: '🌱' },

  // Rares
  { id: 'streak-7', name: 'Guerrier Hebdomadaire', description: 'Maintenir une série de 7 jours', condition: 'streak_days >= 7', rarity: 'rare', icon: '🗡️' },
  { id: 'rank-c', name: 'Chasseur Confirmé', description: 'Atteindre le rang C', condition: 'rank >= C', rarity: 'rare', icon: '⚔️' },
  { id: 'dungeons-5', name: 'Plongeur des Profondeurs', description: 'Terminer 5 donjons', condition: 'dungeons_cleared >= 5', rarity: 'rare', icon: '🏰' },
  { id: 'quests-50', name: 'Chasseur Prolifique', description: 'Compléter 50 quêtes', condition: 'quests_completed >= 50', rarity: 'rare', icon: '📋' },
  { id: 'first-boss', name: 'Tueur de Boss', description: 'Vaincre son premier boss d\'examen', condition: 'bosses_defeated >= 1', rarity: 'rare', icon: '👊' },
  { id: 'sport-10', name: 'Athlète Amateur', description: 'Compléter 10 séances de sport', condition: 'workouts_completed >= 10', rarity: 'rare', icon: '💪' },

  // Épiques
  { id: 'streak-30', name: 'Moine du Savoir', description: 'Maintenir une série de 30 jours', condition: 'streak_days >= 30', rarity: 'épique', icon: '🧘' },
  { id: 'rank-a', name: 'Chasseur Élite', description: 'Atteindre le rang A', condition: 'rank >= A', rarity: 'épique', icon: '🌟' },
  { id: 'dungeons-20', name: 'Maître des Donjons', description: 'Terminer 20 donjons', condition: 'dungeons_cleared >= 20', rarity: 'épique', icon: '🏯' },
  { id: 'bosses-5', name: 'Tueur de Dragons', description: 'Vaincre 5 boss d\'examens', condition: 'bosses_defeated >= 5', rarity: 'épique', icon: '🐉' },
  { id: 'quests-200', name: 'Légende des Quêtes', description: 'Compléter 200 quêtes', condition: 'quests_completed >= 200', rarity: 'épique', icon: '📖' },
  { id: 'all-subjects', name: 'Érudit Polyvalent', description: 'Atteindre le rang B dans toutes les matières', condition: 'all_subjects_rank_b', rarity: 'épique', icon: '🎓' },

  // Légendaires
  { id: 'streak-100', name: 'Immortel du Savoir', description: 'Maintenir une série de 100 jours', condition: 'streak_days >= 100', rarity: 'légendaire', icon: '♾️' },
  { id: 'rank-s', name: 'Chasseur Légendaire', description: 'Atteindre le rang S', condition: 'rank >= S', rarity: 'légendaire', icon: '👑' },
  { id: 'rank-monarch', name: 'Monarque des Chasseurs', description: 'Atteindre le rang Monarque', condition: 'rank >= Monarque', rarity: 'légendaire', icon: '👑' },
  { id: 'all-dungeons', name: 'Conquérant Absolu', description: 'Terminer tous les types de donjons', condition: 'all_dungeon_types_cleared', rarity: 'légendaire', icon: '🌌' },
]

// Compétences débloquables
export const AVAILABLE_SKILLS: Skill[] = [
  { id: 'quick-study', name: 'Étude Rapide', description: 'Réduit le temps minimum des quêtes de révision de 10%', effect: 'quest_time_reduction_10', unlock_condition: 'rank_d', icon: '⚡' },
  { id: 'mana-burn', name: 'Combustion de Mana', description: '+10% XP sur toutes les quêtes', effect: 'xp_boost_10', unlock_condition: 'quests_50', icon: '🔥' },
  { id: 'iron-will', name: 'Volonté de Fer', description: 'Les quêtes manquées ne comptent pas comme échec 1x/semaine', effect: 'weekly_quest_forgiveness', unlock_condition: 'streak_7', icon: '🛡️' },
  { id: 'dungeon-sense', name: 'Sens du Donjon', description: 'Prévisualiser les récompenses avant d\'entrer dans un donjon', effect: 'preview_dungeon_rewards', unlock_condition: 'dungeons_5', icon: '👁️' },
  { id: 'boss-hunter', name: 'Chasseur de Boss', description: '+20% XP lors des combats de boss (examens)', effect: 'boss_xp_boost_20', unlock_condition: 'bosses_1', icon: '⚔️' },
  { id: 'physical-mastery', name: 'Maîtrise Physique', description: '+15% XP sur les quêtes sportives', effect: 'sport_xp_boost_15', unlock_condition: 'workouts_10', icon: '💪' },
  { id: 'memory-palace', name: 'Palais de Mémoire', description: 'Les révisions espacées donnent +25% XP', effect: 'review_xp_boost_25', unlock_condition: 'reviews_20', icon: '🧠' },
  { id: 'shadow-monarch-power', name: 'Pouvoir du Monarque', description: 'Toutes les compétences précédentes actives simultanément', effect: 'all_skills_active', unlock_condition: 'rank_s', icon: '👑' },
]

// Icônes de matières disponibles
export const SUBJECT_ICONS = [
  { id: 'math', emoji: '📐', name: 'Mathématiques' },
  { id: 'science', emoji: '🔬', name: 'Sciences' },
  { id: 'physics', emoji: '⚛️', name: 'Physique' },
  { id: 'chemistry', emoji: '🧪', name: 'Chimie' },
  { id: 'biology', emoji: '🧬', name: 'Biologie' },
  { id: 'history', emoji: '📜', name: 'Histoire' },
  { id: 'geography', emoji: '🌍', name: 'Géographie' },
  { id: 'literature', emoji: '📚', name: 'Littérature' },
  { id: 'philosophy', emoji: '🤔', name: 'Philosophie' },
  { id: 'economics', emoji: '📊', name: 'Économie' },
  { id: 'law', emoji: '⚖️', name: 'Droit' },
  { id: 'medicine', emoji: '🏥', name: 'Médecine' },
  { id: 'computer', emoji: '💻', name: 'Informatique' },
  { id: 'language', emoji: '🗣️', name: 'Langues' },
  { id: 'music', emoji: '🎵', name: 'Musique' },
  { id: 'art', emoji: '🎨', name: 'Art' },
  { id: 'sport', emoji: '⚽', name: 'Sport' },
  { id: 'psychology', emoji: '🧠', name: 'Psychologie' },
  { id: 'sociology', emoji: '👥', name: 'Sociologie' },
  { id: 'engineering', emoji: '⚙️', name: 'Ingénierie' },
]

// Couleurs de matières disponibles
export const SUBJECT_COLORS = [
  '#00d4ff', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b',
  '#ec4899', '#3b82f6', '#f97316', '#06b6d4', '#84cc16',
  '#a78bfa', '#fb7185', '#34d399', '#fbbf24', '#60a5fa',
]

// Messages du système Solo Leveling
export const SYSTEM_MESSAGES = {
  questAppear: [
    'UNE NOUVELLE QUÊTE APPARAÎT',
    'LE SYSTÈME A GÉNÉRÉ UNE QUÊTE',
    'MISSION DISPONIBLE',
  ],
  dungeonSpawn: [
    'UN DONJON A ÉTÉ DÉTECTÉ',
    'PORTAIL DIMENSIONNEL OUVERT',
    'DONJON APPARU',
  ],
  levelUp: [
    'NIVEAU SUPÉRIEUR ATTEINT',
    'PROGRESSION DÉTECTÉE',
    'ÉVOLUTION EN COURS',
  ],
  rankUp: [
    'RANG SUPÉRIEUR ATTEINT',
    'PERCÉE DE RANG',
    'ÉVEIL CONFIRMÉ',
  ],
  questComplete: [
    'QUÊTE ACCOMPLIE',
    'OBJECTIF ATTEINT',
    'MISSION TERMINÉE',
  ],
}

// Intervalles de révision espacée (en jours)
export const SPACED_REPETITION_INTERVALS = [1, 3, 7, 14, 30]

// Récompenses XP par type de quête
export const XP_REWARDS = {
  quest_daily_base: 50,
  quest_revision_base: 80,
  quest_special_base: 150,
  quest_physical_base: 60,
  dungeon_sprint_base: 200,
  dungeon_boss_base: 500,
  streak_bonus: 25,
  review_bonus: 30,
}

// Durées minimales par type de quête (en minutes)
export const MIN_QUEST_DURATIONS = {
  revision: 20,
  daily: 15,
  special: 30,
  physical: 25,
}
