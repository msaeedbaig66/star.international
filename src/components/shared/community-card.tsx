'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import type { Community } from '@/types/database'
import { isFeaturedActive } from '@/lib/featured-content'
import { cn } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/cloudinary'
import { ROUTES } from '@/lib/routes'

interface CommunityCardProps {
  community: Community
  isMember?: boolean
  onJoin?: (id: string) => void
}

export function CommunityCard({ community, isMember, onJoin }: CommunityCardProps) {
  const [featuredActive, setFeaturedActive] = useState(false)
  
  useEffect(() => {
    setFeaturedActive(isFeaturedActive(community))
  }, [community])
  
  return (
    <div className={cn(
      "relative flex flex-col sm:flex-col md:flex-col lg:flex-col p-5 md:p-8 bg-white rounded-3xl md:rounded-[2rem] transition-all duration-300 border border-slate-200 hover:border-primary/40 hover:-translate-y-1 group/card shadow-sm hover:shadow-xl overflow-hidden",
      featuredActive ? "ring-2 ring-primary/20 shadow-primary/10" : ""
    )} >
      <Link href={ROUTES.communities.detail(community.id)} className="absolute inset-0 z-[1]" />
      
      <div className="relative z-10 pointer-events-none flex flex-row lg:flex-col items-center lg:items-center gap-5 lg:gap-0 lg:justify-center">
        {featuredActive && (
          <div className='absolute -top-6 -right-6 lg:-top-8 lg:-right-8 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-4 py-2 pt-8 pr-8 rounded-bl-[2rem] text-[9px] font-black uppercase tracking-widest flex items-end justify-start gap-1 shadow-md pointer-events-auto'>
            <span className='material-symbols-outlined text-[14px] font-black mb-[2px] ml-1'>star</span>
          </div>
        )}
        
        <div className='w-20 h-20 md:w-24 md:h-24 shrink-0 lg:mx-auto lg:mb-5 rounded-2xl md:rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 relative shadow-sm group-hover/card:border-primary/30 group-hover/card:shadow-md transition-all duration-500 flex items-center justify-center'>
          {community.avatar_url ? (
            <Image 
              src={getOptimizedImageUrl(community.avatar_url, 200, 200)} 
              alt={community.name || 'Community'} 
              fill 
              sizes='96px'
              className='object-cover transition-transform duration-700 group-hover/card:scale-110'
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-black text-2xl md:text-4xl uppercase">
              {(community.name || '?').charAt(0)}
            </div>
          )}
        </div>
        
        <div className="space-y-1.5 md:space-y-3 flex-1 lg:w-full lg:text-center">
            <h3 className='font-extrabold text-[15px] md:text-[16px] text-slate-900 group-hover/card:text-primary transition-colors leading-tight line-clamp-2 tracking-tight flex flex-wrap justify-start lg:justify-center items-center gap-1.5'>
              <span className="line-clamp-2 leading-snug">{community.name}</span>
              {community.is_official && <span className="material-symbols-outlined text-emerald-500 text-[16px] md:text-[18px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
            </h3>
            
            <div className='flex flex-wrap items-center justify-start lg:justify-center gap-2'>
              {(community as any).owner?.role === 'admin' && (
                <span className="bg-emerald-600 text-white text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest shadow-sm">
                  <span className="material-symbols-outlined text-[10px] md:text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                  Official
                </span>
              )}
              <div className='text-slate-500 text-[10px] md:text-sm font-bold flex items-center justify-center gap-1'>
                <span className="material-symbols-outlined text-[14px] md:text-[16px]">group</span>
                {community.member_count} Member{community.member_count !== 1 && 's'}
              </div>
            </div>
        </div>
      </div>
      
      {onJoin && (
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault(); 
            onJoin(community.id); 
          }}
          className={cn(
            "relative z-20 mt-4 lg:mt-8 w-full font-black py-2.5 md:py-3.5 rounded-xl transition-all text-[11px] md:text-[13px] tracking-wide flex items-center justify-center gap-2 uppercase",
            isMember 
              ? 'bg-slate-100/80 text-slate-400 cursor-default'
              : 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 hover:shadow-primary/30'
          )}
        >
          {isMember ? 'Joined' : 'Join Nexus'}
          <span className="material-symbols-outlined text-[16px] md:text-[18px] font-black">{isMember ? 'check' : 'add'}</span>
        </button>
      )}
    </div>
  )
}
