'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Eye, EyeOff, Zap, Lock, Mail, User, ChevronRight, ChevronLeft,
  Plus, X, Check, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PRESET_AVATARS, AURA_CONFIGS, PRESET_BANNERS, SUBJECT_ICONS, SUBJECT_COLORS } from '@/lib/constants'

type Step = 1 | 2 | 3 | 4 | 5

interface NewSubject {
  name: string
  color: string
  icon: string
}

export default function RegisterPage() {
  const router = useRouter()

  // Étape actuelle
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Étape 1 - Compte
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Étape 2 - Avatar
  const [avatarType, setAvatarType] = useState<'preset' | 'custom'>('preset')
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].id)
  const [customAvatarFile, setCustomAvatarFile] = useState<File | null>(null)
  const [customAvatarPreview, setCustomAvatarPreview] = useState('')

  // Étape 3 - Aura
  const [selectedAura, setSelectedAura] = useState<string>('fire')

  // Étape 4 - Bannière
  const [bannerType, setBannerType] = useState<'preset' | 'custom'>('preset')
  const [selectedBanner, setSelectedBanner] = useState(PRESET_BANNERS[0].id)
  const [customBannerFile, setCustomBannerFile] = useState<File | null>(null)

  // Étape 5 - Matières
  const [subjects, setSubjects] = useState<NewSubject[]>([])
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0])
  const [newSubjectIcon, setNewSubjectIcon] = useState(SUBJECT_ICONS[0].emoji)

  const TOTAL_STEPS = 5

  const nextStep = () => {
    setError('')

    if (step === 1) {
      if (!email || !password || !username) {
        setError('Tous les champs sont requis')
        return
      }
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères')
        return
      }
      if (username.length < 3) {
        setError('Le nom de chasseur doit contenir au moins 3 caractères')
        return
      }
    }

    if (step < TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as Step)
    }
  }

  const addSubject = () => {
    if (!newSubjectName.trim()) return
    setSubjects([...subjects, {
      name: newSubjectName.trim(),
      color: newSubjectColor,
      icon: newSubjectIcon,
    }])
    setNewSubjectName('')
    setNewSubjectColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)])
    setNewSubjectIcon(SUBJECT_ICONS[Math.floor(Math.random() * SUBJECT_ICONS.length)].emoji)
  }

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index))
  }

  const handleFinalSubmit = async () => {
    if (subjects.length === 0) {
      setError('Ajoute au moins une matière avant de commencer')
      return
    }
    setLoading(true)
    setError('')
    try {
      // 1. Créer le compte Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      })
      if (authError || !authData.user) throw authError || new Error('Erreur inscription')

      const userId = authData.user.id
      const avatarObj = PRESET_AVATARS.find(a => a.id === selectedAvatar)
      let avatarUrl: string = avatarObj?.emoji || '👤'
      let bannerUrl: string = selectedBanner

      // 2. Upload avatar custom si besoin
      if (avatarType === 'custom' && customAvatarFile) {
        const ext = customAvatarFile.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, customAvatarFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          avatarUrl = urlData.publicUrl
        }
      }

      // 3. Upload bannière custom si besoin
      if (bannerType === 'custom' && customBannerFile) {
        const ext = customBannerFile.name.split('.').pop()
        const path = `${userId}/banner.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(path, customBannerFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('banners').getPublicUrl(path)
          bannerUrl = urlData.publicUrl
        }
      }

      // 4. Créer le profil
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        username,
        avatar_url: avatarUrl,
        avatar_type: avatarType,
        aura_type: selectedAura,
        banner_url: bannerUrl,
        banner_type: bannerType,
        global_rank: 'E',
        global_xp: 0,
        global_level: 1,
        streak_days: 0,
        last_active_date: new Date().toISOString(),
        titles_unlocked: [],
        active_title: null,
        skills_unlocked: [],
      })

      // 5. Créer les matières
      if (subjects.length > 0) {
        await supabase.from('subjects').insert(
          subjects.map(s => ({
            user_id: userId,
            name: s.name,
            color: s.color,
            icon: s.icon,
            rank: 'E',
            xp: 0,
            level: 1,
          }))
        )
      }

      // 6. Générer les premières quêtes
      await fetch('/api/quests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      // 7. Redirect
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Le système a détecté une anomalie lors de l\'inscription'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fond */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(109, 40, 217, 0.10) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(0, 212, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.3) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="text-2xl font-black tracking-widest" style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ÉVEIL DU CHASSEUR
          </div>
          <div className="text-xs font-mono tracking-[0.3em] text-sl-text-muted mt-1">INITIALISATION DU SYSTÈME</div>
        </motion.div>

        {/* Indicateur de progression */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} className="flex items-center gap-2">
              <motion.div
                animate={{
                  background: i + 1 <= step ? 'linear-gradient(135deg, #6d28d9, #00d4ff)' : 'rgba(255,255,255,0.1)',
                  scale: i + 1 === step ? 1.2 : 1,
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ border: i + 1 <= step ? '1px solid rgba(0, 212, 255, 0.5)' : '1px solid rgba(255,255,255,0.1)' }}
              >
                {i + 1 < step ? <Check className="w-3 h-3 text-white" /> : (
                  <span style={{ color: i + 1 <= step ? 'white' : '#94a3b8' }}>{i + 1}</span>
                )}
              </motion.div>
              {i < TOTAL_STEPS - 1 && (
                <div className="w-6 h-px" style={{ background: i + 1 < step ? 'rgba(0, 212, 255, 0.5)' : 'rgba(255,255,255,0.1)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Carte principale */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)', border: '1px solid rgba(0, 212, 255, 0.15)' }}
        >
          <div className="p-8">
            {/* Erreur */}
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

            {/* ÉTAPE 1 - Compte */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-sl-text mb-1">Initialisation du Système</h2>
                <p className="text-sm text-sl-text-muted mb-6">Entre tes identifiants de chasseur</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-sl-text-muted mb-1.5 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sl-text-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="chasseur@exemple.com"
                        className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0, 212, 255, 0.3)', color: '#ffffff' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.7)'; e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-sl-text-muted mb-1.5 uppercase tracking-wider">Mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sl-text-muted" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none transition-all"
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0, 212, 255, 0.3)', color: '#ffffff' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.7)'; e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)' }}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sl-text-muted">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-sl-text-muted mb-1.5 uppercase tracking-wider">Nom de Chasseur</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sl-text-muted" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Ton nom légendaire..."
                        maxLength={20}
                        className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition-all"
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0, 212, 255, 0.3)', color: '#ffffff' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.7)'; e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'; e.currentTarget.style.background = 'rgba(0,0,0,0.4)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 - Avatar */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-sl-text mb-1">Sélectionne ton Avatar</h2>
                <p className="text-sm text-sl-text-muted mb-6">Choisis l&apos;apparence de ton chasseur</p>

                <div>
                  <label className="block text-xs font-medium text-sl-text-muted mb-3 uppercase tracking-wider">Avatar</label>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {PRESET_AVATARS.slice(0, 9).map((avatar) => (
                      <motion.button
                        key={avatar.id}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedAvatar(avatar.id)
                          setAvatarType('preset')
                          setCustomAvatarFile(null)
                          setCustomAvatarPreview('')
                        }}
                        className="relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-3xl transition-all"
                        style={{
                          background: avatarType === 'preset' && selectedAvatar === avatar.id ? `${avatar.color}20` : 'rgba(255,255,255,0.03)',
                          border: avatarType === 'preset' && selectedAvatar === avatar.id ? `2px solid ${avatar.color}` : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: avatarType === 'preset' && selectedAvatar === avatar.id ? `0 0 15px ${avatar.color}50` : 'none',
                        }}
                      >
                        {avatar.emoji}
                        {avatarType === 'preset' && selectedAvatar === avatar.id && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: avatar.color }}>
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                  {/* Upload avatar custom */}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all"
                    style={{ background: avatarType === 'custom' ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,212,255,0.2)', color: '#94a3b8' }}>
                    <Plus className="w-4 h-4" />
                    {customAvatarFile ? customAvatarFile.name : 'Importer un avatar'}
                    {customAvatarPreview && <img src={customAvatarPreview} alt="aperçu avatar" className="w-6 h-6 rounded-full object-cover ml-auto" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setCustomAvatarFile(file)
                        setCustomAvatarPreview(URL.createObjectURL(file))
                        setAvatarType('custom')
                      }
                    }} />
                  </label>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 - Aura */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-sl-text mb-1">Choisis ton Aura</h2>
                <p className="text-sm text-sl-text-muted mb-6">L&apos;aura définit ton essence en tant que chasseur</p>

                <div className="space-y-3">
                  {AURA_CONFIGS.map((aura) => (
                    <motion.button
                      key={aura.type}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAura(aura.type)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                      style={{
                        background: selectedAura === aura.type ? `${aura.color}15` : 'rgba(255,255,255,0.03)',
                        border: selectedAura === aura.type ? `2px solid ${aura.color}` : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: selectedAura === aura.type ? `0 0 20px ${aura.color}25` : 'none',
                      }}
                    >
                      {/* Orbe d'aura */}
                      <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                        style={{
                          background: `radial-gradient(circle, ${aura.color}40, ${aura.color}10)`,
                          border: `2px solid ${aura.color}60`,
                          boxShadow: selectedAura === aura.type ? `0 0 20px ${aura.color}50` : `0 0 8px ${aura.color}20`,
                        }}>
                        {aura.type === 'fire' ? '🔥' : aura.type === 'ice' ? '❄️' : aura.type === 'thunder' ? '⚡' : aura.type === 'shadow' ? '🌑' : '✨'}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sl-text text-sm">{aura.name}</div>
                        <div className="text-xs text-sl-text-muted mt-1">{aura.description}</div>
                      </div>
                      {selectedAura === aura.type && (
                        <Check className="w-5 h-5 flex-shrink-0" style={{ color: aura.color }} />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* ÉTAPE 4 - Bannière */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-bold text-sl-text mb-1">Choisis ta Bannière</h2>
                <p className="text-sm text-sl-text-muted mb-6">Choisis l&apos;ambiance de ton profil de chasseur</p>

                <div className="grid grid-cols-2 gap-3">
                  {PRESET_BANNERS.map((banner) => (
                    <motion.button
                      key={banner.id}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setSelectedBanner(banner.id); setBannerType('preset') }}
                      className="relative aspect-video rounded-xl overflow-hidden transition-all"
                      style={{
                        background: banner.gradient,
                        border: bannerType === 'preset' && selectedBanner === banner.id ? '2px solid #00d4ff' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: bannerType === 'preset' && selectedBanner === banner.id ? '0 0 20px rgba(0, 212, 255, 0.3)' : 'none',
                      }}
                    >
                      <div className="absolute inset-0 flex items-end p-3">
                        <span className="text-xs font-medium text-white/80">{banner.name}</span>
                      </div>
                      {bannerType === 'preset' && selectedBanner === banner.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sl-blue flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
                {/* Upload bannière custom */}
                <label className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all"
                  style={{ background: bannerType === 'custom' ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,212,255,0.2)', color: '#94a3b8' }}>
                  <Plus className="w-4 h-4" />
                  {customBannerFile ? customBannerFile.name : 'Importer une image de bannière'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setCustomBannerFile(file)
                      setBannerType('custom')
                    }
                  }} />
                </label>
              </div>
            )}

            {/* ÉTAPE 5 - Matières */}
            {step === 5 && (
              <div>
                <h2 className="text-xl font-bold text-sl-text mb-1">Tes Matières</h2>
                <p className="text-sm text-sl-text-muted mb-5">Ajoute les matières que tu étudies (au moins 1)</p>

                {/* Matières existantes */}
                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {subjects.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{ background: `${s.color}20`, border: `1px solid ${s.color}40`, color: s.color }}
                      >
                        <span>{s.icon}</span>
                        <span>{s.name}</span>
                        <button onClick={() => removeSubject(i)} className="hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Formulaire d'ajout */}
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="mb-3">
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                      placeholder="Nom de la matière (ex: Mathématiques)"
                      className="w-full py-2.5 px-3 rounded-lg text-sm outline-none"
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0, 212, 255, 0.3)', color: '#ffffff' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.7)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)' }}
                    />
                  </div>

                  {/* Sélection icône */}
                  <div className="mb-3">
                    <label className="block text-xs text-sl-text-muted mb-2">Icône</label>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_ICONS.slice(0, 10).map((icon) => (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => setNewSubjectIcon(icon.emoji)}
                          className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                          style={{
                            background: newSubjectIcon === icon.emoji ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                            border: newSubjectIcon === icon.emoji ? '1px solid rgba(0, 212, 255, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {icon.emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Couleur */}
                  <div className="mb-3">
                    <label className="block text-xs text-sl-text-muted mb-2">Couleur</label>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewSubjectColor(color)}
                          className="w-7 h-7 rounded-full transition-all"
                          style={{
                            background: color,
                            transform: newSubjectColor === color ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: newSubjectColor === color ? `0 0 10px ${color}` : 'none',
                            border: newSubjectColor === color ? '2px solid white' : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addSubject}
                    disabled={!newSubjectName.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: newSubjectName.trim() ? 'linear-gradient(135deg, #6d28d9, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                      color: newSubjectName.trim() ? 'white' : '#94a3b8',
                      cursor: newSubjectName.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter la matière
                  </motion.button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep((prev) => (prev - 1) as Step)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Retour
                </motion.button>
              )}

              {step < TOTAL_STEPS ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={nextStep}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white', boxShadow: '0 0 20px rgba(109, 40, 217, 0.4)' }}
                >
                  Continuer
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  onClick={handleFinalSubmit}
                  disabled={loading || subjects.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold"
                  style={{
                    background: loading || subjects.length === 0 ? 'rgba(109, 40, 217, 0.5)' : 'linear-gradient(135deg, #6d28d9, #00d4ff)',
                    color: 'white',
                    boxShadow: loading || subjects.length === 0 ? 'none' : '0 0 20px rgba(0, 212, 255, 0.3)',
                    cursor: subjects.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? (
                    <>
                      <motion.div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                      Initialisation...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Commencer l&apos;aventure
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Lien connexion */}
        <p className="text-center text-sm text-sl-text-muted mt-6">
          Déjà éveillé ?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#00d4ff' }}>
            Se connecter →
          </Link>
        </p>
      </div>
    </div>
  )
}
