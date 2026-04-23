import { cn } from '@/lib/utils';

interface StatCardProps {
 label: string;
 value: string | number;
 trend?: {
 value: string;
 isUp: boolean;
 };
 icon: string;
 color?: string;
 isUrgent?: boolean;
}

export function StatCard({ label, value, trend, icon, color = 'primary', isUrgent }: StatCardProps) {
 const iconColors: Record<string, string> = {
 primary: 'bg-primary/10 text-primary',
 emerald: 'bg-emerald-500/10 text-emerald-600',
 purple: 'bg-purple-500/10 text-purple-600',
 amber: 'bg-amber-500/10 text-amber-600',
 teal: 'bg-teal-500/10 text-teal-600',
 destructive: 'bg-destructive/10 text-destructive',
 };

 return (
 <div className={cn(
 "bg-white p-6 rounded-2xl border border-border shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300",
 isUrgent && "border-destructive/30 ring-1 ring-destructive/5"
 )}>
 <div className="absolute -top-4 -right-4 w-24 h-24 bg-surface rounded-full blur-2xl group-hover:scale-110 transition-transform" />
 
 <div className="flex justify-between items-start mb-4">
 <div className={cn("p-2 rounded-lg", iconColors[color] || iconColors.primary)}>
 <span className="material-symbols-outlined text-xl">{icon}</span>
 </div>
 
 {isUrgent && (
 <span className="text-[10px] font-black text-destructive border border-destructive/20 px-1.5 py-0.5 rounded animate-pulse">
 SLO BREACH
 </span>
 )}
 </div>

 <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">{label}</p>
 
 <div className="flex items-baseline gap-2 mt-1">
 <span className="text-3xl font-black text-text-primary tracking-tighter">{value}</span>
 {trend && (
 <span className={cn(
 "text-xs font-bold",
 trend.isUp ? "text-primary" : "text-destructive"
 )}>
 {trend.value}
 </span>
 )}
 </div>
 </div>
 );
}
