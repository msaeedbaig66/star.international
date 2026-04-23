'use client'

import { toast } from 'sonner'

interface BlogShareActionsProps {
 title: string
 variant?: 'default' | 'icon-only'
}

export function BlogShareActions({ title, variant = 'default' }: BlogShareActionsProps) {
 const handleShare = async () => {
 const url = window.location.href
 try {
 if (navigator.share) {
 await navigator.share({
 title,
 text: `Check this blog on Allpanga: ${title}`,
 url,
 })
 return
 }
 await navigator.clipboard.writeText(url)
 toast.success('Blog link copied')
 } catch {
 toast.error('Unable to share right now')
 }
 }

 const handleCopy = async () => {
 try {
 await navigator.clipboard.writeText(window.location.href)
 toast.success('Link copied to clipboard')
 } catch {
 toast.error('Unable to copy link')
 }
 }

 const handleEmail = () => {
 const url = window.location.href
 const subject = encodeURIComponent(`Allpanga Blog: ${title}`)
 const body = encodeURIComponent(`Check this blog:\n\n${title}\n${url}`)
 window.location.href = `mailto:?subject=${subject}&body=${body}`
 }

 if (variant === 'icon-only') {
 return (
 <button onClick={handleShare} className="w-full h-full flex items-center justify-center text-text-muted hover:text-primary transition-colors">
 <span className="material-symbols-outlined text-[20px]">share</span>
 </button>
 )
 }

 return (
 <div className="flex gap-2">
 <button onClick={handleShare} className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
 <span className="material-symbols-outlined text-[18px]">share</span>
 </button>
 <button onClick={handleCopy} className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
 <span className="material-symbols-outlined text-[18px]">link</span>
 </button>
 <button onClick={handleEmail} className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
 <span className="material-symbols-outlined text-[18px]">mail</span>
 </button>
 </div>
 )
}

