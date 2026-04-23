'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { FIELDS, CAMPUSES } from '@/lib/constants'

import { uploadToCloudinary, getOptimizedImageUrl } from '@/lib/cloudinary'

interface ProfileSettingsTabProps {
 profile: any
}

export function ProfileSettingsTab({ profile }: ProfileSettingsTabProps) {
 const [fullName, setFullName] = useState(profile.full_name || '')
 const [username, setUsername] = useState(profile.username || '')
 const [email] = useState(profile.email || '')
 const [phone, setPhone] = useState(profile.phone || '')
 const [bio, setBio] = useState(profile.bio || '')
 const [university, setUniversity] = useState(profile.university || '')
 const [fieldOfStudy, setFieldOfStudy] = useState(profile.field_of_study || '')
 const [city, setCity] = useState(profile.city || '')
 const [loading, setLoading] = useState(false)
 const [isDirty, setIsDirty] = useState(false)
 const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
 const [lastSaved, setLastSaved] = useState<string | null>(null)
 const [successMsg, setSuccessMsg] = useState('')
 const [errorMsg, setErrorMsg] = useState('')
 const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '')
 const [avatarLoading, setAvatarLoading] = useState(false)
 const [newPassword, setNewPassword] = useState('')
 const [confirmPassword, setConfirmPassword] = useState('')
 const [passwordLoading, setPasswordLoading] = useState(false)
 const avatarInputRef = useRef<HTMLInputElement | null>(null)

 useEffect(() => {
 setAvatarUrl(profile.avatar_url || '')
 }, [profile.avatar_url])

 useEffect(() => {
 const original = profile
 const changed =
 fullName !== (original.full_name || '') ||
 username !== (original.username || '') ||
 phone !== (original.phone || '') ||
 bio !== (original.bio || '') ||
 university !== (original.university || '') ||
 fieldOfStudy !== (original.field_of_study || '') ||
 city !== (original.city || '')
 setIsDirty(changed)
 }, [fullName, username, phone, bio, university, fieldOfStudy, city, profile])

 // Username availability check with debounce
 useEffect(() => {
 if (username.length < 3) {
 setUsernameStatus('idle')
 return
 }
 if (username === profile.username) {
 setUsernameStatus('available')
 return
 }
 setUsernameStatus('checking')
 const timer = setTimeout(async () => {
 const supabase = createClient()
 const { data } = await supabase
 .from('profiles')
 .select('id')
 .eq('username', username)
 .neq('id', profile.id)
 .limit(1)
 setUsernameStatus(data && data.length > 0 ? 'taken' : 'available')
 }, 500)
 return () => clearTimeout(timer)
 }, [username, profile.id, profile.username])

 const handleSave = async () => {
 if (usernameStatus === 'taken') return
 setLoading(true)
 setErrorMsg('')

 try {
 const supabase = createClient()
 const { error } = await supabase
 .from('profiles')
 .update({
 full_name: fullName,
 username,
 phone: phone || null,
 bio: bio || null,
 university: university || null,
 field_of_study: fieldOfStudy || null,
 city: city || null,
 })
 .eq('id', profile.id)
 if (error) throw error

 setIsDirty(false)
 setLastSaved(new Date().toLocaleTimeString())
 setSuccessMsg('Profile updated successfully!')
 setTimeout(() => setSuccessMsg(''), 3000)
 } catch (error) {
 console.error('Failed to save profile settings:', error)
 setErrorMsg('Failed to save profile changes. Please try again.')
 setTimeout(() => setErrorMsg(''), 4000)
 } finally {
 setLoading(false)
 }
 }

 const handleDiscard = () => {
 setFullName(profile.full_name || '')
 setUsername(profile.username || '')
 setPhone(profile.phone || '')
 setBio(profile.bio || '')
 setUniversity(profile.university || '')
 setFieldOfStudy(profile.field_of_study || '')
 setCity(profile.city || '')
 setIsDirty(false)
 }

 const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file) return

 setAvatarLoading(true)
 setErrorMsg('')
 const supabase = createClient()

 try {
 // Use Cloudinary for professional avatar handling (with better compression)
 const nextAvatarUrl = await uploadToCloudinary(file, 'avatars')

 const { error: updateError } = await supabase
 .from('profiles')
 .update({ avatar_url: nextAvatarUrl })
 .eq('id', profile.id)

 if (updateError) throw updateError

 setAvatarUrl(nextAvatarUrl)
 setSuccessMsg('Profile photo updated!')
 setTimeout(() => setSuccessMsg(''), 3000)
 } catch (error: any) {
 console.error('Avatar upload failed:', error)
 setErrorMsg(error.message || 'Failed to update profile photo. Please try again.')
 setTimeout(() => setErrorMsg(''), 4000)
 } finally {
 setAvatarLoading(false)
 e.target.value = ''
 }
 }

 const handleUpdatePassword = async () => {
 if (!newPassword || newPassword.length < 6) {
 setErrorMsg('Password must be at least 6 characters long.')
 return
 }
 if (newPassword !== confirmPassword) {
 setErrorMsg('Passwords do not match.')
 return
 }

 setPasswordLoading(true)
 setErrorMsg('')
 const supabase = createClient()

 try {
 const { error } = await supabase.auth.updateUser({
 password: newPassword
 })

 if (error) throw error

 setSuccessMsg('Password updated successfully!')
 setNewPassword('')
 setConfirmPassword('')
 setTimeout(() => setSuccessMsg(''), 3000)
 } catch (error: any) {
 console.error('Password update failed:', error)
 setErrorMsg(error.message || 'Failed to update password. Please try again.')
 } finally {
 setPasswordLoading(false)
 }
 }

 const openAvatarPicker = () => {
 if (avatarInputRef.current) {
 avatarInputRef.current.value = ''
 avatarInputRef.current.click()
 }
 }

 return (
 <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
 <header>
 <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">Profile Settings</h1>
 <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">Manage your personal and academic information.</p>
 </header>

 <div className="flex flex-col lg:flex-row gap-8 items-start pb-20 lg:pb-0">
 {/* Form */}
 <div className="flex-1 space-y-6">
 {/* Avatar */}
 <Card className="overflow-hidden p-0 border-slate-100/50 bg-white rounded-3xl">
 <div className="h-16 sm:h-20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/[0.02] border-b border-slate-50" />
 <div className="px-5 sm:px-6 pb-6 -mt-8 flex flex-col items-center sm:items-start">
 <div className="relative group">
 <Avatar src={getOptimizedImageUrl(avatarUrl, 150, 150)} fallback={fullName} size="xl" className="border-4 border-white shadow-md" />
 <label className="absolute inset-0 flex items-center justify-center bg-black/0 active:bg-black/30 lg:group-hover:bg-black/30 rounded-full cursor-pointer transition-colors">
 <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 text-xl">
 {avatarLoading ? 'hourglass_empty' : 'photo_camera'}
 </span>
 <input
 ref={avatarInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handleAvatarUpload}
 />
 </label>
 </div>
 <button
 type="button"
 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-3 sm:mt-2 hover:underline active:scale-95 transition-all"
 onClick={openAvatarPicker}
 disabled={avatarLoading}
 >
 Change Photo
 </button>
 </div>
 </Card>

 {/* Basic Information */}
 <Card className="p-5 sm:p-8 rounded-[32px] border-none bg-white shadow-[0_20px_50px_rgba(0,0,0,0.02)]">
 <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-6">Basic Intelligence</h2>
 <div className="space-y-5">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
 <div className="space-y-1.5">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Name</label>
 <input
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Username</label>
 <div className="relative">
 <input
 value={username}
 onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
 className={cn(
 'w-full px-4 py-3 sm:py-2.5 rounded-xl border bg-slate-50/50 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all',
 usernameStatus === 'taken' ? 'border-rose-500 ring-rose-500/10' : 'border-slate-100 focus:border-emerald-500'
 )}
 />
 <span className="absolute right-4 top-1/2 -translate-y-1/2">
 {usernameStatus === 'checking' && (
 <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
 )}
 {usernameStatus === 'available' && (
 <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
 )}
 {usernameStatus === 'taken' && (
 <span className="material-symbols-outlined text-rose-500 text-[18px]">cancel</span>
 )}
 </span>
 </div>
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
 <div className="space-y-1.5">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email</label>
 <input
 value={email}
 disabled
 className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-100/50 text-sm font-medium text-slate-400 cursor-not-allowed"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Phone Number</label>
 <input
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="w-full px-4 py-3 sm:py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
 placeholder="+92 300 1234567"
 />
 </div>
 </div>
 <div className="space-y-1.5">
 <div className="flex justify-between px-1">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bio</label>
 <span className="text-[10px] font-black uppercase text-slate-400 opacity-60 tracking-widest">{bio.length}/300</span>
 </div>
 <textarea
 value={bio}
 onChange={(e) => setBio(e.target.value.slice(0, 300))}
 className="w-full px-4 py-4 rounded-xl border border-slate-100 bg-slate-50/50 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none"
 rows={3}
 placeholder="Tell us about yourself..."
 />
 </div>
 </div>
 </Card>

 {/* Academic Information */}
 <Card padding="lg">
 <h2 className="text-lg font-bold text-text-primary mb-5">Academic Information</h2>
 <div className="space-y-4">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Institute Name</label>
 <input
 value={university}
 onChange={(e) => setUniversity(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
 placeholder="e.g. National Textile University"
 />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Field of Study</label>
 <select
 value={fieldOfStudy}
 onChange={(e) => setFieldOfStudy(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
 >
 <option value="">Select field</option>
 {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">City</label>
 <input
 value={city}
 onChange={(e) => setCity(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
 placeholder="e.g. Faisalabad"
 />
 </div>
 </div>
 </div>
 </Card>

 {/* Account Security - Professional Upgrade */}
 <Card padding="lg" className="border-slate-100 shadow-sm relative overflow-hidden">
 {/* Subtle background decoration */}
 <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
 
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
 <span className="material-symbols-outlined text-[20px]">security</span>
 </div>
 <div>
 <h2 className="text-lg font-bold text-text-primary leading-none">Account Security</h2>
 <p className="text-xs text-text-muted mt-1">Enhance your account access</p>
 </div>
 </div>
 
 <div className="space-y-5">
 <div className="p-4 bg-primary-light/30 rounded-2xl border border-primary/10">
 <div className="flex gap-3">
 <span className="material-symbols-outlined text-primary text-sm mt-0.5">info</span>
 <p className="text-xs text-primary leading-relaxed">
 <span className="font-bold">Hybrid Access:</span> Setting a password allows you to log in 
 from other devices using your email, even if you normally &quot;Continue with Google&quot;.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">New Security Password</label>
 <input
 type="password"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
 placeholder="••••••••"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Confirm New Password</label>
 <input
 type="password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
 placeholder="••••••••"
 />
 </div>
 </div>

 <div className="flex justify-end pt-2">
 <Button 
 onClick={handleUpdatePassword} 
 loading={passwordLoading}
 disabled={!newPassword || newPassword !== confirmPassword || newPassword.length < 6}
 className="rounded-xl px-6 shadow-md shadow-primary/10"
 >
 Update Security Password
 </Button>
 </div>
 </div>
 </Card>

 {/* Footer - Desktop Only */}
 <div className="hidden sm:flex items-center justify-between pt-4">
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
 {lastSaved ? `Telemetry synced at ${lastSaved}` : 'Waiting for sync...'}
 </p>
 <div className="flex gap-3">
 <Button variant="outline" onClick={handleDiscard} disabled={!isDirty} className="rounded-xl font-black uppercase text-[10px] tracking-widest border-slate-200">
 Discard Changes
 </Button>
 <Button onClick={handleSave} loading={loading} disabled={!isDirty || usernameStatus === 'taken'} className="rounded-xl font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700">
 Save Changes
 </Button>
 </div>
 </div>
 </div>

 {/* Mobile Sticky Action Bar */}
 {isDirty && (
 <div className="fixed bottom-6 left-4 right-4 sm:hidden z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
 <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4">
 <button 
 onClick={handleDiscard}
 className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400"
 >
 Discard
 </button>
 <button 
 onClick={handleSave}
 disabled={loading || usernameStatus === 'taken'}
 className="flex-[2] py-4 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
 >
 {loading ? (
 <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
 ) : (
 <>
 <span className="material-symbols-outlined text-[16px]">sync_saved_locally</span>
 Save Changes
 </>
 )}
 </button>
 </div>
 </div>
 )}

 {/* Live Preview Panel */}
 <div className="w-72 hidden lg:block">
 <div className="sticky top-8">
 <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-4">
 Profile Preview
 </h3>
 <Card padding="none" className="overflow-hidden">
 <div className="h-20 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border-b border-border" />
 <div className="px-5 pb-5 -mt-8 text-center">
 <Avatar src={getOptimizedImageUrl(avatarUrl, 150, 150)} fallback={fullName} size="xl" className="border-4 border-white mx-auto" />
 <h4 className="font-bold text-text-primary mt-2">{fullName || 'Your Name'}</h4>
 <p className="text-xs text-text-muted">@{username || 'username'}</p>
 {bio && (
 <p className="text-xs text-text-secondary mt-2 line-clamp-2">{bio}</p>
 )}
 <div className="mt-3 flex flex-wrap justify-center gap-1.5">
 {university && (
 <span className="text-[10px] px-2 py-0.5 bg-primary-light text-primary rounded-full">
 {university}
 </span>
 )}
 {fieldOfStudy && (
 <span className="text-[10px] px-2 py-0.5 bg-secondary-light text-secondary rounded-full">
 {fieldOfStudy}
 </span>
 )}
 {city && (
 <span className="text-[10px] px-2 py-0.5 bg-surface text-text-muted rounded-full border border-border">
 📍 {city}
 </span>
 )}
 </div>
 </div>
 </Card>
 </div>
 </div>
 </div>

 {/* Success Toast */}
 {successMsg && (
 <div className="fixed bottom-24 lg:bottom-10 right-4 lg:right-10 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 z-[100]">
 <span className="material-symbols-outlined text-[20px] font-bold">check_circle</span>
 <span className="text-sm font-black uppercase tracking-wider">{successMsg}</span>
 </div>
 )}
 {errorMsg && (
 <div className="fixed bottom-24 lg:bottom-10 right-4 lg:right-10 bg-rose-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 z-[100]">
 <span className="material-symbols-outlined text-[20px] font-bold">error</span>
 <span className="text-sm font-black uppercase tracking-wider">{errorMsg}</span>
 </div>
 )}
 </div>
 )
}
