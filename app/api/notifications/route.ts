import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// ============================================================
// POST /api/notifications/subscribe — Enregistrer un push
// ============================================================

// NOTE: Les fonctions web-push sont dans un sous-module séparé
// pour éviter des problèmes de build avec Edge Runtime.
// On utilise une approche conditionnelle.

// ============================================================
// GET /api/notifications?userId=xxx — Lister les notifications
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query

    if (error) {
      // Si la table n'existe pas encore, retourner une liste vide
      if (error.code === '42P01') {
        return NextResponse.json({ notifications: [], unread_count: 0 })
      }
      throw error
    }

    const unreadCount = (data || []).filter((n: { read: boolean }) => !n.read).length

    return NextResponse.json({
      notifications: data || [],
      unread_count: unreadCount,
    })

  } catch (error) {
    console.error('Erreur fetch notifications:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// POST /api/notifications — Actions diverses
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, userId, notificationId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    switch (action) {
      // Marquer une notification comme lue
      case 'mark_read': {
        if (!notificationId) {
          return NextResponse.json({ error: 'notificationId requis' }, { status: 400 })
        }

        const { data, error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ notification: data })
      }

      // Marquer toutes comme lues
      case 'mark_all_read': {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', userId)
          .eq('read', false)

        return NextResponse.json({ message: 'Toutes les notifications marquées comme lues' })
      }

      // Enregistrer un abonnement push
      case 'subscribe': {
        const { subscription } = body

        if (!subscription) {
          return NextResponse.json({ error: 'subscription requis' }, { status: 400 })
        }

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: userId,
            subscription: subscription,
            updated_at: new Date().toISOString(),
          })

        if (error) {
          // Si la table n'existe pas, retourner un succès partiel
          if (error.code === '42P01') {
            return NextResponse.json({
              message: 'Abonnement reçu (table push_subscriptions non encore créée)',
              subscribed: false,
            })
          }
          throw error
        }

        return NextResponse.json({
          message: 'Abonnement aux notifications push enregistré',
          subscribed: true,
        })
      }

      // Envoyer une notification push
      case 'send': {
        const { title, body: notifBody, type } = body

        // Créer la notification en DB
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: type || 'quest',
            title: title || 'Notification',
            message: notifBody || '',
            read: false,
          })
          .select()
          .single()

        if (error) {
          if (error.code === '42P01') {
            return NextResponse.json({ message: 'Notification créée en mémoire uniquement' })
          }
          throw error
        }

        // Envoyer via web-push si configuré
        if (
          process.env.VAPID_PUBLIC_KEY &&
          process.env.VAPID_PRIVATE_KEY &&
          process.env.VAPID_EMAIL
        ) {
          try {
            const { data: subscriptions } = await supabase
              .from('push_subscriptions')
              .select('subscription')
              .eq('user_id', userId)

            if (subscriptions && subscriptions.length > 0) {
              const webpush = await import('web-push')
              webpush.default.setVapidDetails(
                `mailto:${process.env.VAPID_EMAIL}`,
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
              )

              const payload = JSON.stringify({ title, body: notifBody, type })

              for (const sub of subscriptions) {
                try {
                  await webpush.default.sendNotification(sub.subscription, payload)
                } catch {
                  // Ignorer les erreurs d'envoi individuel
                }
              }
            }
          } catch {
            // Web-push non critique
          }
        }

        return NextResponse.json({
          notification: data,
          message: 'Notification envoyée',
        })
      }

      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

  } catch (error) {
    console.error('Erreur notifications:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
