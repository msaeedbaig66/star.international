'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Option = { id: string; name: string }

export default function OnboardingPage() {
 const [formData, setFormData] = useState({
 sectorTypeId: '',
 institutionId: '',
 departmentId: ''
 })

 const [sectorTypes, setSectorTypes] = useState<Option[]>([])
 const [institutions, setInstitutions] = useState<Option[]>([])
 const [departments, setDepartments] = useState<Option[]>([])
 
 const [loading, setLoading] = useState(false)
 const [loadingOptions, setLoadingOptions] = useState(true)
 const router = useRouter()

 // Load Sectors
 useEffect(() => {
 async function loadSectors() {
 try {
 const res = await fetch('/api/academic-structure')
 const json = await res.json()
 if (json.data?.sector_types) setSectorTypes(json.data.sector_types)
 } catch (err) {
 toast.error('Failed to load academic data')
 } finally {
 setLoadingOptions(false)
 }
 }
 loadSectors()
 }, [])

 // Load Institutions
 useEffect(() => {
 if (!formData.sectorTypeId) return
 async function loadUnis() {
 const res = await fetch(`/api/academic-structure?sector_type_id=${formData.sectorTypeId}`)
 const json = await res.json()
 if (json.data?.institutions) setInstitutions(json.data.institutions)
 }
 loadUnis()
 }, [formData.sectorTypeId])

 // Load Departments
 useEffect(() => {
 if (!formData.institutionId) return
 async function loadDepts() {
 const res = await fetch(`/api/academic-structure?institution_id=${formData.institutionId}`)
 const json = await res.json()
 if (json.data?.departments) setDepartments(json.data.departments)
 }
 loadDepts()
 }, [formData.institutionId])

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!formData.departmentId) return
 
 setLoading(true)
 const supabase = createClient()
 const { data: { user } } = await supabase.auth.getUser()

 if (!user) {
 router.push('/login')
 return
 }

 const { error } = await supabase
 .from('profiles')
 .update({
 sector_type_id: formData.sectorTypeId,
 institution_id: formData.institutionId,
 department_id: formData.departmentId,
 onboarding_completed: true
 })
 .eq('id', user.id)

 if (error) {
 toast.error('Failed to save your profile')
 setLoading(false)
 } else {
 toast.success('Welcome to Allpanga!')
 // Force a full reload to ensure the new session cookie is picked up
 window.location.href = '/'
 }
 }

 return (
 <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
 <div className="w-full max-w-[520px] bg-white rounded-3xl shadow-2xl p-10 border border-primary/5 animate-in fade-in zoom-in-95 duration-500">
 <div className="text-center mb-10">
 <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6 animate-bounce duration-[2000ms]">
 <span className="material-symbols-outlined text-3xl">school</span>
 </div>
 <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Final Step!</h1>
 <p className="text-slate-500 font-medium">Please select your University details to continue.</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Sector Type */}
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Sector</label>
 <select
 required
 className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold appearance-none"
 value={formData.sectorTypeId}
 onChange={(e) => setFormData({ ...formData, sectorTypeId: e.target.value, institutionId: '', departmentId: '' })}
 >
 <option value="">{loadingOptions ? 'Loading...' : 'Pick a Sector'}</option>
 {sectorTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
 </select>
 </div>

 {/* University */}
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select University / Institute</label>
 <select
 required
 disabled={!formData.sectorTypeId}
 className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold appearance-none disabled:opacity-50"
 value={formData.institutionId}
 onChange={(e) => setFormData({ ...formData, institutionId: e.target.value, departmentId: '' })}
 >
 <option value="">Pick a University</option>
 {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
 </select>
 </div>

 {/* Department */}
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Department</label>
 <select
 required
 disabled={!formData.institutionId}
 className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold appearance-none disabled:opacity-50"
 value={formData.departmentId}
 onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
 >
 <option value="">Pick a Department</option>
 {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
 </select>
 </div>

 <button
 type="submit"
 disabled={loading || !formData.departmentId}
 className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 mt-4 group active:scale-95"
 >
 {loading ? (
 <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
 ) : (
 <>
 Complete Setup
 <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
 </>
 )}
 </button>
 </form>
 </div>
 </div>
 )
}
