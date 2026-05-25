'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Sword, Castle, Dumbbell,
  BarChart3, User, BookOpen, LogOut, Bell, Zap
} from 'lucide-react'
import { signOut } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import GameProvider from '@/components/providers/GameProvider'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', shortLabel: 'Accueil' },
  { href: '/quetes', icon: Sword, label: 'Quêtes', shortLabel: 'Quêtes' },
  { href: '/donjons', icon: Castle, label: 'Donjons', shortLabel: 'Donjons' },
  { href: '/sport', icon: Dumbbell, label: 'Sport', shortLabel: 'Sport' },
  { href: '/stats', icon: BarChart3, label: 'Statistiques', shortLabel: 'Stats' },
  { href: '/profil', icon: User, label: 'Profil', shortLabel: 'Profil' },
  { href: '/journal', icon: BookOpen, label: 'Journal', shortLabel: 'Journal' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Déconnexion réussie')
    router.push('/login')
  }

  return (
    <GameProvider>
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col w-64 fixed left-0 top-0 bottom-0 z-20"
        style={{
          background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(15, 10, 30, 0.98) 100%)',
          borderRight: '1px solid rgba(0, 212, 255, 0.1)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-white/5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6d28d9, #00d4ff)',
              boxShadow: '0 0 20px rgba(109, 40, 217, 0.4)',
            }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div
              className="text-sm font-black tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              SYSTÈME
            </div>
            <div className="text-xs text-sl-text-muted tracking-widest">DE L&apos;ÉVEILLÉ</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 mx-3 mb-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                  style={{
                    background: isActive ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                    color: isActive ? '#00d4ff' : '#94a3b8',
                    borderLeft: isActive ? '3px solid #00d4ff' : '3px solid transparent',
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-sl-blue"
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#94a3b8' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8' }}
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header mobile */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14"
          style={{
            background: 'rgba(10, 10, 20, 0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
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
            SYSTÈME
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg" style={{ color: '#94a3b8' }}>
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Contenu de la page */}
        <div className="flex-1 pb-20 lg:pb-8">
          {children}
        </div>

        {/* Navigation mobile (bottom tabs) */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30"
          style={{
            background: 'rgba(10, 10, 20, 0.97)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(0, 212, 255, 0.1)',
          }}
        >
          <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
            {NAV_ITEMS.slice(0, 6).map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all min-w-[52px]"
                    style={{
                      color: isActive ? '#00d4ff' : '#64748b',
                    }}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {isActive && (
                        <motion.div
                          layoutId="mobile-indicator"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sl-blue"
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-medium">{item.shortLabel}</span>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </nav>
      </main>
    </div>
    </GameProvider>
  )
}
