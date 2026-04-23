'use client';

import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';

interface AdminNavbarProps {
  user?: User | null;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export function AdminNavbar({ user, onToggleSidebar, isSidebarCollapsed }: AdminNavbarProps) {
  return (
    <header className={cn(
      "fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-xl z-30 flex justify-between items-center px-8 border-b border-border transition-all duration-300 ease-in-out",
      isSidebarCollapsed ? "w-[calc(100%-80px)]" : "w-[calc(100%-260px)]"
    )}>
      <div className="flex items-center gap-6">
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-text-secondary hover:text-primary transition-all hover:bg-surface rounded-lg group active:scale-90"
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <span className={cn(
            "material-symbols-outlined transition-transform duration-300",
            isSidebarCollapsed && "rotate-180"
          )}>
            side_navigation
          </span>
        </button>

        <h2 className="text-sm font-black text-text-primary tracking-tighter uppercase whitespace-nowrap">Console <span className="text-primary italic">Node</span></h2>
        
        <div className="relative group hidden md:block">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
            <span className="material-symbols-outlined text-xl">search</span>
          </span>
          <input
            className="bg-surface border-none rounded-full py-2 pl-10 pr-4 w-64 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            placeholder="Query telemetry..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <button className="p-2 text-text-secondary hover:text-primary transition-colors hover:bg-surface rounded-full group">
          <span className="material-symbols-outlined shrink-0 group-active:scale-90 transition-transform">notifications</span>
        </button>
        <button className="p-2 text-text-secondary hover:text-primary transition-colors hover:bg-surface rounded-full group">
          <span className="material-symbols-outlined shrink-0 group-active:scale-90 transition-transform">settings</span>
        </button>
        
        <div className="h-6 w-px bg-border hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-xs font-bold text-text-primary">Admin Panel</span>
            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Verified</span>
          </div>
          <div className="w-9 h-9 rounded-full ring-2 ring-border/50 overflow-hidden cursor-primary active:scale-95 transition-transform bg-surface flex items-center justify-center shadow-sm">
            {user?.user_metadata?.avatar_url ? (
              <Image
                alt="Admin Avatar"
                className="w-full h-full object-cover"
                src={user.user_metadata.avatar_url}
                width={36}
                height={36}
              />
            ) : (
              <span className="material-symbols-outlined text-text-muted">person</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
