"use client";

import { useMemo, useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

type Round = {
  id: string
  startDate: string
  endDate: string
  drawingDate?: string
  distributionDate?: string
  prizePoolSol: number
  totalParticipants: number
  eligibleParticipants: number
  tierWinners: Record<string, string>
  snapshotStartedAt?: string
  snapshotCompletedAt?: string
}

type HistoryDashboardProps = {
  rounds: Round[]
}

const COLORS = {
  primary: '#22d3ee',
  secondary: '#a855f7',
  eligible: '#22d3ee',
  nonEligible: '#a855f7',
  gradient1: '#22d3ee',
  gradient2: '#a855f7'
}

export default function HistoryDashboard({ rounds }: HistoryDashboardProps) {
  // Metric Cards Data - fetch from API to match homepage
  const [stats, setStats] = useState({
    totalRounds: 0,
    totalSolDistributed: 0,
    totalWinners: 0,
    avgPrizePool: 0
  })

  useEffect(() => {
    fetch('/api/dashboard-stats')
      .then(r => r.json())
      .then(data => {
        setStats({
          totalRounds: data.totalRounds || 0,
          totalSolDistributed: data.totalSolDistributed || 0,
          totalWinners: data.totalWinners || 0,
          avgPrizePool: data.avgPrizePool || 0
        })
      })
      .catch(() => {})
  }, [])

  const metricCards = useMemo(() => {
    return [
      {
        label: 'Total Lottery Rounds',
        value: stats.totalRounds.toString(),
        detail: 'since automation',
        gradient: 'from-primary/20 to-primary/5',
        borderColor: 'border-primary/30'
      },
      {
        label: 'Total SOL Distributed',
        value: stats.totalSolDistributed.toFixed(2),
        detail: 'aggregate payouts',
        gradient: 'from-primary/20 to-primary/5',
        borderColor: 'border-primary/30'
      },
      {
        label: 'Total Winners',
        value: stats.totalWinners.toString(),
        detail: 'across all tiers',
        gradient: 'from-primary/20 to-primary/5',
        borderColor: 'border-primary/30'
      },
      {
        label: 'Avg Prize Pool (SOL)',
        value: stats.avgPrizePool.toFixed(2),
        detail: 'per drawing',
        gradient: 'from-primary/20 to-primary/5',
        borderColor: 'border-primary/30'
      }
    ]
  }, [stats])

  // 1. Pie Chart Data: Last Round Participation
  const participationData = useMemo(() => {
    if (rounds.length === 0) return []
    const lastRound = rounds[0]
    const eligible = lastRound.eligibleParticipants
    const nonEligible = lastRound.totalParticipants - eligible
    return [
      { name: 'Eligible Participants', value: eligible, color: COLORS.eligible },
      { name: 'Non-Eligible Participants', value: nonEligible, color: COLORS.nonEligible }
    ]
  }, [rounds])

  // 2. Bar Chart Data: Eligible Participants by Round
  const eligibleByRoundData = useMemo(() => {
    return rounds
      .slice()
      .reverse()
      .map(round => ({
        roundDate: round.drawingDate
          ? new Date(round.drawingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : new Date(round.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        eligible: round.eligibleParticipants
      }))
  }, [rounds])

  // 3. Combo Line Chart Data: System Performance (Snapshot & Distribution Duration)
  const performanceData = useMemo(() => {
    return rounds
      .slice()
      .reverse()
      .filter(round => {
        // Include round if it has at least one complete timing metric
        const hasSnapshotData = round.snapshotStartedAt && round.snapshotCompletedAt
        const hasDistributionData = round.drawingDate && round.distributionDate
        return hasSnapshotData || hasDistributionData
      })
      .map(round => {
        const snapshotDuration = round.snapshotStartedAt && round.snapshotCompletedAt
          ? (new Date(round.snapshotCompletedAt).getTime() - new Date(round.snapshotStartedAt).getTime()) / 1000 / 60
          : null

        const distributionDuration = round.drawingDate && round.distributionDate
          ? (new Date(round.distributionDate).getTime() - new Date(round.drawingDate).getTime()) / 1000 / 60
          : null

        return {
          roundDate: round.drawingDate
            ? new Date(round.drawingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : new Date(round.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          snapshotDuration: snapshotDuration ? parseFloat(snapshotDuration.toFixed(2)) : null,
          distributionDuration: distributionDuration ? parseFloat(distributionDuration.toFixed(2)) : null
        }
      })
  }, [rounds])

  // 4. Area Chart Data: Prize Pool Growth
  const prizePoolData = useMemo(() => {
    return rounds
      .slice()
      .reverse()
      .map(round => ({
        roundDate: round.drawingDate
          ? new Date(round.drawingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : new Date(round.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        prizePool: parseFloat(round.prizePoolSol.toFixed(3))
      }))
  }, [rounds])

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-night-900/60 p-6">
        <p className="text-slate-400 text-center">No rounds data available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title and Metric Cards Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Analytics Dashboard Title */}
        <h2 className="text-4xl sm:text-5xl font-bold text-primary">Analytics Dashboard</h2>

        {/* Metric Cards */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-lg border ${card.borderColor} bg-gradient-to-br ${card.gradient} px-4 py-2.5 text-center shadow-md backdrop-blur-sm hover:shadow-lg transition-all duration-300 min-w-[140px] sm:min-w-[160px]`}
            >
              <p className="text-lg sm:text-xl font-bold bg-gradient-to-br from-primary via-accent to-secondary bg-clip-text text-transparent">
                {card.value}
              </p>
              <p className="mt-1 text-[10px] sm:text-xs font-semibold text-slate-200">{card.label}</p>
              <p className="text-[8px] sm:text-[9px] uppercase tracking-wide text-slate-400">{card.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Pie Chart: Participation Breakdown */}
        <div className="rounded-2xl border border-primary/20 bg-night-900/60 p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Last Round: Participation Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">Eligible vs non-eligible token holders</p>
          {participationData.length > 0 && (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <defs>
                  <linearGradient id="colorEligible" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.eligible} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.eligible} stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorNonEligible" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.nonEligible} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.nonEligible} stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <Pie
                  data={participationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="none"
                >
                  {participationData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? 'url(#colorEligible)' : 'url(#colorNonEligible)'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee40', padding: '8px 12px' }}
                  labelStyle={{ color: '#22d3ee', fontWeight: 600 }}
                  itemStyle={{ color: '#94a3b8' }}
                  formatter={(value: any, name: string) => [`${value} participants`, name]}
                />
                <Legend
                  formatter={(value) => {
                    const data = participationData.find(d => d.name === value)
                    return `${value} (${data?.value || 0})`
                  }}
                  wrapperStyle={{ color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 2. Bar Chart: Eligible Participants by Round */}
        <div className="rounded-2xl border border-primary/20 bg-night-900/60 p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Eligible Participants by Round</h3>
          <p className="text-xs text-slate-400 mb-4">Number of qualified participants per round</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eligibleByRoundData}>
              <defs>
                <linearGradient id="colorBarEligible" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="roundDate"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee40' }}
                labelStyle={{ color: '#22d3ee' }}
              />
              <Bar dataKey="eligible" fill="url(#colorBarEligible)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Combo Line Chart: System Performance */}
        <div className="rounded-2xl border border-primary/20 bg-night-900/60 p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">System Performance Metrics</h3>
          <p className="text-xs text-slate-400 mb-4">Processing time in minutes</p>
          {performanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="roundDate"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'Minutes', angle: 90, position: 'insideRight', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee40' }}
                  labelStyle={{ color: '#22d3ee' }}
                  formatter={(value: any) => `${value} min`}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="snapshotDuration"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Snapshot Duration"
                  dot={{ fill: COLORS.primary }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="distributionDuration"
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  name="Distribution Duration"
                  dot={{ fill: COLORS.secondary }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm text-center py-20">No performance data available yet.</p>
          )}
        </div>

        {/* 4. Area Chart: Prize Pool Growth */}
        <div className="rounded-2xl border border-primary/20 bg-night-900/60 p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Prize Pool Growth</h3>
          <p className="text-xs text-slate-400 mb-4">Total SOL prize pool per round</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={prizePoolData}>
              <defs>
                <linearGradient id="colorPrizePool" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.gradient1} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS.gradient2} stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="roundDate"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                label={{ value: 'SOL', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #22d3ee40' }}
                labelStyle={{ color: '#22d3ee' }}
                formatter={(value: any) => `${value} SOL`}
              />
              <Area
                type="monotone"
                dataKey="prizePool"
                stroke={COLORS.primary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrizePool)"
                name="Prize Pool"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
