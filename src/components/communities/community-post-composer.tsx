'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'
import { uploadToCloudinary } from '@/lib/cloudinary'

interface CommunityPostComposerProps {
 communityId: string
 canPost: boolean
 currentUserId?: string
 viewerRole?: string
}

export function CommunityPostComposer({ communityId, canPost, currentUserId, viewerRole }: CommunityPostComposerProps) {
 const router = useRouter()
 const [title, setTitle] = useState('')
 const [content, setContent] = useState('')
 const [isQuestion, setIsQuestion] = useState(true)
 const [isAnonymous, setIsAnonymous] = useState(false)
 const [submitting, setSubmitting] = useState(false)
 
 // Attachments
 const [imageUrl, setImageUrl] = useState<string | null>(null)
 const [fileUrl, setFileUrl] = useState<string | null>(null)
 const [fileName, setFileName] = useState<string | null>(null)
 const [uploadingImage, setUploadingImage] = useState(false)
 const [uploadingFile, setUploadingFile] = useState(false)

 const imageInputRef = useRef<HTMLInputElement>(null)
 const fileInputRef = useRef<HTMLInputElement>(null)

 const handleFileUpload = async (file: File, type: 'image' | 'file') => {
 try {
 if (type === 'image') setUploadingImage(true)
 else setUploadingFile(true)

 // Use Cloudinary for professional media handling
 // Images in community posts are limited to 250KB
 const url = await uploadToCloudinary(file, type === 'image' ? 'community_posts' : 'others')

 if (type === 'image') setImageUrl(url)
 else {
 setFileUrl(url)
 setFileName(file.name)
 }
 toast.success(`${type === 'image' ? 'Image' : 'File'} uploaded to Cloudinary`)
 } catch (err: any) {
 toast.error(`Upload failed: ${err.message}`)
 } finally {
 if (type === 'image') setUploadingImage(false)
 else setUploadingFile(false)
 }
 }

 const submit = async () => {
 if (!currentUserId) {
 window.location.href = '/login'
 return
 }
 if (!canPost) {
 toast.error('Please join the community to discuss this issue.')
 return
 }
 const trimmedTitle = title.trim()
 const trimmedContent = content.trim()
 if (trimmedTitle.length < 3) {
 toast.error('Add a short title (at least 3 characters)')
 return
 }
 if (trimmedContent.length < 10) {
 toast.error('Discussion content must be at least 10 characters')
 return
 }

 setSubmitting(true)
 try {
 const res = await fetch('/api/posts', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 community_id: communityId,
 title: trimmedTitle,
 content: trimmedContent,
 is_question: isQuestion,
 is_anonymous: isAnonymous,
 image_url: imageUrl,
 file_url: fileUrl
 }),
 })

 if (!res.ok) {
 const json = await res.json().catch(() => ({}))
 throw new Error(json?.error || 'Failed to publish discussion')
 }

 setTitle('')
 setContent('')
 setIsQuestion(true)
 setImageUrl(null)
 setFileUrl(null)
 setFileName(null)
 toast.success(isQuestion ? 'Issue posted' : 'Discussion posted')
 router.refresh()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to post discussion')
 } finally {
 setSubmitting(false)
 }
 }

 return (
 <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-5 md:p-10 shadow-xl border border-border group focus-within:ring-4 focus-within:ring-primary/5 transition-all overflow-hidden">
 <div className="space-y-6">
 <div className="flex flex-col gap-5 pb-6 border-b border-surface">
 <div className="flex flex-wrap items-center gap-2">
 <button
 type="button"
 onClick={() => setIsQuestion(true)}
 className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-1.5 md:py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border transition-all ${
 isQuestion 
 ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20' 
 : 'bg-white text-text-muted border-border hover:border-amber-600/30'
 }`}
 disabled={submitting}
 >
 <span className="material-symbols-outlined text-[14px] md:text-sm">help</span>
 Support Issue
 </button>
 <button
 type="button"
 onClick={() => setIsQuestion(false)}
 className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-1.5 md:py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border transition-all ${
 !isQuestion 
 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
 : 'bg-white text-text-muted border-border hover:border-primary/30'
 }`}
 disabled={submitting}
 >
 <span className="material-symbols-outlined text-[14px] md:text-sm">chat</span>
 Discussion
 </button>
 </div>
 
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div className="flex p-1 bg-surface border border-border rounded-xl">
  <button
  type="button"
  onClick={() => setIsAnonymous(false)}
  className={`flex items-center gap-1.5 md:gap-2 px-3.5 md:px-5 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
  !isAnonymous 
  ? 'bg-white text-primary shadow-sm border border-primary/10' 
  : 'text-text-muted hover:text-text-primary'
  }`}
  disabled={submitting}
  >
  <span className="material-symbols-outlined text-xs md:text-sm">visibility</span>
  Public
  </button>
  <button
  type="button"
  onClick={() => setIsAnonymous(true)}
  className={`flex items-center gap-1.5 md:gap-2 px-3.5 md:px-5 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
  isAnonymous 
  ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20' 
  : 'text-text-muted hover:text-text-primary'
  }`}
  disabled={submitting}
  >
  <span className="material-symbols-outlined text-xs md:text-sm">visibility_off</span>
  Anonymous
  </button>
  </div>

 <div className="flex items-center gap-2">
 <div className="hidden md:block w-px h-6 bg-border mx-1" />
 
 <input 
 ref={imageInputRef}
 type="file" 
 accept="image/*" 
 className="hidden" 
 onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')}
 />
 <input 
 ref={fileInputRef}
 type="file" 
 className="hidden" 
 onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'file')}
 />
 
 <button
 type="button"
 onClick={() => imageInputRef.current?.click()}
 disabled={submitting || uploadingImage}
 className={`p-2.5 rounded-xl border transition-all ${imageUrl ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text-muted hover:border-primary/30 hover:text-primary'}`}
 title="Add Image (<300KB)"
 >
 <span className="material-symbols-outlined text-sm">{uploadingImage ? 'sync' : 'add_photo_alternate'}</span>
 </button>
 
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 disabled={submitting || uploadingFile}
 className={`p-2.5 rounded-xl border transition-all ${fileUrl ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text-muted hover:border-primary/30 hover:text-primary'}`}
 title="Attach File (<500KB)"
 >
 <span className="material-symbols-outlined text-sm">{uploadingFile ? 'sync' : 'attach_file'}</span>
 </button>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <input
 value={title}
 onChange={(e) => setTitle(e.target.value.slice(0, 150))}
 className="w-full h-12 md:h-14 bg-surface/50 border-none rounded-2xl px-5 md:px-6 text-base md:text-lg focus:ring-2 focus:ring-primary/10 placeholder:text-text-muted font-black tracking-tight"
 placeholder={canPost ? (isQuestion ? 'What is the issue?' : 'Topic title...') : 'Please join the community to discuss this issue'}
 disabled={!canPost || submitting}
 />
 <div className="relative">
 <textarea
 value={content}
 onChange={(e) => setContent(e.target.value.slice(0, 2000))}
 className="w-full min-h-[140px] md:min-h-[160px] bg-surface/50 border-none rounded-2xl p-5 md:p-6 text-sm md:text-base focus:ring-2 focus:ring-primary/10 placeholder:text-text-muted font-medium resize-none leading-relaxed"
 placeholder={canPost ? (isQuestion ? 'Describe the issue clearly so others can help you...' : 'Share your thoughts with the community...') : 'Please join the community to discuss this issue.'}
 disabled={!canPost || submitting}
 />
 
 {/* Attachment Previews */}
 {(imageUrl || fileUrl) && (
 <div className="absolute bottom-4 left-5 md:left-6 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
 {imageUrl && (
 <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl border border-border overflow-hidden bg-white shadow-sm">
 <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
 <button onClick={() => setImageUrl(null)} className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-bl-lg shadow-md hover:bg-rose-600 transition-colors">
 <span className="material-symbols-outlined text-[10px]">close</span>
 </button>
 </div>
 )}
 {fileUrl && (
 <div className="flex items-center gap-2 bg-white border border-border px-3 py-1.5 rounded-xl shadow-sm pr-1">
 <span className="material-symbols-outlined text-sm text-primary">description</span>
 <span className="text-[9px] font-bold text-text-primary max-w-[80px] md:max-w-[100px] truncate">{fileName}</span>
 <button onClick={() => { setFileUrl(null); setFileName(null); }} className="text-text-muted hover:text-rose-500 p-1">
 <span className="material-symbols-outlined text-sm">close</span>
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-6 border-t border-surface">
 <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest">
 <span className="material-symbols-outlined text-sm">info</span>
 {isQuestion ? 'Issues get faster support' : 'Keep discussions respectful'}
 </div>
 
 <button
 type="button"
 onClick={submit}
 disabled={submitting || !title.trim() || !content.trim()}
 className="w-full md:w-auto group/btn flex items-center justify-center gap-3 bg-primary text-white font-black uppercase tracking-widest text-[10px] md:text-[11px] px-8 md:px-10 py-3.5 md:py-4 rounded-full shadow-2xl shadow-primary/30 hover:bg-primary/95 transition-all active:scale-95 disabled:opacity-50"
 >
 {submitting ? 'Publishing...' : (isQuestion ? 'Post Issue' : 'Share Discussion')}
 <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">
 send
 </span>
 </button>
 </div>
 </div>
 </div>
 )
}

