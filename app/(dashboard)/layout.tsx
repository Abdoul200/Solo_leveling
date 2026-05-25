'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Sword, Castle, Dumbbell,
  BarChart2, User, BookOpen, Trophy, LogOut, Bell
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/lib/store'
import StreakDisplay from '@/components/ui/StreakDisplay'
import GameProvider from '@/components/providers/GameProvider'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/quetes', icon: Sword, label: 'Quêtes' },
  { href: '/donjons', icon: Castle, label: 'Donjons' },
  { href: '/sport', icon: Dumbbell, label: 'Sport' },
  { href: '/stats', icon: BarChart2, label: 'Statistiques' },
  { href: '/profil', icon: User, label: 'Profil' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/titres', icon: Trophy, label: 'Titres' },
]

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { userProfile, notifications } = useGameStore()

  const unreadCount = notifications.filter(n => !n.read).length

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col w-64 fixed left-0 top-0 h-screen z-30 border-r"
        style={{ background: '#0a0a0f', borderColor: 'rgba(139,92,246,0.15)' }}
      >
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: 'rgba(139,92,246,0.1)' }}>
          <div
            className="text-lg font-black tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ⚔️ SYSTÈME
          </div>
          <div className="text-xs text-gray-500 tracking-widest">DE L&apos;ÉVEILLÉ</div>
        </div>

        {/* User info */}
        {userProfile && (
          <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}
              >
                🧑‍💻
              </div>
              <div>
                <div className="text-sm font-bold text-white truncate max-w-[130px]">{userProfile.username}</div>
                <div className="text-xs text-gray-500">Rang {userProfile.global_rank} • Niv.{userProfile.global_level}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                    color: active ? '#8b5cf6' : '#9ca3af',
                    border: active ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent',
                  }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Streak + Déconnexion */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {userProfile && <StreakDisplay streakDays={userProfile.streak_days} />}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0 flex-1" style={{ background: '#0a0a0f' }}>
        {/* Header mobile */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14"
          style={{
            background: 'rgba(10, 10, 15, 0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(139,92,246,0.15)',
          }}
        >
          <div
            className="text-base font-black tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ⚔️ SYSTÈME
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg relative" style={{ color: '#9ca3af' }}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: '#8b5cf6', color: 'white' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* Bottom nav mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t"
        style={{ background: '#0a0a0f', borderColor: 'rgba(139,92,246,0.15)' }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 6).map(item => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-2 py-1">
                <Icon className="w-5 h-5" style={{ color: active ? '#8b5cf6' : '#6b7280' }} />
                <span className="text-[10px]" style={{ color: active ? '#8b5cf6' : '#6b7280' }}>
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameProvider>
      <DashboardLayoutInner>
        {children}
      </DashboardLayoutInner>
    </GameProvider>
  )
}
