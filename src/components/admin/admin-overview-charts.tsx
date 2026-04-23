'use client'

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { cn } from '@/lib/utils'

type ChartPoint = {
  name: string
  value: number
}

interface AdminOverviewChartsProps {
  contentFlowData: ChartPoint[]
  userGrowthData: ChartPoint[]
  growthLabel?: string
}

export function AdminOverviewCharts({
  contentFlowData,
  userGrowthData,
  growthLabel = 'Live',
}: AdminOverviewChartsProps) {
  const safeContentFlow = contentFlowData.length > 0 ? contentFlowData : [{ name: 'N/A', value: 0 }]
  const safeGrowth = userGrowthData.length > 0 ? userGrowthData : [{ name: 'N/A', value: 0 }]

  const totalSubmissions = safeContentFlow.reduce((sum, row) => sum + (Number(row.value) || 0), 0)
  const peakSubmission = safeContentFlow.reduce((max, row) => Math.max(max, Number(row.value) || 0), 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-border relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-teal-400 to-cyan-400" />
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-base font-black text-text-primary tracking-tight">Content Flow</h3>
            <p className="text-[11px] text-text-secondary font-bold uppercase tracking-[0.18em] mt-1">
              Weekly Submission Volume
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-text-muted uppercase tracking-[0.16em]">Total</p>
            <p className="text-xl font-black text-text-primary">{totalSubmissions}</p>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeContentFlow} barCategoryGap={18}>
              <defs>
                <linearGradient id="adminFlowBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#eef2f7" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8b9bb3', fontSize: 11, fontWeight: 700 }}
                dy={8}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15,23,42,0.08)' }}
              />
              <Bar dataKey="value" fill="url(#adminFlowBar)" radius={[8, 8, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-3 text-[11px] text-text-muted font-semibold">
          Peak day volume: <span className="font-black text-text-primary">{peakSubmission}</span>
        </p>
      </section>

      <section className="bg-white p-6 rounded-3xl shadow-sm border border-border relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-lime-400" />
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-base font-black text-text-primary tracking-tight">User Growth</h3>
            <p className="text-[11px] text-text-secondary font-bold uppercase tracking-[0.18em] mt-1">
              4-Week Cumulative Trend
            </p>
          </div>
          <span
            className={cn(
              'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.16em] border',
              growthLabel.startsWith('+')
                ? 'bg-primary/10 text-primary border-primary/20'
                : growthLabel.startsWith('-')
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : 'bg-surface text-text-secondary border-border'
            )}
          >
            {growthLabel}
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeGrowth}>
              <defs>
                <linearGradient id="adminGrowthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007f80" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#007f80" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#eef2f7" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8b9bb3', fontSize: 11, fontWeight: 700 }}
                dy={8}
              />
              <Tooltip
                contentStyle={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(15,23,42,0.08)' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#007f80"
                strokeWidth={3}
                fill="url(#adminGrowthFill)"
                dot={{ r: 3, fill: '#007f80', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#0f766e', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
