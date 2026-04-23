'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { cn, formatRelativeTime } from '@/lib/utils'
import { SafeTime } from '@/components/shared/safe-time'

type AdminUser = {
 id: string
 username: string
 full_name: string | null
 email: string | null
 avatar_url: string | null
 role: 'user' | 'admin' | 'moderator' | 'subadmin' | null
 is_verified: boolean | null
 is_banned: boolean | null
 ban_reason: string | null
 banned_at: string | null
 created_at: string
}

interface UsersManagerProps {
 initialUsers: AdminUser[]
 currentAdminId: string | null
}

export function UsersManager({ initialUsers, currentAdminId }: UsersManagerProps) {
 const [users, setUsers] = useState<AdminUser[]>(initialUsers || [])
 const [query, setQuery] = useState('')
 const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
 const [confirmName, setConfirmName] = useState('')
 const [deleting, setDeleting] = useState(false)
 const [banning, setBanning] = useState<string | null>(null) // the user ID being banned
 const [banReason, setBanReason] = useState('')
 const [processingBan, setProcessingBan] = useState(false)

 const filteredUsers = useMemo(() => {
 const q = query.trim().toLowerCase()
 if (!q) return users
 return users.filter((user) =>
 [user.username, user.full_name || '', user.email || '']
 .join(' ')
 .toLowerCase()
 .includes(q)
 )
 }, [query, users])

 const stats = useMemo(
 () => ({
 total: users.length,
 admins: users.filter((user) => user.role === 'admin').length,
 verified: users.filter((user) => user.is_verified).length,
 }),
 [users]
 )

 const expectedConfirmation = (selectedUser?.full_name || selectedUser?.username || '').trim()
 const canDelete =
 !!selectedUser &&
 selectedUser.id !== currentAdminId &&
 confirmName.trim() === expectedConfirmation &&
 expectedConfirmation.length > 0

 async function handleDelete() {
 if (!selectedUser || !canDelete) return
 try {
 setDeleting(true)
 const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ confirm_name: confirmName.trim() }),
 })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) {
 throw new Error(result?.error || 'Failed to delete account')
 }

 setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id))
 toast.success('User account deleted permanently')
 setSelectedUser(null)
 setConfirmName('')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to delete account')
 } finally {
 setDeleting(false)
 }
 }
 
 async function toggleBan(user: AdminUser, reason?: string) {
 try {
 setProcessingBan(true)
 const nextStatus = !user.is_banned
 const response = await fetch(`/api/admin/users/${user.id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ is_banned: nextStatus, ban_reason: reason }),
 })
 
 if (!response.ok) throw new Error('Failed to update ban status')
 
 setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: nextStatus } : u))
 toast.success(nextStatus ? 'Account suspended' : 'Suspension lifted')
 setBanning(null)
 setBanReason('')
 } catch (error: any) {
 toast.error(error.message)
 } finally {
 setProcessingBan(false)
 }
 }

 return (
 <div className="space-y-8 pb-20">
 <header className="space-y-2">
 <h2 className="text-3xl font-black text-text-primary tracking-tight">User Accounts</h2>
 <p className="text-text-secondary">
 Monitor all accounts and remove compromised or invalid users safely.
 </p>
 </header>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <StatCard label="Total Users" value={stats.total} />
 <StatCard label="Admin Users" value={stats.admins} />
 <StatCard label="Verified Users" value={stats.verified} />
 </div>

 <section className="bg-white border border-border rounded-3xl p-6 space-y-5">
 <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
 <div>
 <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black">Directory</p>
 <p className="text-sm text-text-secondary mt-1">Search by name, username, or email</p>
 </div>
 <input
 value={query}
 onChange={(event) => setQuery(event.target.value)}
 placeholder="Search users..."
 className="w-full md:w-[360px] rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
 />
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black">
 <th className="pb-3">User</th>
 <th className="pb-3">Email</th>
 <th className="pb-3">Role</th>
 <th className="pb-3">Joined</th>
 <th className="pb-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredUsers.map((user) => {
 const isSelf = user.id === currentAdminId
 return (
 <tr key={user.id} className="text-sm">
 <td className="py-3">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-surface overflow-hidden border border-border flex items-center justify-center">
 {user.avatar_url ? (
 <Image
 src={user.avatar_url}
 alt={user.full_name || user.username}
 width={40}
 height={40}
 className="w-full h-full object-cover"
 />
 ) : (
 <span className="material-symbols-outlined text-text-muted text-lg">person</span>
 )}
 </div>
 <div>
 <p className="font-bold text-text-primary leading-tight">
 {user.full_name || user.username}
 </p>
 <p className="text-xs text-text-secondary">@{user.username}</p>
 </div>
 </div>
 </td>
 <td className="py-3 text-text-secondary">{user.email || '-'}</td>
 <td className="py-3">
 <div className="flex items-center gap-2">
 <span
 className={cn(
 'inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
 user.role === 'admin'
 ? 'bg-primary-light text-primary'
 : user.role === 'subadmin'
 ? 'bg-indigo-100 text-indigo-700'
 : user.role === 'moderator'
 ? 'bg-amber-100 text-amber-700'
 : 'bg-surface text-text-muted'
 )}
 >
 {user.role || 'user'}
 </span>
 {user.is_verified && (
 <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
 Verified
 </span>
 )}
 {user.is_banned && (
 <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-destructive/10 text-destructive">
 Banned
 </span>
 )}
 </div>
 </td>
 <td className="py-3 text-text-secondary whitespace-nowrap">
 <SafeTime date={user.created_at} />
 </td>
 <td className="py-3 text-right">
 <div className="flex items-center justify-end gap-2">
 <select
 value={user.role || 'user'}
 onChange={async (e) => {
 const newRole = e.target.value
 try {
 const response = await fetch(`/api/admin/users/${user.id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ role: newRole }),
 })
 if (!response.ok) throw new Error('Failed to update role')
 setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole as any } : u))
 toast.success('User role updated')
 } catch (err: any) {
 toast.error(err.message)
 }
 }}
 disabled={isSelf}
 className={cn(
 'px-3 py-2 rounded-lg text-xs font-bold bg-surface border border-border outline-none focus:ring-2 focus:ring-primary/30',
 isSelf && 'hidden'
 )}
 >
 <option value="user">User</option>
 <option value="moderator">Moderator</option>
 <option value="subadmin">Sub-Admin</option>
 <option value="admin">Admin</option>
 </select>
 <button
 onClick={() => {
 if (user.is_banned) {
 toggleBan(user)
 } else {
 setBanning(user.id)
 setBanReason('')
 }
 }}
 disabled={isSelf || processingBan}
 className={cn(
 'px-4 py-2 rounded-lg text-xs font-bold transition-all',
 isSelf 
 ? 'hidden' 
 : user.is_banned
 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
 : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
 )}
 >
 {user.is_banned ? 'Unban' : 'Suspend'}
 </button>
 <button
 onClick={() => {
 setSelectedUser(user)
 setConfirmName('')
 }}
 disabled={isSelf}
 className={cn(
 'px-4 py-2 rounded-lg text-xs font-bold transition-colors',
 isSelf
 ? 'bg-surface text-text-muted cursor-not-allowed'
 : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
 )}
 >
 {isSelf ? 'Current Admin' : 'Delete'}
 </button>
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 {filteredUsers.length === 0 && (
 <p className="text-sm text-text-secondary py-8 text-center">No users found.</p>
 )}
 </div>
 </section>

 {selectedUser && (
 <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-border rounded-3xl w-full max-w-xl p-6 space-y-5">
 <div className="space-y-2">
 <h3 className="text-2xl font-black text-destructive tracking-tight">Delete User Account</h3>
 <p className="text-sm text-text-secondary">
 This permanently removes the auth account and profile data. The same email can register again afterward.
 </p>
 <p className="text-sm text-text-primary">
 To confirm, type this exact name: <span className="font-black">{expectedConfirmation}</span>
 </p>
 </div>

 <input
 value={confirmName}
 onChange={(event) => setConfirmName(event.target.value)}
 placeholder="Type exact account name"
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-destructive/30"
 />

 <div className="flex gap-3">
 <button
 onClick={handleDelete}
 disabled={!canDelete || deleting}
 className="flex-1 rounded-xl bg-destructive text-white py-3 text-sm font-black uppercase tracking-[0.12em] disabled:opacity-50"
 >
 {deleting ? 'Deleting...' : 'Delete Permanently'}
 </button>
 <button
 onClick={() => {
 setSelectedUser(null)
 setConfirmName('')
 }}
 className="px-6 rounded-xl bg-surface text-text-secondary py-3 text-sm font-bold"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 {banning && (
 <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-border rounded-[2.5rem] w-full max-w-md p-8 space-y-6 shadow-2xl">
 <div className="space-y-3">
 <div className="w-16 h-16 rounded-3xl bg-orange-100 flex items-center justify-center text-orange-600 mb-2">
 <span className="material-symbols-outlined text-[32px]">block</span>
 </div>
 <h3 className="text-2xl font-black text-text-primary tracking-tight uppercase">Suspend Account</h3>
 <p className="text-sm text-text-secondary leading-relaxed">
 Provide a reason for the suspension. This user will be restricted from accessing their dashboard and posting new content.
 </p>
 </div>

 <textarea
 value={banReason}
 onChange={(e) => setBanReason(e.target.value)}
 placeholder="e.g. Repeated spamming, Fraudulent listings..."
 className="w-full rounded-2xl border border-border bg-surface px-5 py-4 text-sm focus:ring-2 focus:ring-orange-500/30 min-h-[120px] resize-none"
 />

 <div className="flex gap-4">
 <button
 onClick={() => {
 const targetUser = users.find(u => u.id === banning)
 if (targetUser) toggleBan(targetUser, banReason)
 }}
 disabled={processingBan || !banReason.trim()}
 className="flex-1 h-14 rounded-2xl bg-orange-600 text-white text-sm font-black uppercase tracking-[0.15em] disabled:opacity-50 shadow-lg shadow-orange-600/20 active:translate-y-0.5 transition-all"
 >
 {processingBan ? 'Updating...' : 'Confirm Suspension'}
 </button>
 <button
 onClick={() => {
 setBanning(null)
 setBanReason('')
 }}
 className="px-8 h-14 rounded-2xl bg-surface text-text-secondary text-sm font-black uppercase tracking-[0.12em]"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}

function StatCard({ label, value }: { label: string; value: number }) {
 return (
 <div className="bg-white border border-border rounded-2xl p-5">
 <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black">{label}</p>
 <p className="text-3xl font-black text-text-primary mt-2">{value}</p>
 </div>
 )
}
