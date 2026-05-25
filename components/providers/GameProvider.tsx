'use client'

/**
 * GameProvider — Fournisseur principal de la logique de jeu
 * S'initialise au montage: fetch profil, quêtes, donjons
 * Vérifie le streak, gère le spawn de donjon, écoute Supabase Realtime
 */

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { useGameStore } from '@/lib/store'
import LevelUpModal from '@/components/ui/LevelUpModal'
import DungeonAlert from '@/components/ui/DungeonAlert'
import type { Quest, Dungeon, UserProfile } from '@/lib/types'

interface GameProviderProps {
  children: React.ReactNode
}

// Client Supabase pour le navigateur
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    { auth: { persistSession: true, autoRefreshToken: true } }
  )
}

export default function GameProvider({ children }: GameProviderProps) {
  const router = useRouter()
  const initRef = useRef(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const supabase = getSupabaseClient()

  const {
    setUserProfile,
    setSubjects,
    setTodayQuests,
    setActiveDungeons,
    addDungeon,
    addNotification,
    setLoading,
    setInitialized,
    showLevelUpModal,
    levelUpData,
    closeLevelUpModal,
    showDungeonAlert,
    dungeonAlertData,
    closeDungeonAlert,
    triggerDungeonAlert,
    isInitialized,
  } = useGameStore()

  // ============================================================
  // INITIALISATION
  // ============================================================

  const initialize = useCallback(async () => {
    if (initRef.current) return
    initRef.current = true

    setLoading(true)
    try {
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch le profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserProfile(profile as UserProfile)
      }

      // Fetch les matières
      const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (subjects) {
        setSubjects(subjects)
      }

      // Fetch les quêtes en cours (pending + active)
      const { data: quests } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .order('due_date', { ascending: true })

      if (quests) {
        setTodayQuests(quests as Quest[])
      }

      // Fetch les donjons actifs
      const { data: dungeons } = await supabase
        .from('dungeons')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['available', 'active'])
        .order('spawned_at', { ascending: false })

      if (dungeons) {
        setActiveDungeons(dungeons as Dungeon[])
      }

      // Vérifier le streak
      await checkStreak(user.id)

      // Tenter spawn aléatoire de donjon (probabilité calculée)
      await trySpawnDungeon(user.id, profile)

      setInitialized(true)
    } catch (error) {
      console.error('Erreur initialisation GameProvider:', error)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================================
  // VÉRIFICATION DU STREAK
  // ============================================================

  const checkStreak = async (userId: string) => {
    try {
      const response = await fetch('/api/streak/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const data = await response.json()

        if (data.streakBroken) {
          toast('Série brisée ! Reviens chaque jour pour maintenir ta progression.', {
            icon: '💔',
            duration: 5000,
          })
        } else if (data.currentStreak > 0 && data.currentStreak % 7 === 0) {
          toast(`Série de ${data.currentStreak} jours ! Incroyable !`, {
            icon: '🔥',
            duration: 4000,
          })
        }

        if (data.newTitle) {
          addNotification({
            id: `title-${Date.now()}`,
            type: 'streak',
            title: 'Nouveau titre débloqué !',
            message: `Tu as débloqué le titre "${data.newTitle}"`,
            read: false,
            created_at: new Date().toISOString(),
          })
        }
      }
    } catch {
      // Silencieux — le streak n'est pas critique
    }
  }

  // ============================================================
  // SPAWN ALÉATOIRE DE DONJON
  // ============================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trySpawnDungeon = async (userId: string, profile: any) => {
    try {
      const response = await fetch('/api/dungeons/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: 'random',
          userRank: profile?.global_rank || 'E',
        }),
      })

      if (response.ok) {
        const data = await response.json()

        if (data.spawned && data.dungeon) {
          addDungeon(data.dungeon as Dungeon)

          // Déclencher l'alerte de donjon
          triggerDungeonAlert({
            dungeon: data.dungeon,
            subjectName: undefined,
          })

          addNotification({
            id: `dungeon-${Date.now()}`,
            type: 'dungeon',
            title: 'Donjon détecté !',
            message: `Un donjon de Rang ${data.dungeon.rank} est apparu`,
            read: false,
            created_at: new Date().toISOString(),
          })
        }
      }
    } catch {
      // Silencieux — le spawn n'est pas critique
    }
  }

  // ============================================================
  // SUPABASE REALTIME
  // ============================================================

  const setupRealtimeSubscriptions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return () => {}

    // Écouter les nouvelles quêtes insérées
    const questsChannel = supabase
      .channel(`quests-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const quest = payload.new as Quest
            if (quest.status === 'pending' || quest.status === 'active') {
              addNotification({
                id: `quest-new-${quest.id}`,
                type: 'quest',
                title: 'Nouvelle quête disponible',
                message: quest.title,
                read: false,
                created_at: new Date().toISOString(),
              })
            }
          }
        }
      )
      .subscribe()

    // Écouter les nouveaux donjons
    const dungeonsChannel = supabase
      .channel(`dungeons-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dungeons',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            addDungeon(payload.new as Dungeon)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(questsChannel)
      supabase.removeChannel(dungeonsChannel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (isInitialized) {
      let cleanup: (() => void) | undefined

      setupRealtimeSubscriptions().then((fn) => {
        cleanup = fn
      })

      return () => {
        cleanup?.()
      }
    }
  }, [isInitialized, setupRealtimeSubscriptions])

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <>
      {children}

      {/* Modal de montée de niveau */}
      <LevelUpModal
        show={showLevelUpModal}
        newLevel={levelUpData?.newLevel}
        newRank={levelUpData?.newRank}
        previousRank={levelUpData?.oldRank}
        xpGained={levelUpData?.xpGained ?? 0}
        titleUnlocked={levelUpData?.titleUnlocked}
        skillUnlocked={levelUpData?.skillUnlocked}
        onClose={closeLevelUpModal}
      />

      {/* Alerte de donjon */}
      {dungeonAlertData && (
        <DungeonAlert
          dungeon={showDungeonAlert ? dungeonAlertData.dungeon : null}
          subjectName={dungeonAlertData.subjectName}
          onEnter={(dungeonId) => {
            closeDungeonAlert()
            router.push(`/donjons?active=${dungeonId}`)
          }}
          onDismiss={closeDungeonAlert}
        />
      )}
    </>
  )
}
