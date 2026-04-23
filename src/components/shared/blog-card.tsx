'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Blog, Profile } from '@/types/database'
import { isFeaturedActive } from '@/lib/featured-content'
import { cn } from '@/lib/utils'
import { getOptimizedImageUrl } from '@/lib/cloudinary'
import { ROUTES } from '@/lib/routes'
import { UserLink } from './navigation-links'
import { SafeDate } from './safe-time'

interface BlogCardProps {
  blog: Blog & { author?: Pick<Profile, 'username'> & { avatar_url?: string | null; full_name?: string | null } }
}

export function BlogCard({ blog }: BlogCardProps) {
  const [featuredActive, setFeaturedActive] = useState(false)
  
  useEffect(() => {
    setFeaturedActive(isFeaturedActive(blog))
  }, [blog])
  
  return (
    <div
      className={cn(
        "group/card relative w-full h-full bg-white rounded-[24px] overflow-hidden transition-all duration-500 flex flex-col border border-slate-100 hover:border-primary/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] active:scale-[0.98]",
        featuredActive && "ring-[3px] ring-primary/5 shadow-amber-500/5"
      )}
    >
      <Link
        href={ROUTES.blog.detail(blog.id)}
        className="absolute inset-0 z-10"
        aria-label={`Read ${blog.title}`}
      />

      <div className='aspect-[16/10] relative overflow-hidden bg-slate-50 pointer-events-none'>
        {blog.cover_image ? (
          <Image 
            src={getOptimizedImageUrl(blog.cover_image, 600, 400)} 
            alt={blog.title} 
            fill 
            className='object-cover group-hover/card:scale-110 transition-transform duration-700 ease-out img-reveal' 
            sizes='(max-width:768px) 100vw, 33vw' 
            onLoad={(e) => (e.target as HTMLImageElement).classList.remove('img-reveal')}
          />
        ) : (
          <div className='w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center'>
            <span className='material-symbols-outlined text-4xl text-slate-200'>article</span>
          </div>
        )}
        
        <div className='absolute top-3 left-3 z-10 flex flex-col gap-1.5'>
          {featuredActive && (
            <span className='bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 text-[8px] uppercase font-black px-2.5 py-1 rounded-lg tracking-[0.15em] flex items-center gap-1 shadow-lg shadow-amber-500/20'>
              <span className='material-symbols-outlined text-[10px]' style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              Featured
            </span>
          )}
          {blog.field && (
            <span className='bg-slate-900/80 backdrop-blur-md text-white border border-white/10 text-[8px] uppercase font-black px-2.5 py-1 rounded-lg tracking-widest'>
              {blog.field}
            </span>
          )}
        </div>
      </div>
      
      <div className='p-3 sm:p-5 flex flex-col flex-1 pb-3 sm:pb-4 relative z-20 pointer-events-none'>
        <div className="flex-1 space-y-1 sm:space-y-2">
            <h3 className='text-[12px] sm:text-[14px] font-black text-slate-900 group-hover/card:text-primary transition-colors line-clamp-2 leading-tight uppercase tracking-tight'>
              {blog.title}
            </h3>
            <div className='flex items-center flex-wrap gap-1.5 sm:gap-2'>
                {blog.author && (
                    <div className="pointer-events-auto">
                      <UserLink 
                        user={blog.author} 
                        size="xs" 
                        className="shrink-0" 
                        showName 
                      />
                    </div>
                )}
                <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-200" />
                <SafeDate 
                  date={blog.created_at} 
                  className='text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-widest whitespace-nowrap' 
                />
            </div>
        </div>
        
        <div className='flex items-center gap-2 sm:gap-4 pt-3 sm:pt-4 mt-auto border-t border-slate-50'>
          <div className="flex items-center gap-1 sm:gap-1.5" title="Likes">
            <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-slate-300" style={{ fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
            <span className="text-[9px] sm:text-[10px] font-black text-slate-500 tabular-nums">{blog.like_count || 0}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5" title="Comments">
            <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-slate-300">chat_bubble</span>
            <span className="text-[9px] sm:text-[10px] font-black text-slate-500 tabular-nums">{blog.comment_count || 0}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 ml-auto" title="Reads">
            <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-slate-300">visibility</span>
            <span className="text-[9px] sm:text-[10px] font-black text-slate-500 tabular-nums">{blog.view_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
