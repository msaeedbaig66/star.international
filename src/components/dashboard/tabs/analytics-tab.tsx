'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils'
import { SafeTime } from '@/components/shared/safe-time'
import { 
 BarChart, 
 Bar, 
 XAxis, 
 YAxis, 
 CartesianGrid, 
 Tooltip, 
 ResponsiveContainer, 
 Cell,
 PieChart,
 Pie
} from 'recharts'

interface AnalyticsData {
 summary: {
 blog_views: number
 blog_likes: number
 listing_views: number
 community_members: number
 total_blogs: number
 total_listings: number
 total_communities: number
 }
 top_blogs: any[]
 top_listings: any[]
 recent_interactions: any[]
}

export function AnalyticsTab({ profile }: { profile: any }) {
 const [data, setData] = useState<AnalyticsData | null>(null)
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 async function fetchAnalytics() {
 try {
 const res = await fetch('/api/dashboard/analytics')
 if (res.ok) {
 const json = await res.json()
 setData(json.data)
 }
 } catch (error) {
 console.error('Failed to fetch analytics:', error)
 } finally {
 setLoading(false)
 }
 }
 fetchAnalytics()
 }, [])

 if (loading) {
 return (
 <div className="space-y-8 animate-pulse p-4">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
 {[1, 2, 3, 4].map(i => (
 <div key={i} className="h-32 bg-slate-50 rounded-[32px] border border-slate-100" />
 ))}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
 <div className="lg:col-span-2 h-[400px] bg-slate-50 rounded-[32px] border border-slate-100" />
 <div className="h-[400px] bg-slate-50 rounded-[32px] border border-slate-100" />
 </div>
 </div>
 )
 }

 if (!data) return null

 const chartData = [
 { name: 'Blogs', views: data.summary.blog_views, likes: data.summary.blog_likes },
 { name: 'Listings', views: data.summary.listing_views, likes: 0 },
 { name: 'Nexus Hub', views: data.summary.community_members, likes: 0 },
 ]

 const totalContent = data.summary.total_blogs + data.summary.total_listings + data.summary.total_communities
 const pieData = [
 { name: 'Blogs', value: data.summary.total_blogs, color: '#10b981', gradientId: 'grad-blogs' },
 { name: 'Listings', value: data.summary.total_listings, color: '#059669', gradientId: 'grad-listings' },
 { name: 'Communities', value: data.summary.total_communities, color: '#34d399', gradientId: 'grad-comm' },
 ]

 return (
 <div className="space-y-6 sm:space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out px-3 sm:px-6 pb-24">
 {/* Premium Header */}
 <div className="relative overflow-hidden p-6 sm:p-12 rounded-[32px] sm:rounded-[48px] bg-slate-900 text-white shadow-2xl mt-4">
 <div className="relative z-10">
 <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-4 border-none py-1.5 px-4 shadow-lg shadow-emerald-500/20">Live Intelligence</Badge>
 <h2 className="text-2xl sm:text-5xl font-black tracking-tight uppercase leading-[0.9] sm:leading-none mb-3">Performance<br className="sm:hidden" /> Audit</h2>
 <p className="text-slate-400 text-xs sm:text-lg max-w-2xl font-medium leading-relaxed">
 Real-time telemetry and algorithmic breakdown of your digital footprint within the Allpanga ecosystem.
 </p>
 </div>
 
 {/* Abstract Background Decoration */}
 <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
 <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/5 blur-[150px] rounded-full translate-x-1/3 translate-y-1/3" />
 <div className="absolute top-1/2 left-0 w-32 h-32 bg-white/5 border border-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-[60px]" />
 </div>

 {/* Highlights Grid - Enhanced Stat Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
 <StatBox 
 label="Intellectual Reach" 
 value={data.summary.blog_views} 
 sub="Total Blog views" 
 icon="visibility" 
 theme="emerald" 
 />
 <StatBox 
 label="Engagement Signal" 
 value={data.summary.blog_likes} 
 sub="Community Likes" 
 icon="favorite" 
 theme="rose" 
 />
 <StatBox 
 label="Market Exposure" 
 value={data.summary.listing_views} 
 sub="Listing Impressions" 
 icon="shopping_bag" 
 theme="emerald" 
 />
 <StatBox 
 label="Nexus Network" 
 value={data.summary.community_members} 
 sub="Members gathered" 
 icon="groups_3" 
 theme="emerald" 
 />
 </div>

 {/* Main Analytics Engine */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
 {/* Engagement Chart */}
 <Card className="lg:col-span-2 p-5 sm:p-10 rounded-[32px] sm:rounded-[48px] border-none shadow-[0_30px_70px_rgba(0,0,0,0.03)] bg-white relative overflow-hidden group">
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400 opacity-20" />
 
 <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 sm:mb-10">
 <div className="text-center sm:text-left">
 <h3 className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-1">Engagement Dynamics</h3>
 <p className="text-[10px] sm:text-xs text-slate-500 font-medium italic">Comparative activity across platforms</p>
 </div>
 
 <div className="flex items-center gap-4 sm:gap-6 p-1.5 sm:p-2 rounded-2xl bg-slate-50 border border-slate-100">
 <div className="flex items-center gap-2 px-2">
 <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-600/20" />
 <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-600 tracking-widest">Views</span>
 </div>
 <div className="h-3 sm:h-4 w-px bg-slate-200" />
 <div className="flex items-center gap-2 px-2">
 <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/20" />
 <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-600 tracking-widest">Likes</span>
 </div>
 </div>
 </div>

 <div className="h-[250px] sm:h-[350px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
 <defs>
 <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#059669" stopOpacity={1} />
 <stop offset="100%" stopColor="#10b981" stopOpacity={0.8} />
 </linearGradient>
 <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
 <stop offset="100%" stopColor="#a7f3d0" stopOpacity={0.6} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
 <XAxis 
 dataKey="name" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
 dy={10}
 />
 <YAxis hide />
 <Tooltip 
 cursor={{ fill: '#f8fafc' }}
 content={({ active, payload }) => {
 if (active && payload && payload.length) {
 return (
 <div className="bg-slate-900/95 backdrop-blur-xl text-white p-4 sm:p-5 rounded-2xl sm:rounded-[28px] shadow-2xl border border-white/10 overflow-hidden relative">
 <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 text-slate-400">{payload[0].payload.name}</p>
 <div className="space-y-1.5">
 {payload.map((p: any) => (
 <div key={p.name} className="flex justify-between gap-8 items-center">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
 <span className="text-[10px] font-semibold opacity-60 capitalize">{p.name}</span>
 </div>
 <span className="text-xs font-black tracking-tight">{formatNumber(p.value)}</span>
 </div>
 ))}
 </div>
 </div>
 )
 }
 return null
 }}
 />
 <Bar dataKey="views" fill="url(#viewsGrad)" radius={[8, 8, 2, 2]} barSize={32} />
 <Bar dataKey="likes" fill="url(#likesGrad)" radius={[8, 8, 2, 2]} barSize={32} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </Card>

 {/* Content Portfolio - Donut with Center Intel */}
 <Card className="p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] border-none shadow-[0_30px_70px_rgba(0,0,0,0.03)] bg-white flex flex-col relative overflow-hidden">
 <h3 className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-8">Asset Portfolio</h3>
 
 <div className="flex-1 flex flex-col items-center justify-center relative">
 <div className="h-[200px] sm:h-[260px] w-full relative">
 {/* Centered Total */}
 <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total</p>
 <p className="text-3xl sm:text-4xl font-black text-slate-900 leading-none mt-0.5 sm:mt-1">{totalContent}</p>
 <p className="text-[8px] font-bold text-emerald-500 uppercase mt-0.5">Assets</p>
 </div>

 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <defs>
 <linearGradient id="grad-blogs" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#10b981" />
 <stop offset="100%" stopColor="#059669" />
 </linearGradient>
 <linearGradient id="grad-listings" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#059669" />
 <stop offset="100%" stopColor="#065f46" />
 </linearGradient>
 <linearGradient id="grad-comm" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#34d399" />
 <stop offset="100%" stopColor="#10b981" />
 </linearGradient>
 </defs>
 <Pie
 data={pieData}
 cx="50%"
 cy="50%"
 innerRadius={65}
 outerRadius={85}
 paddingAngle={8}
 dataKey="value"
 stroke="none"
 >
 {pieData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} className="outline-none" />
 ))}
 </Pie>
 <Tooltip 
 content={({ active, payload }) => {
 if (active && payload && payload.length) {
 return (
 <div className="bg-slate-900/95 backdrop-blur-xl text-white px-3 py-1.5 rounded-xl shadow-xl border border-white/10">
 <p className="text-[9px] font-black uppercase tracking-widest">{payload[0].name}: <span className="text-emerald-400 ml-1">{payload[0].value}</span></p>
 </div>
 )
 }
 return null
 }}
 />
 </PieChart>
 </ResponsiveContainer>
 </div>
 
 <div className="w-full space-y-2 mt-6">
 {pieData.map(item => (
 <div key={item.name} className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
 <div className="flex items-center gap-3">
 <div className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: item.color }} />
 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{item.name}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-black text-slate-900">{item.value}</span>
 <span className="text-[8px] font-bold text-slate-400">{Math.round((item.value / (totalContent || 1)) * 100)}%</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </Card>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 pb-10">
 {/* Recent Engagers */}
 <Card className="p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] border-none shadow-[0_30px_70px_rgba(0,0,0,0.03)] bg-white relative overflow-hidden">
 <div className="absolute top-0 right-0 p-6 sm:p-8">
 <span className="material-symbols-outlined text-slate-100 text-4xl sm:text-6xl">sensors</span>
 </div>
 
 <div className="relative z-10 mb-8">
 <h3 className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-emerald-600 mb-2">Engaged Audience</h3>
 <p className="text-[10px] sm:text-xs text-slate-400 font-medium italic">High-fidelity human interactions across your profile.</p>
 </div>
 
 <div className="space-y-3 sm:space-y-4">
 {data.recent_interactions.length === 0 ? (
 <div className="py-12 sm:py-20 text-center">
 <span className="material-symbols-outlined text-5xl sm:text-6xl text-slate-100 mb-4 block">analytics</span>
 <p className="text-slate-400 text-[10px] sm:text-sm font-black uppercase tracking-widest">Awaiting digital signals</p>
 </div>
 ) : data.recent_interactions.map((event: any) => (
 <div key={event.id} className="flex items-center gap-4 sm:gap-5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-50/50 hover:bg-slate-50 transition-all border border-slate-100/30 hover:border-emerald-100 group">
 <div className="relative flex-shrink-0">
 <Avatar 
 src={event.user?.avatar_url || event.author?.avatar_url} 
 fallback={(event.user?.full_name || event.author?.full_name || 'U').charAt(0)}
 className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl border-2 border-white shadow-sm ring-1 ring-slate-100"
 />
 <div className={cn(
 "absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm",
 event.type === 'like' ? 'bg-rose-500' : 'bg-emerald-500'
 )}>
 <span className="material-symbols-outlined text-white text-[8px] sm:text-[10px]">
 {event.type === 'like' ? 'favorite' : 'chat_bubble'}
 </span>
 </div>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex justify-between items-center mb-0.5">
 <p className="text-xs sm:text-sm font-black text-slate-900 truncate pr-2">
 {event.user?.full_name || event.author?.full_name}
 </p>
 <SafeTime date={event.created_at} className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-tighter whitespace-nowrap" />
 </div>
 <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-1 leading-normal sm:leading-relaxed">
 {event.type === 'like' ? (
 <>Liked <span className="font-black text-slate-700 italic">&quot;{event.blog?.title}&quot;</span></>
 ) : (
 <>Commented: <span className="italic font-medium text-slate-700">&quot;{event.content}&quot;</span></>
 )}
 </p>
 </div>
 </div>
 ))}
 </div>
 </Card>

 {/* Performance Rankings */}
 <div className="flex flex-col gap-6 sm:gap-10">
 <Card className="p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] border-none shadow-[0_30px_70px_rgba(0,0,0,0.03)] bg-white flex-1 group">
 <div className="flex items-center justify-between mb-6">
 <h3 className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-slate-400">Top Strategic Blogs</h3>
 </div>
 
 <div className="space-y-2.5 sm:space-y-3">
 {data.top_blogs.map((blog, idx) => (
 <div key={blog.id} className="flex items-center gap-4 sm:gap-5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-50 hover:bg-emerald-50/40 transition-all border border-slate-100/50 hover:border-emerald-100 group/item">
 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white shadow-sm flex-shrink-0 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover/item:text-emerald-500 transition-colors">
 #{idx + 1}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs sm:text-sm font-black text-slate-900 truncate tracking-tight">{blog.title}</p>
 <div className="flex items-center gap-3 sm:gap-4 mt-1">
 <div className="flex items-center gap-1.5">
 <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-slate-300">visibility</span>
 <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">{formatNumber(blog.view_count)}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-rose-300">favorite</span>
 <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">{formatNumber(blog.like_count)}</span>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </Card>

 <Card className="p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] border-none shadow-[0_30px_70px_rgba(0,0,0,0.03)] bg-white flex-1 group">
 <div className="flex items-center justify-between mb-6">
 <h3 className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-slate-400">High-Visibility Assets</h3>
 </div>
 
 <div className="space-y-2.5 sm:space-y-3">
 {data.top_listings.map((item, idx) => (
 <div key={item.id} className="flex items-center gap-4 sm:gap-5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-emerald-50/20 hover:bg-emerald-50 transition-all border border-emerald-100/30 hover:border-emerald-200 group/item">
 <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white shadow-sm flex-shrink-0 flex items-center justify-center text-[10px] font-black text-emerald-400">
 0{idx + 1}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs sm:text-sm font-black text-slate-900 truncate tracking-tight">{item.title}</p>
 <div className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-lg bg-white border border-emerald-50 w-fit">
 <span className="material-symbols-outlined text-[12px] sm:text-[14px] text-emerald-500">monitoring</span>
 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{formatNumber(item.view_count)} <span className="hidden sm:inline">Impressions</span></span>
 </div>
 </div>
 <span className="material-symbols-outlined text-emerald-200 text-base sm:text-lg">trending_up</span>
 </div>
 ))}
 </div>
 </Card>
 </div>
 </div>
 </div>
 )
}

function StatBox({ 
 label, 
 value, 
 sub, 
 delta,
 icon, 
 theme 
}: { 
 label: string, 
 value: number, 
 delta?: string,
 sub: string, 
 icon: string, 
 theme: 'emerald' | 'rose' 
}) {
 const config = {
 emerald: {
 bg: 'bg-emerald-50/30 hover:bg-emerald-50/60',
 iconBg: 'bg-white shadow-emerald-500/10',
 iconColor: 'text-emerald-600',
 textColor: 'text-emerald-900',
 badge: 'bg-emerald-100 text-emerald-700',
 border: 'border-emerald-100/50'
 },
 rose: {
 bg: 'bg-rose-50/30 hover:bg-rose-50/60',
 iconBg: 'bg-white shadow-rose-500/10',
 iconColor: 'text-rose-600',
 textColor: 'text-rose-900',
 badge: 'bg-rose-100 text-rose-700',
 border: 'border-rose-100/50'
 }
 }

 const { bg, iconBg, iconColor, textColor, badge, border } = config[theme]

 return (
 <Card className={cn(
 "p-5 sm:p-8 rounded-[40px] border shadow-sm transition-all duration-500 hover:-translate-y-1.5 active:scale-95 group relative overflow-hidden",
 bg, border
 )}>
 <div className="flex justify-between items-start mb-6">
 <div className={cn(
 "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-xl transition-transform duration-500 group-hover:rotate-6",
 iconBg, iconColor
 )}>
 <span className="material-symbols-outlined text-[24px] sm:text-[28px]">{icon}</span>
 </div>
 {delta && (
 <Badge className={cn("px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border-none shadow-sm", badge)}>
 {delta}
 </Badge>
 )}
 </div>
 
 <div className="relative z-10">
 <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1.5">{label}</p>
 <div className="flex items-baseline gap-1">
 <h4 className="text-2xl sm:text-4xl font-black text-slate-900 leading-none tracking-tighter">{formatNumber(value)}</h4>
 </div>
 <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mt-3 tracking-wide opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center gap-1.5">
 <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
 {sub}
 </p>
 </div>
 
 {/* Subtle Texture */}
 <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 blur-[40px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
 </Card>
 )
}
