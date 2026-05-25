'use client'

import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Clock, Star, Sword, Flame } from 'lucide-react'

// Données mock pour les graphiques
const WEEKLY_STUDY_DATA = [
  { day: 'Lun', hours: 3.5, xp: 280, quests: 3 },
  { day: 'Mar', hours: 2, xp: 160, quests: 2 },
  { day: 'Mer', hours: 4.5, xp: 380, quests: 4 },
  { day: 'Jeu', hours: 1.5, xp: 120, quests: 1 },
  { day: 'Ven', hours: 5, xp: 420, quests: 5 },
  { day: 'Sam', hours: 3, xp: 250, quests: 3 },
  { day: 'Dim', hours: 2.5, xp: 200, quests: 2 },
]

const XP_OVER_TIME = [
  { date: '1 Mai', xp: 400 },
  { date: '5 Mai', xp: 620 },
  { date: '10 Mai', xp: 950 },
  { date: '12 Mai', xp: 1100 },
  { date: '15 Mai', xp: 1350 },
  { date: '18 Mai', xp: 1450 },
  { date: '20 Mai', xp: 1620 },
  { date: '22 Mai', xp: 1750 },
  { date: '25 Mai', xp: 1850 },
]

const SUBJECT_RADAR_DATA = [
  { subject: 'Maths', xp: 85, fullMark: 100 },
  { subject: 'Physique', xp: 62, fullMark: 100 },
  { subject: 'Info', xp: 95, fullMark: 100 },
  { subject: 'Économie', xp: 45, fullMark: 100 },
  { subject: 'Droit', xp: 30, fullMark: 100 },
  { subject: 'Langues', xp: 55, fullMark: 100 },
]

const MONTHLY_STATS = [
  { month: 'Jan', quests: 28, dungeons: 2, xp: 2200 },
  { month: 'Fév', quests: 35, dungeons: 3, xp: 2800 },
  { month: 'Mar', quests: 22, dungeons: 1, xp: 1750 },
  { month: 'Avr', quests: 41, dungeons: 4, xp: 3300 },
  { month: 'Mai', quests: 38, dungeons: 3, xp: 3050 },
]

const CUSTOM_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0f0f1a',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '12px',
  },
  cursor: { fill: 'rgba(0, 212, 255, 0.05)' },
}

export default function StatsPage() {
  const totalHoursThisWeek = WEEKLY_STUDY_DATA.reduce((s, d) => s + d.hours, 0)
  const totalXpThisWeek = WEEKLY_STUDY_DATA.reduce((s, d) => s + d.xp, 0)
  const totalQuestsThisWeek = WEEKLY_STUDY_DATA.reduce((s, d) => s + d.quests, 0)
  const avgHoursPerDay = (totalHoursThisWeek / 7).toFixed(1)

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-sl-text mb-1">Statistiques</h1>
        <p className="text-sm text-sl-text-muted">Analyse de ta progression de chasseur</p>
      </div>

      {/* KPIs cette semaine */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Heures cette semaine', value: `${totalHoursThisWeek}h`, icon: Clock, color: '#00d4ff', change: '+12%' },
          { label: 'XP cette semaine', value: totalXpThisWeek.toLocaleString('fr-FR'), icon: Star, color: '#f59e0b', change: '+8%' },
          { label: 'Quêtes terminées', value: totalQuestsThisWeek, icon: Sword, color: '#8b5cf6', change: '+15%' },
          { label: 'Moy. par jour', value: `${avgHoursPerDay}h`, icon: TrendingUp, color: '#10b981', change: '+5%' },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl p-4"
              style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20` }}
            >
              <Icon className="w-5 h-5 mb-2" style={{ color: kpi.color }} />
              <div className="text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs text-sl-text-muted mt-0.5">{kpi.label}</div>
              <div className="text-xs text-sl-green mt-1">{kpi.change} vs semaine dernière</div>
            </motion.div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Graphique heures par jour */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0, 212, 255, 0.1)' }}
        >
          <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sl-blue" />
            Heures d&apos;étude cette semaine
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={WEEKLY_STUDY_DATA} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip
                contentStyle={CUSTOM_TOOLTIP_STYLE.contentStyle}
                cursor={{ fill: 'rgba(0, 212, 255, 0.05)' }}
                formatter={(value) => [`${value}h`, 'Heures']}
              />
              <Bar dataKey="hours" fill="url(#blueGrad)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Graphique XP dans le temps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
        >
          <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sl-purple" />
            Courbe XP global
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={XP_OVER_TIME}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={CUSTOM_TOOLTIP_STYLE.contentStyle}
                formatter={(value) => [`${value} XP`, 'XP Total']}
              />
              <Line
                type="monotone"
                dataKey="xp"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#8b5cf6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Radar par matière */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0, 212, 255, 0.1)' }}
        >
          <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sl-blue" />
            Maîtrise par matière
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={SUBJECT_RADAR_DATA} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Radar
                name="Maîtrise"
                dataKey="xp"
                stroke="#00d4ff"
                fill="#00d4ff"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={CUSTOM_TOOLTIP_STYLE.contentStyle}
                formatter={(value) => [`${value}%`, 'Maîtrise']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Activité mensuelle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245, 158, 11, 0.1)' }}
        >
          <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-sl-gold" />
            Quêtes par mois
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_STATS} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip
                contentStyle={CUSTOM_TOOLTIP_STYLE.contentStyle}
                formatter={(value, name) => [value, name === 'quests' ? 'Quêtes' : 'Donjons']}
              />
              <Bar dataKey="quests" fill="url(#goldGrad)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dungeons" fill="url(#purpleGrad)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Tableau récapitulatif */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6 rounded-xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="p-4 border-b border-white/5">
          <h3 className="font-bold text-sl-text">Récapitulatif global</h3>
        </div>
        <div className="divide-y divide-white/5">
          {[
            { label: 'Total XP accumulé', value: '1,850 XP', icon: '⭐' },
            { label: 'Total heures étudiées', value: '64h 30min', icon: '📚' },
            { label: 'Quêtes complétées', value: '178', icon: '⚔️' },
            { label: 'Donjons conquis', value: '8', icon: '🏰' },
            { label: 'Boss vaincus', value: '3', icon: '💀' },
            { label: 'Plus longue série', value: '15 jours', icon: '🔥' },
            { label: 'Titres débloqués', value: '7 / 20', icon: '👑' },
            { label: 'Matières étudiées', value: '4', icon: '📖' },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-sl-text-muted">
                <span>{row.icon}</span>
                {row.label}
              </div>
              <span className="font-bold text-sm text-sl-text">{row.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
