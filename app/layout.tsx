import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ParticleBackground from '@/components/ui/ParticleBackground'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Système de l\'Éveillé — Solo Leveling Student',
  description: 'Gamifie ta vie d\'étudiant. Accomplis des quêtes, conquiers des donjons, monte en rang.',
  keywords: ['étudiant', 'gamification', 'solo leveling', 'révision', 'apprentissage'],
  authors: [{ name: 'Système de l\'Éveillé' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Système de l\'Éveillé',
    description: 'Gamifie ta vie d\'étudiant',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-sl-black text-sl-text antialiased" style={{ background: '#0a0a0f' }}>
        {/* Fond avec particules */}
        <ParticleBackground />

        {/* Fond gradient statique */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(ellipse at top left, rgba(109, 40, 217, 0.08) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(0, 212, 255, 0.06) 0%, transparent 60%)',
          }}
        />

        {/* Contenu principal */}
        <div className="relative z-10">
          {children}
        </div>

        {/* Notifications toast */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f0f1a',
              color: '#e2e8f0',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              borderRadius: '10px',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.1)',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#0f0f1a',
              },
              style: {
                border: '1px solid rgba(16, 185, 129, 0.3)',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#0f0f1a',
              },
              style: {
                border: '1px solid rgba(239, 68, 68, 0.3)',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
