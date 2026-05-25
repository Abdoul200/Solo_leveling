'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Zap, Lock, Mail, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signInWithEmail } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await signInWithEmail(email, password)

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou mot de passe incorrect')
        } else {
          setError(authError.message)
        }
        return
      }

      if (data.user) {
        toast.success('Connexion réussie. Bienvenue, Chasseur.')
        router.push('/dashboard')
      }
    } catch {
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fond dynamique */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(109, 40, 217, 0.12) 0%, transparent 70%)',
          }}
        />
        {/* Lignes de grille */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(0, 212, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.3) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo et titre */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          {/* Icône système */}
          <motion.div
            className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, #6d28d9, #00d4ff)',
              boxShadow: '0 0 40px rgba(109, 40, 217, 0.5), 0 0 80px rgba(0, 212, 255, 0.2)',
            }}
            animate={{
              boxShadow: [
                '0 0 40px rgba(109, 40, 217, 0.5), 0 0 80px rgba(0, 212, 255, 0.2)',
                '0 0 60px rgba(109, 40, 217, 0.7), 0 0 100px rgba(0, 212, 255, 0.4)',
                '0 0 40px rgba(109, 40, 217, 0.5), 0 0 80px rgba(0, 212, 255, 0.2)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {/* Anneaux */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-sl-blue/30"
              animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-sl-purple/20"
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <Zap className="w-10 h-10 text-white relative z-10" />
          </motion.div>

          <motion.h1
            className="text-3xl font-black tracking-widest mb-2"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            animate={{
              textShadow: [
                'none',
                '0 0 20px rgba(0, 212, 255, 0.4)',
                'none',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            SYSTÈME
          </motion.h1>
          <div className="text-xs font-mono tracking-[0.3em] text-sl-text-muted uppercase">
            de l&apos;Éveillé
          </div>
        </motion.div>

        {/* Carte de connexion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 212, 255, 0.05)',
          }}
        >
          {/* Scan line */}
          <motion.div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.4), transparent)' }}
            animate={{ top: ['-2px', '102%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
          />

          <div className="p-8">
            {/* En-tête */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-sl-text mb-1">Connexion au Système</h2>
              <p className="text-sm text-sl-text-muted">
                Identifie-toi pour accéder à tes quêtes
              </p>
            </div>

            {/* Message d'erreur */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-sl-text-muted mb-1.5 uppercase tracking-wider">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sl-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="chasseur@exemple.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm transition-all outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      color: '#e2e8f0',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 212, 255, 0.08)'
                      e.currentTarget.style.background = 'rgba(0, 212, 255, 0.04)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                    }}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs font-medium text-sl-text-muted mb-1.5 uppercase tracking-wider">
                  Mot de Passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sl-text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-lg text-sm transition-all outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      color: '#e2e8f0',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 212, 255, 0.08)'
                      e.currentTarget.style.background = 'rgba(0, 212, 255, 0.04)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sl-text-muted hover:text-sl-text transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bouton connexion */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 mt-6 relative overflow-hidden"
                style={{
                  background: loading
                    ? 'rgba(109, 40, 217, 0.5)'
                    : 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                  boxShadow: loading ? 'none' : '0 0 20px rgba(109, 40, 217, 0.4)',
                  color: 'white',
                }}
              >
                {loading ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Se Connecter au Système
                  </>
                )}
              </motion.button>
            </form>

            {/* Lien inscription */}
            <div className="mt-6 text-center">
              <p className="text-sm text-sl-text-muted">
                Pas encore éveillé ?{' '}
                <Link
                  href="/register"
                  className="font-semibold transition-colors"
                  style={{ color: '#00d4ff' }}
                  onMouseEnter={(e) => e.currentTarget.style.textShadow = '0 0 10px rgba(0, 212, 255, 0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.textShadow = 'none'}
                >
                  Commence l&apos;éveil →
                </Link>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Message du bas */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-sl-text-muted mt-6 font-mono tracking-widest"
        >
          LE SYSTÈME OBSERVE TOUT
        </motion.p>
      </div>
    </div>
  )
}
