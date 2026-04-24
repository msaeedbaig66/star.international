'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/components/ui/avatar'
import { FIELDS } from '@/lib/constants'
import { toast } from 'sonner'
import { isSoftDeleteRecoverable, parseSoftDeleteNote } from '@/lib/content-soft-delete'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { ROUTES } from '@/lib/routes'
import Link from 'next/link'
import { HydratedOnly } from '@/components/shared/safe-time'

interface MyCommunitiesTabProps {
 profile: any
}

function isFeatureActive(featuredUntil?: string | null) {
 if (!featuredUntil) return false
 const time = Date.parse(featuredUntil)
 return Number.isFinite(time) && time > Date.now()
}

export function MyCommunitiesTab({ profile }: MyCommunitiesTabProps) {
 const [created, setCreated] = useState<any[]>([])
 const [joined, setJoined] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [showModal, setShowModal] = useState(false)
 const [expandedRejections, setExpandedRejections] = useState<Set<string>>(new Set())
 const [stats, setStats] = useState({ created: 0, joined: 0, totalMembers: 0, totalPosts: 0 })
 const [searchJoined, setSearchJoined] = useState('')
 const [communitySlotLimit, setCommunitySlotLimit] = useState<number>(Number(profile?.community_slot_limit || 3))
 const [pendingSlotRequest, setPendingSlotRequest] = useState<any | null>(null)
 const [showSlotRequestModal, setShowSlotRequestModal] = useState(false)
 const [requestedSlotLimit, setRequestedSlotLimit] = useState<number>(Number(profile?.community_slot_limit || 3) + 1)
 const [slotRequestReason, setSlotRequestReason] = useState('')
 const [slotRequestLoading, setSlotRequestLoading] = useState(false)
 const [pendingFeatureByEntity, setPendingFeatureByEntity] = useState<Record<string, any>>({})
 const [showFeatureModal, setShowFeatureModal] = useState(false)
 const [featureTarget, setFeatureTarget] = useState<any | null>(null)
 const [requestedFeatureDays, setRequestedFeatureDays] = useState(7)
 const [featureReason, setFeatureReason] = useState('')
 const [featureSubmitting, setFeatureSubmitting] = useState(false)

 // Form state
 const [formName, setFormName] = useState('')
 const [formField, setFormField] = useState('')
 const [formType, setFormType] = useState<'field' | 'project'>('field')
 const [formDesc, setFormDesc] = useState('')
 const [formRules, setFormRules] = useState('')
 const [submitting, setSubmitting] = useState(false)

 // Edit Community State
 const [editingCommunity, setEditingCommunity] = useState<any | null>(null)
 const [editForm, setEditForm] = useState({ name: '', field: '', type: 'field' as 'field'|'project', desc: '', rules: '', avatar_url: '', banner_url: '' })
 const [editSubmitting, setEditSubmitting] = useState(false)

 const handleEditOpen = (community: any) => {
 setEditingCommunity(community)
 setEditForm({
 name: community.name || '',
 field: community.field || '',
 type: community.type || 'field',
 desc: community.description || '',
 rules: community.rules || '',
 avatar_url: community.avatar_url || '',
 banner_url: community.banner_url || '',
 })
 }

 const avatarInputRef = useRef<HTMLInputElement>(null)
 const bannerInputRef = useRef<HTMLInputElement>(null)
 const [uploadingAvatar, setUploadingAvatar] = useState(false)
 const [uploadingBanner, setUploadingBanner] = useState(false)

 const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file) return
 setUploadingAvatar(true)
 try {
 const url = await uploadToCloudinary(file, 'communities')
 setEditForm(prev => ({ ...prev, avatar_url: url }))
 toast.success('Avatar uploaded successfully!')
 } catch (err: any) {
 toast.error(err.message || 'Failed to upload avatar')
 } finally {
 setUploadingAvatar(false)
 if (avatarInputRef.current) avatarInputRef.current.value = ''
 }
 }

 const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file) return
 setUploadingBanner(true)
 try {
 const url = await uploadToCloudinary(file, 'communities')
 setEditForm(prev => ({ ...prev, banner_url: url }))
 toast.success('Banner uploaded successfully!')
 } catch (err: any) {
 toast.error(err.message || 'Failed to upload banner')
 } finally {
 setUploadingBanner(false)
 if (bannerInputRef.current) bannerInputRef.current.value = ''
 }
 }

 const handleEditSubmit = async (e: React.MouseEvent) => {
 e.preventDefault()
 if (!editingCommunity) return
 setEditSubmitting(true)
 try {
 const res = await fetch(`/api/communities/${editingCommunity.id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name: editForm.name,
 field: editForm.field,
 type: editForm.type,
 description: editForm.desc,
 rules: editForm.rules,
 avatar_url: editForm.avatar_url,
 banner_url: editForm.banner_url,
 })
 })
 if (!res.ok) throw new Error('Failed to update')
 toast.success('Community updated successfully!')
 setEditingCommunity(null)
 await loadData()
 } catch {
 toast.error('Could not update community')
 } finally {
 setEditSubmitting(false)
 }
 }

 const loadData = useCallback(async () => {
 const supabase = createClient()
 setLoading(true)

 try {
 const [createdRes, joinedRes, profileRes, slotReqData, featureReqResponse] = await Promise.all([
 supabase
 .from('communities')
 .select('*')
 .eq('owner_id', profile.id)
 .order('created_at', { ascending: false }),
 supabase
 .from('community_members')
 .select('*, community:communities(*)')
 .eq('user_id', profile.id)
 .order('joined_at', { ascending: false }),
 supabase
 .from('profiles')
 .select('*')
 .eq('id', profile.id)
 .single(),
 fetch('/api/slot-requests?type=community')
 .then((res) => (res.ok ? res.json() : null))
 .then((json) => (Array.isArray(json?.data) ? json.data[0] || null : null))
 .catch(() => null),
 fetch('/api/feature-requests?entity_type=community&status=pending')
 .then((res) => (res.ok ? res.json() : null))
 .catch(() => null),
 ])

 if (createdRes.error) throw createdRes.error
 if (joinedRes.error) throw joinedRes.error
 if (profileRes.error) throw profileRes.error

 const createdData = createdRes.data || []
 const activeCreatedData = createdData.filter((community: any) => !parseSoftDeleteNote(community?.rejection_note))
 const joinedData = (joinedRes.data || []).filter(
 (m: any) => m.community?.owner_id !== profile.id
 )

 setCreated(createdData)
 setJoined(joinedData)
 setCommunitySlotLimit(Number((profileRes.data as any)?.community_slot_limit || 3))
 setPendingSlotRequest(slotReqData || null)
 const nextPendingFeatureByEntity: Record<string, any> = {}
 for (const row of featureReqResponse?.data || []) {
 if (row?.entity_id) nextPendingFeatureByEntity[row.entity_id] = row
 }
 setPendingFeatureByEntity(nextPendingFeatureByEntity)

 const totalMembers = createdData.reduce((sum: number, c: any) => sum + (c.member_count || 0), 0)
 const totalPosts = createdData.reduce((sum: number, c: any) => sum + (c.post_count || 0), 0)

 setStats({
 created: activeCreatedData.length,
 joined: joinedData.length,
 totalMembers,
 totalPosts,
 })
 } catch (error) {
 console.error('Failed to load communities tab data:', error)
 setCreated([])
 setJoined([])
 setPendingSlotRequest(null)
 setPendingFeatureByEntity({})
 setStats({ created: 0, joined: 0, totalMembers: 0, totalPosts: 0 })
 toast.error('Unable to load communities right now.')
 } finally {
 setLoading(false)
 }
 }, [profile.id])

 useEffect(() => {
 loadData()
 }, [loadData])

 const handleCreate = async () => {
 if (!formName || !formField || !formDesc) return
 const activeCreated = created.filter((community: any) => !parseSoftDeleteNote(community?.rejection_note))
 if (activeCreated.length >= communitySlotLimit) {
 toast.error(`You reached your ${communitySlotLimit} community slots. Request more slots.`)
 return
 }
 setSubmitting(true)

 try {
 const response = await fetch('/api/communities', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name: formName,
 field: formField,
 type: formType,
 description: formDesc,
 rules: formRules || null,
 }),
 })
 const result = await response.json().catch(() => ({}))

 if (!response.ok) {
 throw new Error(result?.error || 'Failed to create community')
 }

 setShowModal(false)
 setFormName('')
 setFormField('')
 setFormType('field')
 setFormDesc('')
 setFormRules('')
 toast.success('Community submitted for review')
 await loadData()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to create community')
 } finally {
 setSubmitting(false)
 }
 }

 const handleLeave = async (communityId: string) => {
 try {
 const supabase = createClient()
 const { error } = await supabase
 .from('community_members')
 .delete()
 .eq('community_id', communityId)
 .eq('user_id', profile.id)
 if (error) throw error
 toast.success('You left the community.')
 await loadData()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to leave community')
 }
 }

 const handleDeleteCommunity = async (communityId: string, communityName: string) => {
 const confirmed = window.confirm(`Delete "${communityName}" now? You can recover it within 2 days.`)
 if (!confirmed) return
 try {
 const response = await fetch(`/api/communities/${communityId}`, { method: 'DELETE' })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) throw new Error(result?.error || 'Failed to delete community')
 toast.success('Community deleted. You can recover it within 2 days.')
 await loadData()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to delete community')
 }
 }

 const handleRecoverCommunity = async (communityId: string) => {
 try {
 const response = await fetch(`/api/communities/${communityId}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'recover' }),
 })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) throw new Error(result?.error || 'Failed to recover community')
 toast.success('Community recovered successfully')
 await loadData()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to recover community')
 }
 }

 const handleRequestMoreCommunitySlots = async () => {
 const requestedLimit = Number(requestedSlotLimit || 0)
 if (!Number.isFinite(requestedLimit) || requestedLimit <= communitySlotLimit) {
 toast.error(`Requested slots must be greater than your current limit (${communitySlotLimit}).`)
 return
 }
 if (slotRequestReason.trim().length < 10) {
 toast.error('Please add a short reason (at least 10 characters).')
 return
 }

 try {
 setSlotRequestLoading(true)
 const response = await fetch('/api/slot-requests', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 request_type: 'community',
 requested_limit: requestedLimit,
 reason: slotRequestReason.trim(),
 }),
 })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) throw new Error(result?.error || 'Failed to submit request')

 toast.success('Community slot request sent to admin.')
 setShowSlotRequestModal(false)
 setSlotRequestReason('')
 await loadData()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to submit slot request')
 } finally {
 setSlotRequestLoading(false)
 }
 }

 const openFeatureModal = (community: any) => {
 setFeatureTarget(community)
 setRequestedFeatureDays(7)
 setFeatureReason('')
 setShowFeatureModal(true)
 }

 const submitFeatureRequest = async () => {
 if (!featureTarget?.id) return
 if (!Number.isInteger(requestedFeatureDays) || requestedFeatureDays < 1 || requestedFeatureDays > 60) {
 toast.error('Feature days must be between 1 and 60.')
 return
 }
 if (featureReason.trim().length < 10) {
 toast.error('Please add a reason with at least 10 characters.')
 return
 }

 try {
 setFeatureSubmitting(true)
 const response = await fetch('/api/feature-requests', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 entity_type: 'community',
 entity_id: featureTarget.id,
 requested_days: requestedFeatureDays,
 reason: featureReason.trim(),
 }),
 })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) throw new Error(result?.error || 'Failed to send feature request')

 toast.success('Feature request sent to admin.')
 setShowFeatureModal(false)
 await loadData()
 } catch (error: any) {
 toast.error(error?.message || 'Unable to send feature request')
 } finally {
 setFeatureSubmitting(false)
 }
 }

 const getStatusBadge = (community: any) => {
 const isDeleted = !!parseSoftDeleteNote(community?.rejection_note)
 if (isDeleted) return <Badge variant="destructive">Deleted</Badge>
 const mod = community?.moderation
 if (mod === 'approved') return <Badge variant="primary">Active</Badge>
 if (mod === 'pending') return <Badge variant="warning">Pending</Badge>
 if (mod === 'rejected') return <Badge variant="destructive">Rejected</Badge>
 return null
 }

 const filteredJoined = joined.filter((m) =>
 !searchJoined || m.community?.name?.toLowerCase().includes(searchJoined.toLowerCase())
 )
 const activeCreatedCount = created.filter((community: any) => !parseSoftDeleteNote(community?.rejection_note)).length
 const reachedCommunityLimit = activeCreatedCount >= communitySlotLimit

 const CommunityCard = ({ community, isOwner = false, membership }: any) => {
 const isDeleted = !!parseSoftDeleteNote(community?.rejection_note)
 const meta = parseSoftDeleteNote(community.rejection_note)
 const canRecover = isSoftDeleteRecoverable(meta)

 return (
 <Card padding="none" className="group flex flex-col h-full bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 rounded-3xl overflow-hidden relative">
 <Link href={ROUTES.communities.detail(community.id)} className="absolute inset-0 z-10" />
 
 {/* Header with Banner/Avatar Overlay */}
 <div className="h-16 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 relative">
 <div className="absolute -bottom-6 left-4 z-20">
 <Avatar
 src={community.avatar_url}
 fallback={community.name}
 size="lg"
 className="ring-4 ring-white shadow-md w-12 h-12 md:w-16 md:h-16"
 />
 </div>
 <div className="absolute top-2 right-2 flex gap-1 z-20 scale-75 origin-top-right">
 {getStatusBadge(community)}
 {!!community.is_featured && isFeatureActive(community.featured_until) && (
 <Badge variant="primary" className="bg-amber-500 text-white border-none shadow-sm">Featured</Badge>
 )}
 </div>
 </div>

 {/* Content Section */}
 <div className="pt-8 px-4 pb-4 flex-1 flex flex-col">
 <div className="flex items-center gap-1.5 mb-1">
 <h4 className="font-black text-xs md:text-sm text-slate-900 tracking-tight truncate flex-1 uppercase">
 {community.name}
 </h4>
 {community.is_official && (
 <span className="material-symbols-outlined text-[#1877F2] text-[16px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
 )}
 </div>

 <div className="flex flex-wrap items-center gap-1 mb-3">
 {community.field && (
 <span className="bg-slate-50 text-slate-400 text-[8px] font-black px-2 py-0.5 rounded-lg border border-slate-100 uppercase tracking-widest truncate max-w-full">
 {community.field}
 </span>
 )}
 </div>

 <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2 mb-4 h-8 opacity-80">
 {community.description || 'Nexus Hub for collaboration.'}
 </p>

 <div className="mt-auto grid grid-cols-2 gap-2 pt-3 border-t border-slate-50">
 <div className="flex flex-col">
 <span className="text-xs font-black text-slate-900 leading-none">{community.member_count || 0}</span>
 <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Founders</span>
 </div>
 <div className="flex flex-col items-end">
 <span className="text-xs font-black text-slate-900 leading-none">{community.post_count || 0}</span>
 <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Nodes</span>
 </div>
 </div>
 </div>

 {/* Action Strip */}
 <div className="px-4 py-4 bg-slate-50 border-t border-slate-100 mt-auto relative z-20">
 {isOwner ? (
 isDeleted ? (
 <HydratedOnly fallback={<div className="h-8 w-20 bg-slate-50 animate-pulse rounded-full" />}>
 <button
 onClick={() => handleRecoverCommunity(community.id)}
 disabled={!canRecover}
 className="w-full py-2 rounded-xl border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed bg-white"
 title={canRecover ? 'Undo delete' : 'Recovery window expired'}
 >
 {canRecover ? 'Recover' : 'Expired'}
 </button>
 </HydratedOnly>
 ) : (
 <div className="flex flex-col gap-2">
 <div className="grid grid-cols-2 gap-2">
 <Button 
 variant="outline" 
 size="sm" 
 onClick={(e) => { e.stopPropagation(); handleEditOpen(community); }}
 className="bg-white rounded-xl font-black uppercase tracking-widest text-[9px] h-9 flex items-center justify-center gap-1.5"
 >
 <span className="material-symbols-outlined text-[14px]">settings</span>
 Manage
 </Button>
 <HydratedOnly>
 <button
 onClick={() => openFeatureModal(community)}
 disabled={!!pendingFeatureByEntity[community.id] || (!!community.is_featured && isFeatureActive(community.featured_until))}
 className={cn(
 'h-9 flex items-center justify-center rounded-xl border text-[9px] font-black uppercase tracking-widest transition-colors px-2',
 (!!pendingFeatureByEntity[community.id] || (!!community.is_featured && isFeatureActive(community.featured_until)))
 ? 'border-slate-200 text-slate-400 cursor-not-allowed'
 : 'border-amber-200 text-amber-600 hover:bg-amber-50'
 )}
 >
 {!!community.is_featured && isFeatureActive(community.featured_until) ? 'Boosted' : 'Boost'}
 </button>
 </HydratedOnly>
 </div>
 
 <button 
 onClick={(e) => { e.stopPropagation(); handleDeleteCommunity(community.id, community.name); }}
 className="w-full rounded-xl bg-rose-50 text-rose-500 font-black uppercase tracking-widest text-[9px] py-2.5 flex items-center justify-center gap-2 border border-rose-100/50"
 >
 <span className="material-symbols-outlined text-[16px]">delete</span>
 Remove Hub
 </button>

 {community.moderation === 'rejected' && (
 <button
 className="text-[9px] text-rose-600 font-black uppercase tracking-widest hover:underline text-center py-1 mt-1"
 onClick={(e) => {
 e.stopPropagation();
 setExpandedRejections((prev) => {
 const next = new Set(prev)
 next.has(community.id) ? next.delete(community.id) : next.add(community.id)
 return next
 })
 }}
 >
 {expandedRejections.has(community.id) ? 'Close Reason' : 'Admin Note'}
 </button>
 )}
 {expandedRejections.has(community.id) && (
 <div className="p-2.5 bg-rose-50/50 rounded-xl text-[9px] font-bold text-rose-600 text-center leading-relaxed border border-rose-100">
 {community.rejection_note || 'Standard variance.'}
 </div>
 )}
 </div>
 )
 ) : (
 <Button 
 variant="outline" 
 size="sm" 
 fullWidth 
 onClick={(e) => { e.stopPropagation(); handleLeave(community.id); }}
 className="bg-white rounded-[18px] font-black uppercase tracking-widest text-[9px] h-10 border-slate-200 text-slate-500"
 >
 <span className="material-symbols-outlined text-[16px]">logout</span>
 Exit Hub
 </Button>
 )}
 </div>
 </Card>
 )
 }

 const statCards = [
 { label: 'Created', value: stats.created, icon: 'add_circle' },
 { label: 'Joined', value: stats.joined, icon: 'group_add' },
 { label: 'Total Members', value: stats.totalMembers, icon: 'group' },
 { label: 'Total Posts', value: stats.totalPosts, icon: 'forum' },
 ]

 return (
 <div className="space-y-8">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-4">
 <div>
 <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">My Nexus Hubs</h1>
 <p className="text-slate-500 text-sm mt-1 font-medium">Manage and explore student-led Nexus Hubs</p>
 </div>
 <Button
 onClick={() => {
 if (reachedCommunityLimit) {
 setRequestedSlotLimit(Math.max(communitySlotLimit + 1, Number(pendingSlotRequest?.requested_limit || 0)))
 setShowSlotRequestModal(true)
 return
 }
 setShowModal(true)
 }}
 className="shadow-xl shadow-primary/20 w-full sm:w-auto h-12 rounded-2xl flex items-center justify-center gap-2 px-6"
 >
            <span className="material-symbols-outlined text-[22px]">add_circle</span>
            <span className="font-black uppercase tracking-widest text-[11px]">Create Nexus Hub</span>
 </Button>
 </div>

 <div
 className={cn(
 'rounded-2xl border px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4',
 reachedCommunityLimit ? 'bg-destructive-light/40 border-destructive/30' : 'bg-primary-light/30 border-primary/20'
 )}
 >
 <div>
 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Nexus Hub Slots</p>
 <p className="text-sm font-semibold text-text-primary mt-1">
 Active <span className="font-black">{activeCreatedCount}</span> of <span className="font-black">{communitySlotLimit}</span>
 </p>
 {pendingSlotRequest && (
 <p className="text-xs text-text-secondary mt-1">
 Pending request: {pendingSlotRequest.requested_limit} total slots
 </p>
 )}
 </div>
 <div className="flex items-center gap-3">
 {reachedCommunityLimit ? (
 <span className="text-xs font-bold text-destructive">Limit reached</span>
 ) : (
 <span className="text-xs font-bold text-primary">Slots available</span>
 )}
 <Button
 variant="outline"
 onClick={() => {
 setRequestedSlotLimit(Math.max(communitySlotLimit + 1, Number(pendingSlotRequest?.requested_limit || 0)))
 setShowSlotRequestModal(true)
 }}
 disabled={!!pendingSlotRequest}
 >
 {pendingSlotRequest ? 'Request Pending' : 'Request More Slots'}
 </Button>
 </div>
 </div>

 {/* Stats Row */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
 {statCards.map((stat) => (
 <Card key={stat.label} className="p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:justify-between border-b-4 border-emerald-500 bg-white rounded-3xl">
 <div className="text-center sm:text-left mb-3 sm:mb-0">
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
 <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{stat.value}</h3>
 </div>
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
 <span className="material-symbols-outlined">{stat.icon}</span>
 </div>
 </Card>
 ))}
 </div>

 {/* Created Communities - 2x2 Mobile Grid */}
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Hubs I Created</h2>
 </div>
 
 {loading ? (
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
 {Array.from({ length: 2 }).map((_, i) => (
 <div key={i} className="aspect-[4/5] bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
 ))}
 </div>
 ) : created.length === 0 ? (
 <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/30">
 <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">add_circle</span>
 <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No hubs launched yet</p>
 </div>
 ) : (
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 pb-4">
 {created.map((c) => (
 <div key={c.id}>
 <CommunityCard community={c} isOwner />
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Joined Communities - 2x2 Mobile Grid */}
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Hubs I Joined</h2>
 <div className="relative w-full sm:w-64">
 <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
 search
 </span>
 <input
 value={searchJoined}
 onChange={(e) => setSearchJoined(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
 placeholder="Search hubs..."
 />
 </div>
 </div>
 
 {loading ? (
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
 {Array.from({ length: 2 }).map((_, i) => (
 <div key={i} className="aspect-[4/5] bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
 ))}
 </div>
 ) : filteredJoined.length === 0 ? (
 <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/30">
 <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">groups</span>
 <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No hubs joined yet</p>
 </div>
 ) : (
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 pb-8">
 {filteredJoined.map((m: any) => (
 <div key={m.community?.id || m.id}>
 <CommunityCard community={m.community} membership={m} />
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Create Community Modal */}
 <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Nexus Hub" size="lg">
 <div className="space-y-5">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Nexus Hub Name *</label>
 <input
 value={formName}
 onChange={(e) => setFormName(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
 placeholder="e.g. Electronics Lab Community"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Field / Category *</label>
 <select
 value={formField}
 onChange={(e) => setFormField(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
 >
 <option value="">Select field</option>
 {FIELDS.map((f) => (
 <option key={f} value={f}>{f}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Hub Type</label>
 <div className="flex gap-2">
 {(['field', 'project'] as const).map((t) => (
 <button
 key={t}
 type="button"
 onClick={() => setFormType(t)}
 className={cn(
 'flex-1 px-4 py-2.5 rounded-full text-sm font-semibold transition-all border',
 formType === t
 ? 'border-primary bg-primary-light text-primary'
 : 'border-border bg-surface text-text-secondary'
 )}
 >
 {t === 'field' ? 'Field Focus' : 'Project Focus'}
 </button>
 ))}
 </div>
 </div>
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Description *</label>
 <textarea
 value={formDesc}
 onChange={(e) => setFormDesc(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
 rows={3}
 placeholder="What is this community about?"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Nexus Hub Rules (optional)</label>
 <textarea
 value={formRules}
 onChange={(e) => setFormRules(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
 rows={2}
 placeholder="Rules for members..."
 />
 </div>
 <div className="flex gap-3 pt-4">
 <Button variant="outline" onClick={() => setShowModal(false)} fullWidth>Cancel</Button>
 <Button onClick={handleCreate} loading={submitting} fullWidth>Submit for Review</Button>
 </div>
 </div>
 </Modal>

 {/* Edit Community Modal */}
 <Modal open={!!editingCommunity} onClose={() => setEditingCommunity(null)} title="Community Settings" size="lg">
 <div className="space-y-5">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Community Name *</label>
 <input
 value={editForm.name}
 onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Field / Category</label>
 <select
 value={editForm.field}
 onChange={(e) => setEditForm(prev => ({ ...prev, field: e.target.value }))}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 outline-none"
 >
 <option value="">Select field</option>
 {FIELDS.map((f: string) => (
 <option key={f} value={f}>{f}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Community Type</label>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setEditForm(prev => ({ ...prev, type: 'field' }))}
 className={cn("flex-1 py-2 text-xs font-bold rounded-lg border transition-all", editForm.type === 'field' ? "bg-primary text-white border-primary" : "bg-surface text-text-secondary border-border")}
 >
 Field
 </button>
 <button
 type="button"
 onClick={() => setEditForm(prev => ({ ...prev, type: 'project' }))}
 className={cn("flex-1 py-2 text-xs font-bold rounded-lg border transition-all", editForm.type === 'project' ? "bg-primary text-white border-primary" : "bg-surface text-text-secondary border-border")}
 >
 Project
 </button>
 </div>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Avatar Poster</label>
 <div className="flex items-center gap-3 mt-1">
 <Avatar src={editForm.avatar_url || ''} fallback={editForm.name || 'C'} className="bg-primary/10 text-primary uppercase text-sm font-bold" />
 <Button variant="outline" size="sm" loading={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
 Upload Avatar
 </Button>
 <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarSelect} />
 {editForm.avatar_url && (
 <button type="button" onClick={() => setEditForm(prev => ({...prev, avatar_url: ''}))} className="text-destructive hover:text-destructive/80 p-1">
 <span className="material-symbols-outlined text-[18px]">delete</span>
 </button>
 )}
 </div>
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Banner Image</label>
 <div className="flex items-center gap-3 mt-1">
 {editForm.banner_url ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img src={editForm.banner_url} className="w-14 h-10 object-cover rounded shadow" alt="banner" />
 ) : (
 <div className="w-14 h-10 bg-surface border border-border rounded shadow flex items-center justify-center">
 <span className="material-symbols-outlined text-text-muted text-[16px]">landscape</span>
 </div>
 )}
 <Button variant="outline" size="sm" loading={uploadingBanner} onClick={() => bannerInputRef.current?.click()}>
 Upload Banner
 </Button>
 <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={handleBannerSelect} />
 {editForm.banner_url && (
 <button type="button" onClick={() => setEditForm(prev => ({...prev, banner_url: ''}))} className="text-destructive hover:text-destructive/80 p-1">
 <span className="material-symbols-outlined text-[18px]">delete</span>
 </button>
 )}
 </div>
 </div>
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Description *</label>
 <textarea
 value={editForm.desc}
 onChange={(e) => setEditForm(prev => ({ ...prev, desc: e.target.value }))}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 outline-none resize-y"
 rows={3}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Community Rules</label>
 <textarea
 value={editForm.rules}
 onChange={(e) => setEditForm(prev => ({ ...prev, rules: e.target.value }))}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 outline-none resize-y"
 rows={2}
 />
 </div>
 <div className="flex gap-3 pt-4 border-t border-border mt-4">
 <Button variant="outline" onClick={() => setEditingCommunity(null)} fullWidth>Cancel</Button>
 <Button onClick={handleEditSubmit} loading={editSubmitting} fullWidth>Save Changes</Button>
 </div>
 </div>
 </Modal>

 <Modal
 open={showSlotRequestModal}
 onClose={() => setShowSlotRequestModal(false)}
 title="Request More Community Slots"
 size="lg"
 >
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="rounded-xl border border-border bg-surface p-3">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Current Limit</p>
 <p className="text-2xl font-black text-text-primary mt-1">{communitySlotLimit}</p>
 </div>
 <div className="rounded-xl border border-border bg-surface p-3">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Used Slots</p>
 <p className="text-2xl font-black text-text-primary mt-1">{activeCreatedCount}</p>
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Requested total community slots</label>
 <input
 type="number"
 min={communitySlotLimit + 1}
 value={requestedSlotLimit}
 onChange={(e) => setRequestedSlotLimit(Number(e.target.value || 0))}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Reason</label>
 <textarea
 value={slotRequestReason}
 onChange={(e) => setSlotRequestReason(e.target.value)}
 rows={4}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
 placeholder="Explain why you need additional community slots."
 />
 </div>

 <div className="flex gap-3 pt-2">
 <Button variant="outline" fullWidth onClick={() => setShowSlotRequestModal(false)}>
 Cancel
 </Button>
 <Button fullWidth loading={slotRequestLoading} onClick={handleRequestMoreCommunitySlots}>
 Submit Request
 </Button>
 </div>
 </div>
 </Modal>

 <Modal
 open={showFeatureModal}
 onClose={() => setShowFeatureModal(false)}
 title="Request Community Spotlight"
 size="lg"
 >
 <div className="space-y-4">
 <div className="rounded-2xl border border-border bg-surface p-4">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Selected Community</p>
 <p className="text-sm font-bold text-text-primary mt-1">{featureTarget?.name || '-'}</p>
 </div>

 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Requested featured days</label>
 <input
 type="number"
 min={1}
 max={60}
 value={requestedFeatureDays}
 onChange={(e) => setRequestedFeatureDays(Number(e.target.value || 0))}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-sm font-medium text-text-primary">Reason for featuring</label>
 <textarea
 rows={4}
 value={featureReason}
 onChange={(e) => setFeatureReason(e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none"
 placeholder="Tell admin why this community should be promoted."
 />
 </div>

 <div className="flex gap-3 pt-2">
 <Button variant="outline" fullWidth onClick={() => setShowFeatureModal(false)}>
 Cancel
 </Button>
 <Button fullWidth loading={featureSubmitting} onClick={submitFeatureRequest}>
 Submit Request
 </Button>
 </div>
 </div>
 </Modal>
 </div>
 )
}
