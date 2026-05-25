'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Clock, Star, Sword } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/lib/store'

type Period = '7j' | '30j' | '3m'

type DailyHoursEntry = {
  date: string
  heures: number
  xp: number
}

type SubjectStatEntry = {
  name: string
  heures: number
  quetes: number
  rang: number
}

type ChartData = {
  dailyHours: DailyHoursEntry[]
  subjectStats: SubjectStatEntry[]
}

type CumulativeEntry = {
  date: string
  xp: number
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0f0f1a',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '12px',
  },
}

export default function StatsPage() {
  const { userProfile, subjects } = useGameStore()
  const [period, setPeriod] = useState<Period>('7j')
  const [chartData, setChartData] = useState<ChartData>({
    dailyHours: [],
    subjectStats: [],
  })
  const [loading, setLoading] = useState(!!userProfile)

  useEffect(() => {
    if (!userProfile) return

    const fetchChartData = async () => {
      setLoading(true)
      const days = period === '7j' ? 7 : period === '30j' ? 30 : 90
      const since = new Date()
      since.setDate(since.getDate() - days)

      const { data: quests } = await supabase
        .from('quests')
        .select('completed_at, time_spent_minutes, xp_reward, subject_id')
        .eq('user_id', userProfile.id)
        .eq('status', 'completed')
        .gte('completed_at', since.toISOString())

      // Grouper par jour
      const byDay: Record<string, { heures: number; xp: number }> = {}
      ;(quests || []).forEach(
        (q: { completed_at: string; time_spent_minutes?: number; xp_reward: number }) => {
          const day = q.completed_at.split('T')[0]
          if (!byDay[day]) byDay[day] = { heures: 0, xp: 0 }
          byDay[day].heures += (q.time_spent_minutes || 0) / 60
          byDay[day].xp += q.xp_reward
        }
      )

      // Générer les n derniers jours
      const dailyHours: DailyHoursEntry[] = Array.from({ length: days }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (days - 1 - i))
        const key = d.toISOString().split('T')[0]
        const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        return {
          date: label,
          heures: Math.round((byDay[key]?.heures || 0) * 10) / 10,
          xp: byDay[key]?.xp || 0,
        }
      })

      // Stats par matière
      const subjectStats: SubjectStatEntry[] = subjects.map((s) => {
        const sQuests = (quests || []).filter(
          (q: { subject_id?: string }) => q.subject_id === s.id
        )
        const totalMin = sQuests.reduce(
          (acc: number, q: { time_spent_minutes?: number }) => acc + (q.time_spent_minutes || 0),
          0
        )
        const rankIndex = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Monarque'].indexOf(s.rank)
        return {
          name: s.name,
          heures: Math.round(totalMin / 6) / 10,
          quetes: sQuests.length,
          rang: rankIndex + 1,
        }
      })

      setChartData({ dailyHours, subjectStats })
      setLoading(false)
    }

    fetchChartData()
  }, [userProfile, subjects, period])

  // Calculs KPI sur la période
  const totalHeures = chartData.dailyHours.reduce((s, d) => s + d.heures, 0)
  const totalXP = chartData.dailyHours.reduce((s, d) => s + d.xp, 0)
  const daysCount = period === '7j' ? 7 : period === '30j' ? 30 : 90

  // XP cumulé pour le LineChart
  const cumulativeXP: CumulativeEntry[] = chartData.dailyHours.reduce<CumulativeEntry[]>((acc, entry) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].xp : 0
    acc.push({ date: entry.date, xp: prev + entry.xp })
    return acc
  }, [])

  // Données radar
  const radarData = chartData.subjectStats.map((s) => ({
    subject: s.name.length > 8 ? s.name.slice(0, 8) + '.' : s.name,
    rang: s.rang,
    heures: Math.min(s.heures * 10, 100),
    quetes: Math.min(s.quetes * 5, 100),
  }))

  // Tableau trié par heures desc
  const sortedSubjectStats = [...chartData.subjectStats].sort((a, b) => b.heures - a.heures)

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-white/5 rounded w-48 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-sl-text mb-1">Statistiques</h1>
          <p className="text-sm text-sl-text-muted">Analyse de ta progression de chasseur</p>
        </div>

        {/* Sélecteur de période */}
        <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {(['7j', '30j', '3m'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: period === p ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                color: period === p ? '#00d4ff' : '#94a3b8',
                border: period === p ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
              }}
            >
              {p === '7j' ? '7 jours' : p === '30j' ? '30 jours' : '3 mois'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Heures totales', value: `${Math.round(totalHeures * 10) / 10}h`, icon: Clock, color: '#00d4ff' },
          { label: 'XP gagnés', value: totalXP.toLocaleString('fr-FR'), icon: Star, color: '#f59e0b' },
          { label: 'Moy. / jour', value: `${Math.round((totalHeures / daysCount) * 10) / 10}h`, icon: TrendingUp, color: '#10b981' },
          { label: 'Matières actives', value: chartData.subjectStats.filter((s) => s.quetes > 0).length, icon: Sword, color: '#8b5cf6' },
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
            </motion.div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* BarChart — Heures par jour */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0, 212, 255, 0.1)' }}
        >
          <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sl-blue" />
            Heures d&apos;étude par jour
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData.dailyHours} barSize={period === '3m' ? 4 : period === '30j' ? 8 : 20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={period === '3m' ? 14 : period === '30j' ? 6 : 0}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                cursor={{ fill: 'rgba(0, 212, 255, 0.05)' }}
                formatter={(value: ValueType | undefined) => [`${Array.isArray(value) ? value[0] : (value ?? 0)}h`, 'Heures']}
              />
              <defs>
                <linearGradient id="purpleBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <Bar dataKey="heures" fill="url(#purpleBarGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* LineChart — XP cumulé */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59, 130, 246, 0.1)' }}
        >
          <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sl-blue" />
            Courbe XP cumulé
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cumulativeXP}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={period === '3m' ? 14 : period === '30j' ? 6 : 0}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                formatter={(value: ValueType | undefined) => [`${Array.isArray(value) ? value[0] : (value ?? 0)} XP`, 'XP cumulé']}
              />
              <Line
                type="monotone"
                dataKey="xp"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* RadarChart — Performance par matière (si > 2 matières) */}
        {subjects.length > 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
          >
            <h3 className="font-bold text-sl-text mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sl-purple" />
              Performance par matière
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Radar
                  name="Rang"
                  dataKey="rang"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Radar
                  name="Heures"
                  dataKey="heures"
                  stroke="#00d4ff"
                  fill="#00d4ff"
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE.contentStyle}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Tableau stats par matière */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`rounded-xl overflow-hidden ${subjects.length <= 2 ? 'lg:col-span-2' : ''}`}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="p-4 border-b border-white/5">
            <h3 className="font-bold text-sl-text flex items-center gap-2">
              <Star className="w-4 h-4 text-sl-gold" />
              Stats par matière
            </h3>
          </div>
          {sortedSubjectStats.length === 0 ? (
            <div className="p-6 text-center text-sl-text-muted text-sm">
              Aucune donnée pour cette période.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-sl-text-muted uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Matière</th>
                    <th className="px-4 py-3 text-center">Rang</th>
                    <th className="px-4 py-3 text-center">Heures</th>
                    <th className="px-4 py-3 text-center">Quêtes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedSubjectStats.map((s, i) => {
                    const subject = subjects.find((sub) => sub.name === s.name)
                    return (
                      <tr key={i} className="hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3 font-medium text-sl-text flex items-center gap-2">
                          {subject && <span>{subject.icon}</span>}
                          {s.name}
                        </td>
                        <td className="px-4 py-3 text-center text-sl-text-muted">
                          {subject ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                              style={{ color: subject.color, border: `1px solid ${subject.color}40` }}
                            >
                              {subject.rank}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sl-text">{s.heures}h</td>
                        <td className="px-4 py-3 text-center text-sl-text">{s.quetes}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
