'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DeleteAccountTabProps {
  profile: any
}

export function DeleteAccountTab({ profile }: DeleteAccountTabProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    // Make check flexible: ignore case and ignore the '@' symbol if user types it
    const cleanConfirmation = confirmationText.replace(/^@/, '').toLowerCase()
    const cleanUsername = profile.username.toLowerCase()

    if (cleanConfirmation !== cleanUsername) {
      toast.error(`Please type "${profile.username}" to confirm.`)
      return
    }

    setDeleting(true)
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      toast.success('Your account has been permanently deleted.')
      
      // Use window.location to force a clean slate logout
      window.location.href = '/login'
    } catch (error: any) {
      toast.error(error.message)
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Danger Zone</h1>
        <p className="text-slate-500 text-sm mt-2">Manage permanent account actions</p>
      </header>

      <Card padding="lg" className="border-rose-100 bg-rose-50/30">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-rose-600 font-bold">delete_forever</span>
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Delete Permanently</h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Deleting your account is permanent and cannot be undone. All your listings, 
                blogs, messages, and followers will be removed from the Allpanga platform.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 italic">
                Type your username <span className="text-rose-600">@{profile.username}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={profile.username}
                className="w-full px-4 py-3 rounded-xl border border-rose-200 bg-white text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all font-mono"
              />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                disabled={deleting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                loading={deleting}
                disabled={
                  confirmationText.replace(/^@/, '').toLowerCase() !== profile.username.toLowerCase() || 
                  deleting
                }
                className="bg-rose-600 hover:bg-rose-700 text-white border-none rounded-xl px-8 shadow-lg shadow-rose-200"
              >
                Delete My Account
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <footer className="px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-start gap-3">
           <span className="material-symbols-outlined text-slate-400 text-[20px]">info</span>
           <p className="text-[11px] text-slate-500 leading-relaxed italic">
             Important: After deletion, your data will still be held in our secure backups for 30 days 
             before being permanently purged as per Digital Nexus data policy.
           </p>
        </div>
      </footer>
    </div>
  )
}
