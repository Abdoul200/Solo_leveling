/**
 * Store Zustand global — état de l'application Solo Leveling
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { UserProfile, Subject, Quest, Dungeon, AppNotification, Rank } from './types'

// ============================================================
// TYPES DU STORE
// ============================================================

export interface LevelUpData {
  oldRank: Rank
  newRank: Rank
  oldLevel: number
  newLevel: number
  xpGained: number
  subject?: string
  titleUnlocked?: string
  skillUnlocked?: string
}

export interface DungeonAlertData {
  dungeon: Dungeon
  subjectName?: string
}

interface GameState {
  // Données utilisateur
  userProfile: UserProfile | null
  subjects: Subject[]
  todayQuests: Quest[]
  activeDungeons: Dungeon[]
  notifications: AppNotification[]

  // État UI
  isLoading: boolean
  showLevelUpModal: boolean
  levelUpData: LevelUpData | null
  showDungeonAlert: boolean
  dungeonAlertData: DungeonAlertData | null
  isInitialized: boolean

  // Actions — profil
  setUserProfile: (profile: UserProfile | null) => void
  updateUserProfile: (updates: Partial<UserProfile>) => void
  setSubjects: (subjects: Subject[]) => void
  updateSubject: (subjectId: string, updates: Partial<Subject>) => void

  // Actions — quêtes
  setTodayQuests: (quests: Quest[]) => void
  updateQuest: (questId: string, updates: Partial<Quest>) => void
  addQuest: (quest: Quest) => void
  removeQuest: (questId: string) => void

  // Actions — donjons
  setActiveDungeons: (dungeons: Dungeon[]) => void
  addDungeon: (dungeon: Dungeon) => void
  updateDungeon: (dungeonId: string, updates: Partial<Dungeon>) => void
  removeDungeon: (dungeonId: string) => void

  // Actions — notifications
  addNotification: (notification: AppNotification) => void
  markNotificationRead: (notificationId: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void

  // Actions — modals
  triggerLevelUp: (data: LevelUpData) => void
  closeLevelUpModal: () => void
  triggerDungeonAlert: (data: DungeonAlertData) => void
  closeDungeonAlert: () => void

  // Actions — initialisation
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  reset: () => void
}

// ============================================================
// ÉTAT INITIAL
// ============================================================

const initialState = {
  userProfile: null,
  subjects: [],
  todayQuests: [],
  activeDungeons: [],
  notifications: [],
  isLoading: false,
  showLevelUpModal: false,
  levelUpData: null,
  showDungeonAlert: false,
  dungeonAlertData: null,
  isInitialized: false,
}

// ============================================================
// STORE
// ============================================================

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    // Profil
    setUserProfile: (profile) => set({ userProfile: profile }),
    updateUserProfile: (updates) =>
      set((state) => ({
        userProfile: state.userProfile
          ? { ...state.userProfile, ...updates }
          : null,
      })),
    setSubjects: (subjects) => set({ subjects }),
    updateSubject: (subjectId, updates) =>
      set((state) => ({
        subjects: state.subjects.map((s) =>
          s.id === subjectId ? { ...s, ...updates } : s
        ),
      })),

    // Quêtes
    setTodayQuests: (quests) => set({ todayQuests: quests }),
    updateQuest: (questId, updates) =>
      set((state) => ({
        todayQuests: state.todayQuests.map((q) =>
          q.id === questId ? { ...q, ...updates } : q
        ),
      })),
    addQuest: (quest) =>
      set((state) => ({ todayQuests: [...state.todayQuests, quest] })),
    removeQuest: (questId) =>
      set((state) => ({
        todayQuests: state.todayQuests.filter((q) => q.id !== questId),
      })),

    // Donjons
    setActiveDungeons: (dungeons) => set({ activeDungeons: dungeons }),
    addDungeon: (dungeon) =>
      set((state) => ({ activeDungeons: [...state.activeDungeons, dungeon] })),
    updateDungeon: (dungeonId, updates) =>
      set((state) => ({
        activeDungeons: state.activeDungeons.map((d) =>
          d.id === dungeonId ? { ...d, ...updates } : d
        ),
      })),
    removeDungeon: (dungeonId) =>
      set((state) => ({
        activeDungeons: state.activeDungeons.filter((d) => d.id !== dungeonId),
      })),

    // Notifications
    addNotification: (notification) =>
      set((state) => ({
        notifications: [notification, ...state.notifications].slice(0, 50), // Max 50
      })),
    markNotificationRead: (notificationId) =>
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      })),
    markAllNotificationsRead: () =>
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      })),
    clearNotifications: () => set({ notifications: [] }),

    // Modals
    triggerLevelUp: (data) =>
      set({ showLevelUpModal: true, levelUpData: data }),
    closeLevelUpModal: () =>
      set({ showLevelUpModal: false, levelUpData: null }),
    triggerDungeonAlert: (data) =>
      set({ showDungeonAlert: true, dungeonAlertData: data }),
    closeDungeonAlert: () =>
      set({ showDungeonAlert: false, dungeonAlertData: null }),

    // Initialisation
    setLoading: (loading) => set({ isLoading: loading }),
    setInitialized: (initialized) => set({ isInitialized: initialized }),
    reset: () => set(initialState),
  }))
)

// ============================================================
// SÉLECTEURS MÉMOÏSÉS
// ============================================================

export const selectUserProfile = (state: GameState) => state.userProfile
export const selectSubjects = (state: GameState) => state.subjects
export const selectTodayQuests = (state: GameState) => state.todayQuests
export const selectActiveDungeons = (state: GameState) => state.activeDungeons
export const selectUnreadNotifications = (state: GameState) =>
  state.notifications.filter((n) => !n.read)
export const selectIsLoading = (state: GameState) => state.isLoading
export const selectLevelUpModal = (state: GameState) => ({
  show: state.showLevelUpModal,
  data: state.levelUpData,
})
export const selectDungeonAlert = (state: GameState) => ({
  show: state.showDungeonAlert,
  data: state.dungeonAlertData,
})
