'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FIELDS } from '@/lib/constants'
import Image from 'next/image'
import { uploadToCloudinary } from '@/lib/cloudinary'

export default function CreateCommunityPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [field, setField] = useState('')
  const [type, setType] = useState<'field' | 'project'>('project')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [error, setError] = useState('')

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File, type: 'avatar' | 'banner') => {
    try {
      if (type === 'avatar') setUploadingAvatar(true)
      else setUploadingBanner(true)
      setError('')

      // Use Professional Cloudinary Upload
      const url = await uploadToCloudinary(file, 'communities')
      
      if (type === 'avatar') setAvatarUrl(url)
      else setBannerUrl(url)
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      if (type === 'avatar') setUploadingAvatar(false)
      else setUploadingBanner(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          field,
          type,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create community')
      }

      router.push(`/communities`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-black text-text-primary tracking-tight mb-4">Start a Community</h1>
        <p className="text-text-secondary text-lg">Connect with students and collaborate on projects.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-border p-10 shadow-sm space-y-8">
        <div className="space-y-2">
          <label className="text-sm font-black uppercase tracking-widest text-text-muted">Community Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl border border-border bg-surface focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-medium"
            placeholder="e.g. NTU Robotics Club"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-black uppercase tracking-widest text-text-muted">Field of Study *</label>
            <select
              required
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-border bg-surface focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-medium"
            >
              <option value="">Select field</option>
              {FIELDS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-black uppercase tracking-widest text-text-muted">Type *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('project')}
                className={`flex-1 py-4 rounded-2xl border font-black uppercase tracking-widest text-xs transition-all ${
                  type === 'project' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface border-border text-text-secondary hover:border-primary/50'
                }`}
              >
                Project
              </button>
              <button
                type="button"
                onClick={() => setType('field')}
                className={`flex-1 py-4 rounded-2xl border font-black uppercase tracking-widest text-xs transition-all ${
                  type === 'field' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-surface border-border text-text-secondary hover:border-primary/50'
                }`}
              >
                Interest
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-black uppercase tracking-widest text-text-muted">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl border border-border bg-surface focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-medium h-32 resize-none"
            placeholder="Tell students what this community is about..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-black uppercase tracking-widest text-text-muted">Avatar Icon</label>
            <div className="relative group rounded-2xl border-2 border-dashed border-border bg-surface p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0], 'avatar') }} />
              {avatarUrl ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-border shadow-sm mb-3 group-hover:opacity-50 transition-opacity">
                  <Image src={avatarUrl} alt="Avatar" className="object-cover" fill unoptimized />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">{uploadingAvatar ? 'hourglass_empty' : 'add_photo_alternate'}</span>
                </div>
              )}
              <span className="text-xs font-bold text-text-primary">{uploadingAvatar ? 'Uploading...' : (avatarUrl ? 'Change Avatar' : 'Upload Avatar Picture')}</span>
              <span className="text-[10px] text-text-muted mt-1">(optional)</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black uppercase tracking-widest text-text-muted">Cover Banner</label>
            <div className="relative group rounded-2xl border-2 border-dashed border-border bg-surface p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
              <input ref={bannerInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0], 'banner') }} />
              {bannerUrl ? (
                <div className="relative w-full h-20 rounded-2xl overflow-hidden border border-border shadow-sm mb-3 group-hover:opacity-50 transition-opacity">
                  <Image src={bannerUrl} alt="Banner" className="object-cover" fill unoptimized />
                </div>
              ) : (
                <div className="w-full h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-[1.02] transition-transform">
                  <span className="material-symbols-outlined text-2xl">{uploadingBanner ? 'hourglass_empty' : 'wallpaper'}</span>
                </div>
              )}
              <span className="text-xs font-bold text-text-primary">{uploadingBanner ? 'Uploading...' : (bannerUrl ? 'Change Banner' : 'Upload Cover Banner')}</span>
              <span className="text-[10px] text-text-muted mt-1">(optional)</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive-light text-destructive text-sm font-bold border border-destructive/20 animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full py-8 rounded-full text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20">
          Create Community
        </Button>
      </form>
    </div>
  )
}
