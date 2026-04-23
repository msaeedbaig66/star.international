'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FIELDS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import NextImage from 'next/image'
import { sanitizeBlogHtml } from '@/lib/security/blog-html'
import { cn } from '@/lib/utils'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'

interface BlogStudioTabProps {
  profile: any
  editId?: string | null
}

const DEFAULT_EDITOR_HTML = '<p>Start writing your story...</p>'

function extractYoutubeId(url: string): string | null {
  const value = url.trim()
  if (!value) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function extractContentMeta(html: string) {
  if (typeof window === 'undefined') return { plain: '', images: [] }
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const plain = (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
  const images = Array.from(new Set(Array.from(doc.querySelectorAll('img'))
    .map((img) => img.getAttribute('src') || '')
    .map((src) => src.trim())
    .filter(Boolean)))
  return { plain, images }
}



function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function getTocFromContent(content: string) {
  const items: string[] = []
  const regex = /<h[2-3][^>]*>(.*?)<\/h[2-3]>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const text = stripHtml(match[1] || '')
    if (text) items.push(text)
    if (items.length >= 4) break
  }
  if (items.length === 0) {
    return ['Overview', 'Main Concepts', 'Implementation', 'Final Thoughts']
  }
  return items
}

export function BlogStudioTab({ profile, editId }: BlogStudioTabProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const latestContentRef = useRef(DEFAULT_EDITOR_HTML)
  const isEditing = Boolean(editId)
  const draftKey = `allpanga_blog_studio_draft_${profile.id}`

  const [title, setTitle] = useState('')
  const [field, setField] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [communities, setCommunities] = useState<any[]>([])
  const [excerpt, setExcerpt] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [contentHtml, setContentHtml] = useState(DEFAULT_EDITOR_HTML)
  const [submitting, setSubmitting] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [error, setError] = useState('')
  const [editorView, setEditorView] = useState<'compose' | 'preview'>('compose')
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const coverFileInputRef = useRef<HTMLInputElement>(null)
  const inlineImageInputRef = useRef<HTMLInputElement>(null)

  const [promptModal, setPromptModal] = useState<{
    open: boolean;
    title: string;
    label: string;
    value: string;
    placeholder: string;
    onConfirm: (val: string) => void;
  }>({
    open: false,
    title: '',
    label: '',
    value: '',
    placeholder: '',
    onConfirm: () => {}
  });

  const saveDraftToLocal = useCallback((manualHtml?: string) => {
    if (isEditing) return;
    const finalHtml = manualHtml || editorRef.current?.innerHTML || contentHtml;
    if (finalHtml === DEFAULT_EDITOR_HTML) return; // Don't save default placeholder as draft
    
    const payload = { 
      title, 
      field, 
      communityId, 
      excerpt, 
      coverImage, 
      tags, 
      contentHtml: finalHtml, 
      updatedAt: new Date().toISOString() 
    };
    localStorage.setItem(draftKey, JSON.stringify(payload));
  }, [isEditing, title, field, communityId, excerpt, coverImage, tags, draftKey, contentHtml]); 

  // 1. Auto-Save Logic (Every 5 seconds)
  useEffect(() => {
    if (isEditing) return;
    const timer = setInterval(() => {
      saveDraftToLocal();
    }, 5000);
    return () => clearInterval(timer);
  }, [saveDraftToLocal, isEditing]);

  // 2. Reliable Hydration logic
  const hydrateEditorHtml = useCallback(
    (rawHtml: string) => {
      const safeHtml = sanitizeBlogHtml(rawHtml || DEFAULT_EDITOR_HTML) || DEFAULT_EDITOR_HTML;
      latestContentRef.current = safeHtml;
      setContentHtml(safeHtml);
      
      // If the editor is already in the DOM, sync it immediately
      if (editorRef.current) {
        editorRef.current.innerHTML = safeHtml;
      }
      return safeHtml;
    },
    []
  );

  // 3. Reliable Hydration (Direct Sync & Placeholder Overwrite)
  useEffect(() => {
    const isDefaultOrEmpty = !editorRef.current?.innerHTML || 
                             editorRef.current?.innerHTML === "" || 
                             editorRef.current?.innerHTML === "<br>" || 
                             editorRef.current?.innerHTML === DEFAULT_EDITOR_HTML;
                             
    if (editorRef.current && isDefaultOrEmpty && contentHtml && contentHtml !== DEFAULT_EDITOR_HTML) {
       editorRef.current.innerHTML = contentHtml;
    }
  }, [contentHtml]); 

  useEffect(() => {
    const loadCommunities = async () => {
      const supabase = createClient()
      // Fetch both approved communities and communities owned by the user (even if pending)
      const { data } = await supabase
        .from('communities')
        .select('id, name, owner_id')
        .or(`moderation.eq.approved,owner_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
        .limit(200)
      setCommunities(data || [])
    }
    loadCommunities()
  }, [profile.id])

  const loadBlogForEdit = useCallback(async () => {
    if (!editId) return
    setLoadingExisting(true)
    setError('')
    try {
      const res = await fetch(`/api/blogs/${editId}`)
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.data) {
        const blog = json.data
        setTitle(blog.title || '')
        setField(blog.field || '')
        setCommunityId(blog.community_id || '')
        setExcerpt(blog.excerpt || '')
        setCoverImage(blog.cover_image || '')
        setTags(Array.isArray(blog.tags) ? blog.tags : [])
        hydrateEditorHtml(blog.content || DEFAULT_EDITOR_HTML)
      }
    } catch {
      setError('Unable to load blog')
    } finally {
      setLoadingExisting(false)
    }
  }, [editId, hydrateEditorHtml])

  useEffect(() => {
    if (editId) loadBlogForEdit()
  }, [editId, loadBlogForEdit])


  useEffect(() => {
    if (isEditing) return
    const raw = localStorage.getItem(draftKey)
    if (raw) {
      try {
        const draft = JSON.parse(raw)
        setTitle(draft.title || '')
        setField(draft.field || '')
        setCommunityId(draft.communityId || '')
        setExcerpt(draft.excerpt || '')
        setCoverImage(draft.coverImage || '')
        setTags(Array.isArray(draft.tags) ? draft.tags : [])
        hydrateEditorHtml(draft.contentHtml || DEFAULT_EDITOR_HTML)
        setDraftRestored(true)
      } catch {
        localStorage.removeItem(draftKey)
      }
    }
  }, [isEditing, draftKey, hydrateEditorHtml])

  const textLength = useMemo(() => {
    if (typeof window === 'undefined') return 0
    return extractContentMeta(contentHtml).plain.length
  }, [contentHtml])
  
  const previewHtml = useMemo(() => sanitizeBlogHtml(contentHtml), [contentHtml])
  const previewTocItems = useMemo(() => getTocFromContent(previewHtml), [previewHtml])
  const previewReadMinutes = useMemo(() => Math.max(1, Math.ceil(stripHtml(previewHtml).split(' ').filter(Boolean).length / 180)), [previewHtml])

  const inlineImageCount = useMemo(() => {
    if (typeof window === 'undefined') return 0
    const parser = new DOMParser()
    const doc = parser.parseFromString(contentHtml, 'text/html')
    return doc.querySelectorAll('img').length
  }, [contentHtml])

  // Restore editor content when switching back to compose view
  useEffect(() => {
    if (editorView === 'compose' && editorRef.current) {
      editorRef.current.innerHTML = contentHtml
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorView])

  const [activeStyles, setActiveStyles] = useState({ bold: false, italic: false, heading: false });

  const checkActiveStyles = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const formatBlock = document.queryCommandValue('formatBlock');
      const isHeading = formatBlock === 'h2' || formatBlock === 'h3' || formatBlock === 'header';

      setActiveStyles({
        bold: isBold,
        italic: isItalic,
        heading: isHeading
      });
    } catch {
      // Silently fail if command states are not available
    }
  }, []);

  // Listen for global selection changes to update toolbar highlighting
  useEffect(() => {
    document.addEventListener('selectionchange', checkActiveStyles);
    return () => document.removeEventListener('selectionchange', checkActiveStyles);
  }, [checkActiveStyles]);

  const runCommand = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);
      checkActiveStyles();
      if (editorRef.current) {
        saveDraftToLocal(editorRef.current.innerHTML);
      }
    },
    [saveDraftToLocal, checkActiveStyles]
  );

  const insertLink = () => {
    setPromptModal({
      open: true,
      title: 'Insert Hyperlink',
      label: 'Website URL',
      value: '',
      placeholder: 'https://example.com',
      onConfirm: (href) => {
        if (href) runCommand('createLink', href);
      }
    });
  }

  const insertYoutube = () => {
    setPromptModal({
      open: true,
      title: 'Embed YouTube Video',
      label: 'YouTube Video URL',
      value: '',
      placeholder: 'https://www.youtube.com/watch?v=...',
      onConfirm: (url) => {
        const id = extractYoutubeId(url || '')
        if (id) {
          const embed = `<div class="blog-embed-video"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe></div><p><br/></p>`
          runCommand('insertHTML', embed)
        } else if (url) {
          toast.error('Invalid YouTube URL');
        }
      }
    });
  }

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (inlineImageCount >= 5) {
      toast.error('Maximum 5 images allowed in the blog body.')
      return
    }

    try {
      const publicUrl = await uploadToCloudinary(file, 'blog_content')
      
      const imgHtml = `<img src="${publicUrl}" alt="Blog Image" style="max-width: 100%; border-radius: 12px; margin: 16px 0;" /><p><br/></p>`
      runCommand('insertHTML', imgHtml)
      toast.success('Image inserted')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = ''
    }
  }

  const addTag = () => {
    const val = tagInput.trim()
    if (val && !tags.includes(val)) {
      setTags([...tags, val])
      setTagInput('')
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingCover(true)
    setError('')
    try {
      const publicUrl = await uploadToCloudinary(file, 'blog_cover')
      setCoverImage(publicUrl)
      toast.success('Cover uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setIsUploadingCover(false)
    }
  }

  const submitBlog = async (isDraftMode = false) => {
    setSubmitting(true)
    setError('')
    try {
      const currentHtml = editorRef.current?.innerHTML || contentHtml;
      const { images: inlineImages } = extractContentMeta(currentHtml)
      const payload = { 
        title: title || 'Untitled Story', 
        field: field || 'General', 
        community_id: communityId || null, 
        excerpt, 
        content: currentHtml, 
        cover_image: coverImage, 
        tags, 
        images: inlineImages 
      }
      
      const res = await fetch(isEditing ? `/api/blogs/${editId}` : '/api/blogs', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        if (json.details) {
          const errors = Object.entries(json.details)
            .map(([field, info]: [string, any]) => `${field}: ${info._errors?.join(', ') || 'Invalid'}`)
            .join(' | ')
          throw new Error(`Validation Error: ${errors}`)
        }
        throw new Error(json.error || 'Failed to sync')
      }

      if (isDraftMode) {
        toast.success('Progress saved to cloud')
        if (!isEditing) {
          // If we just created a new draft, we should ideally redirect to the edit page 
          // but for now, we'll just keep them here.
          const json = await res.json().catch(() => ({}));
          if (json.data?.id) {
             window.location.assign(`/dashboard?tab=blog-studio&edit=${json.data.id}`);
          }
        }
      } else {
        toast.success('Story published for moderation!')
        if (!isEditing) localStorage.removeItem(draftKey)
        window.location.assign('/dashboard?tab=blogs')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Blog Studio</h1>
        <p className="text-text-secondary mt-1">Express your academic findings through a rich visual workspace.</p>
      </header>

      <div className="inline-flex items-center rounded-full border border-border bg-white p-1 shadow-sm">
        <button onClick={() => setEditorView('compose')} className={`px-4 py-2 rounded-full text-sm font-semibold ${editorView === 'compose' ? 'bg-primary text-white' : 'text-text-secondary'}`}>Compose</button>
        <button onClick={() => setEditorView('preview')} className={`px-4 py-2 rounded-full text-sm font-semibold ${editorView === 'preview' ? 'bg-primary text-white' : 'text-text-secondary'}`}>Preview</button>
      </div>

      {/* 2. Editor Workspace (Conditional Visibility keeps DOM alive) */}
      <div className={cn("grid grid-cols-1 gap-6 sm:gap-8", editorView !== 'compose' && "hidden")}>
        <section className="bg-white rounded-3xl md:rounded-[2.5rem] border border-border shadow-sm p-4 sm:p-10 space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Identity</label>
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-border bg-slate-50 text-base sm:text-lg font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all" 
                placeholder="Name your story..." 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Academic Field</label>
              <select value={field} onChange={e => setField(e.target.value)} className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-border bg-slate-50 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer">
                <option value="">Select Field</option>
                {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Target Community</label>
              <select value={communityId} onChange={e => setCommunityId(e.target.value)} className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-border bg-slate-50 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer">
                <option value="">Public Community</option>
                {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Visual Cover</label>
            <div className={cn("relative h-48 sm:h-64 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-border overflow-hidden bg-slate-50 flex flex-col items-center justify-center transition-all group hover:border-primary/50", coverImage && "border-solid border-primary/20 shadow-lg")}>
              {coverImage ? (
                <>
                  <NextImage src={coverImage} alt="Cover" fill className="object-cover" unoptimized />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 sm:gap-3">
                     <Button size="sm" className="rounded-xl sm:rounded-2xl" onClick={() => coverFileInputRef.current?.click()}>Update</Button>
                     <Button size="sm" variant="destructive" className="rounded-xl sm:rounded-2xl" onClick={() => setCoverImage('')}>Remove</Button>
                  </div>
                </>
              ) : (
                <button onClick={() => coverFileInputRef.current?.click()} className="flex flex-col items-center gap-3 text-slate-300 transition-transform active:scale-95">
                  {isUploadingCover ? <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" /> : <span className="material-symbols-outlined text-4xl sm:text-5xl">landscape</span>}
                  <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em]">Upload Cover</span>
                </button>
              )}
              <input type="file" ref={coverFileInputRef} onChange={handleCoverUpload} className="hidden" accept="image/*" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted px-1">Manuscript Editor</label>
            
            <div className="sticky top-16 sm:top-20 z-[40] flex items-center gap-2 p-2 rounded-2xl border border-border bg-white/95 backdrop-blur-xl shadow-xl shadow-black/5 overflow-x-auto scrollbar-hide">
              <button 
                type="button" 
                onClick={() => runCommand('bold')} 
                className={cn(
                  "shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center border rounded-xl font-bold transition-all active:scale-90",
                  activeStyles.bold ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white border-border hover:bg-primary/5 hover:text-primary"
                )}
              >
                B
              </button>
              <button 
                type="button" 
                onClick={() => runCommand('italic')} 
                className={cn(
                  "shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center border rounded-xl italic transition-all active:scale-90",
                  activeStyles.italic ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white border-border hover:bg-primary/5 hover:text-primary"
                )}
              >
                I
              </button>
              <button 
                type="button" 
                onClick={() => runCommand('formatBlock', activeStyles.heading ? '<p>' : '<h2>')} 
                className={cn(
                  "shrink-0 px-3 sm:px-4 h-9 sm:h-10 flex items-center justify-center border rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all active:scale-90",
                  activeStyles.heading ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white border-border hover:bg-primary/5 hover:text-primary"
                )}
              >
                Heading
              </button>
              
              <div className="w-px h-6 bg-border mx-1 shrink-0" />
              
              <button type="button" onClick={insertLink} className="shrink-0 h-9 sm:h-10 px-3 sm:px-4 flex items-center justify-center bg-white border border-border rounded-xl gap-2 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">link</span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Link</span>
              </button>
              
              <button type="button" onClick={() => inlineImageInputRef.current?.click()} className="shrink-0 h-9 sm:h-10 px-3 sm:px-4 flex items-center justify-center bg-white border border-border rounded-xl gap-2 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">add_photo_alternate</span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Media</span>
              </button>
              
              <button type="button" onClick={insertYoutube} className="shrink-0 h-9 sm:h-10 px-3 sm:px-4 flex items-center justify-center bg-white border border-border rounded-xl gap-2 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">play_circle</span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">YouTube</span>
              </button>
              
              <input type="file" ref={inlineImageInputRef} onChange={handleInlineImageUpload} className="hidden" accept="image/*" />
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const html = e.currentTarget.innerHTML;
                setContentHtml(html);
                saveDraftToLocal(html);
                checkActiveStyles();
              }}
              onKeyUp={checkActiveStyles}
              onMouseUp={checkActiveStyles}
              onFocus={checkActiveStyles}
              className="min-h-[500px] rounded-2xl sm:rounded-[3rem] border border-border bg-white p-4 sm:p-10 md:p-16 outline-none text-base sm:text-lg leading-relaxed shadow-sm font-serif text-slate-700 focus:bg-slate-50/10 transition-colors"
            />
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 p-4 rounded-2xl font-bold">{error}</p>}

          <div className="flex gap-3 sm:gap-4 pt-4 sm:pt-6">
            <Button type="button" variant="outline" size="lg" className="flex-1 rounded-xl sm:rounded-2xl h-12 sm:h-14 font-black uppercase tracking-widest text-[10px] sm:text-xs" onClick={() => submitBlog(true)}>Draft</Button>
            <Button type="button" size="lg" className="flex-1 rounded-xl sm:rounded-2xl h-12 sm:h-14 font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-xl shadow-primary/20" loading={submitting} onClick={() => submitBlog(false)}>Publish</Button>
          </div>
        </section>
      </div>

      {/* 3. Preview Layer (Always Ready) */}
      <div className={cn("space-y-6 sm:space-y-8 animate-in fade-in duration-500", editorView !== 'preview' && "hidden")}>
        <div className="bg-white rounded-2xl sm:rounded-[3rem] border border-border shadow-2xl overflow-hidden p-4 sm:p-8 md:p-16 prose max-w-none">
           <div className="max-w-4xl mx-auto">
             <h1 className="text-2xl sm:text-5xl font-black text-text-primary mb-6 sm:mb-8 tracking-tighter leading-tight">{title || 'Your Untiled Story'}</h1>
             {coverImage && (
               <div className="relative w-full h-48 sm:h-[450px] rounded-xl sm:rounded-[2.5rem] overflow-hidden mb-8 sm:mb-12 shadow-2xl">
                 <NextImage src={coverImage} alt="Cover" fill className="object-cover" unoptimized />
               </div>
             )}
             <div className="blog-content-preview text-base sm:text-lg leading-[1.8] text-text-secondary" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      </div>

      <Modal 
        open={promptModal.open} 
        onClose={() => setPromptModal(prev => ({ ...prev, open: false }))} 
        title={promptModal.title}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{promptModal.label}</label>
            <Input 
              value={promptModal.value}
              onChange={(e) => setPromptModal(prev => ({ ...prev, value: e.target.value }))}
              placeholder={promptModal.placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  promptModal.onConfirm(promptModal.value);
                  setPromptModal(prev => ({ ...prev, open: false }));
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPromptModal(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button onClick={() => {
              promptModal.onConfirm(promptModal.value);
              setPromptModal(prev => ({ ...prev, open: false }));
            }}>Confirm</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
