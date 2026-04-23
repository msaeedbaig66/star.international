'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type SectorType = {
 id: string
 name: string
 is_active: boolean
 sort_order: number
 created_at: string
 updated_at: string
}

type Institution = {
 id: string
 sector_type_id: string
 name: string
 city: string | null
 province_or_region: string | null
 is_active: boolean
 sort_order: number
 created_at: string
 updated_at: string
 sector_type?: { id: string; name: string } | null
}

type Department = {
 id: string
 institution_id: string
 name: string
 is_active: boolean
 sort_order: number
 created_at: string
 updated_at: string
 institution?: { id: string; name: string; sector_type_id?: string } | null
}

interface AcademicStructureManagerProps {
 initialSectorTypes: SectorType[]
 initialInstitutions: Institution[]
 initialDepartments: Department[]
}

type SectionKey = 'sector' | 'institution' | 'department'

export function AcademicStructureManager({
 initialSectorTypes,
 initialInstitutions,
 initialDepartments,
}: AcademicStructureManagerProps) {
 const [sectorTypes, setSectorTypes] = useState<SectorType[]>(initialSectorTypes || [])
 const [institutions, setInstitutions] = useState<Institution[]>(initialInstitutions || [])
 const [departments, setDepartments] = useState<Department[]>(initialDepartments || [])

 const [activeSection, setActiveSection] = useState<SectionKey>('sector')
 const [loading, setLoading] = useState(false)

 const [newSectorName, setNewSectorName] = useState('')
 const [newSectorSortOrder, setNewSectorSortOrder] = useState(0)
 const [newSectorActive, setNewSectorActive] = useState(true)

 const [newInstitutionSectorId, setNewInstitutionSectorId] = useState('')
 const [newInstitutionName, setNewInstitutionName] = useState('')
 const [newInstitutionCity, setNewInstitutionCity] = useState('')
 const [newInstitutionProvince, setNewInstitutionProvince] = useState('')
 const [newInstitutionSortOrder, setNewInstitutionSortOrder] = useState(0)
 const [newInstitutionActive, setNewInstitutionActive] = useState(true)

 const [newDepartmentInstitutionId, setNewDepartmentInstitutionId] = useState('')
 const [newDepartmentName, setNewDepartmentName] = useState('')
 const [newDepartmentSortOrder, setNewDepartmentSortOrder] = useState(0)
 const [newDepartmentActive, setNewDepartmentActive] = useState(true)

 const [editingSector, setEditingSector] = useState<SectorType | null>(null)
 const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)
 const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)

 const normalizeInstitution = (row: any): Institution => ({
 ...row,
 sector_type: Array.isArray(row?.sector_type) ? row.sector_type[0] || null : row?.sector_type || null,
 })

 const normalizeDepartment = (row: any): Department => ({
 ...row,
 institution: Array.isArray(row?.institution) ? row.institution[0] || null : row?.institution || null,
 })

 const sectorTypeOptions = useMemo(
 () => [...sectorTypes].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
 [sectorTypes]
 )

 const institutionOptions = useMemo(
 () => [...institutions].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
 [institutions]
 )

 async function createEntity(payload: Record<string, unknown>) {
 setLoading(true)
 try {
 const response = await fetch('/api/admin/academic-structure', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) {
 throw new Error(result?.error || 'Request failed')
 }
 return result?.data
 } finally {
 setLoading(false)
 }
 }

 async function patchEntity(payload: Record<string, unknown>) {
 setLoading(true)
 try {
 const response = await fetch('/api/admin/academic-structure', {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 })
 const result = await response.json().catch(() => ({}))
 if (!response.ok) {
 throw new Error(result?.error || 'Update failed')
 }
 return result?.data
 } finally {
 setLoading(false)
 }
 }

 const handleCreateSector = async () => {
 if (!newSectorName.trim()) {
 toast.error('Sector type name is required')
 return
 }
 try {
 const created = (await createEntity({
 entity_type: 'sector_type',
 name: newSectorName.trim(),
 sort_order: newSectorSortOrder,
 is_active: newSectorActive,
 })) as SectorType

 setSectorTypes((prev) => [...prev, created])
 setNewSectorName('')
 setNewSectorSortOrder(0)
 setNewSectorActive(true)
 toast.success('Sector type created')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to create sector type')
 }
 }

 const handleCreateInstitution = async () => {
 if (!newInstitutionSectorId) {
 toast.error('Select a sector type first')
 return
 }
 if (!newInstitutionName.trim()) {
 toast.error('Institute name is required')
 return
 }

 try {
 const createdRaw = await createEntity({
 entity_type: 'institution',
 sector_type_id: newInstitutionSectorId,
 name: newInstitutionName.trim(),
 city: newInstitutionCity.trim() || null,
 province_or_region: newInstitutionProvince.trim() || null,
 sort_order: newInstitutionSortOrder,
 is_active: newInstitutionActive,
 })

 const created = normalizeInstitution(createdRaw)
 setInstitutions((prev) => [...prev, created])
 setNewInstitutionName('')
 setNewInstitutionCity('')
 setNewInstitutionProvince('')
 setNewInstitutionSortOrder(0)
 setNewInstitutionActive(true)
 toast.success('Institute created')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to create institute')
 }
 }

 const handleCreateDepartment = async () => {
 if (!newDepartmentInstitutionId) {
 toast.error('Select an institute first')
 return
 }
 if (!newDepartmentName.trim()) {
 toast.error('Department name is required')
 return
 }

 try {
 const createdRaw = await createEntity({
 entity_type: 'department',
 institution_id: newDepartmentInstitutionId,
 name: newDepartmentName.trim(),
 sort_order: newDepartmentSortOrder,
 is_active: newDepartmentActive,
 })

 const created = normalizeDepartment(createdRaw)
 setDepartments((prev) => [...prev, created])
 setNewDepartmentName('')
 setNewDepartmentSortOrder(0)
 setNewDepartmentActive(true)
 toast.success('Department created')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to create department')
 }
 }

 const handleToggleSector = async (item: SectorType) => {
 try {
 const updated = (await patchEntity({
 entity_type: 'sector_type',
 id: item.id,
 is_active: !item.is_active,
 })) as SectorType
 setSectorTypes((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
 toast.success('Sector type status updated')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to update sector type')
 }
 }

 const handleToggleInstitution = async (item: Institution) => {
 try {
 const updated = normalizeInstitution(
 await patchEntity({ entity_type: 'institution', id: item.id, is_active: !item.is_active })
 )
 setInstitutions((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
 toast.success('Institute status updated')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to update institute')
 }
 }

 const handleToggleDepartment = async (item: Department) => {
 try {
 const updated = normalizeDepartment(
 await patchEntity({ entity_type: 'department', id: item.id, is_active: !item.is_active })
 )
 setDepartments((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
 toast.success('Department status updated')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to update department')
 }
 }

 const handleSaveSector = async () => {
 if (!editingSector) return
 if (!editingSector.name.trim()) {
 toast.error('Sector type name is required')
 return
 }

 try {
 const updated = (await patchEntity({
 entity_type: 'sector_type',
 id: editingSector.id,
 name: editingSector.name.trim(),
 sort_order: editingSector.sort_order,
 is_active: editingSector.is_active,
 })) as SectorType

 setSectorTypes((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
 setEditingSector(null)
 toast.success('Sector type updated')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to update sector type')
 }
 }

 const handleSaveInstitution = async () => {
 if (!editingInstitution) return
 if (!editingInstitution.name.trim()) {
 toast.error('Institute name is required')
 return
 }

 try {
 const updated = normalizeInstitution(
 await patchEntity({
 entity_type: 'institution',
 id: editingInstitution.id,
 sector_type_id: editingInstitution.sector_type_id,
 name: editingInstitution.name.trim(),
 city: editingInstitution.city || null,
 province_or_region: editingInstitution.province_or_region || null,
 sort_order: editingInstitution.sort_order,
 is_active: editingInstitution.is_active,
 })
 )

 setInstitutions((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
 setEditingInstitution(null)
 toast.success('Institute updated')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to update institute')
 }
 }

 const handleSaveDepartment = async () => {
 if (!editingDepartment) return
 if (!editingDepartment.name.trim()) {
 toast.error('Department name is required')
 return
 }

 try {
 const updated = normalizeDepartment(
 await patchEntity({
 entity_type: 'department',
 id: editingDepartment.id,
 institution_id: editingDepartment.institution_id,
 name: editingDepartment.name.trim(),
 sort_order: editingDepartment.sort_order,
 is_active: editingDepartment.is_active,
 })
 )

 setDepartments((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
 setEditingDepartment(null)
 toast.success('Department updated')
 } catch (error: any) {
 toast.error(error?.message || 'Unable to update department')
 }
 }

 return (
 <div className="space-y-8 pb-24">
 <header>
 <h2 className="text-3xl font-black text-text-primary tracking-tight">Academic Structure</h2>
 <p className="text-text-secondary mt-2">
 Manage sector types, institutes, and departments used by signup and profile records.
 </p>
 </header>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <StatCard label="Sector Types" value={sectorTypes.length} />
 <StatCard label="Institutes" value={institutions.length} />
 <StatCard label="Departments" value={departments.length} />
 </div>

 <div className="flex gap-2 p-1 bg-surface rounded-full w-fit">
 <SectionTab label="Sector Types" active={activeSection === 'sector'} onClick={() => setActiveSection('sector')} />
 <SectionTab label="Institutes" active={activeSection === 'institution'} onClick={() => setActiveSection('institution')} />
 <SectionTab label="Departments" active={activeSection === 'department'} onClick={() => setActiveSection('department')} />
 </div>

 {activeSection === 'sector' && (
 <section className="bg-white border border-border rounded-3xl p-6 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
 <input
 value={newSectorName}
 onChange={(e) => setNewSectorName(e.target.value)}
 className="md:col-span-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="Sector type name"
 />
 <input
 type="number"
 value={newSectorSortOrder}
 onChange={(e) => setNewSectorSortOrder(Number(e.target.value || 0))}
 className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="Sort order"
 />
 <button
 onClick={handleCreateSector}
 disabled={loading}
 className="rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-[0.12em] px-4 py-3 disabled:opacity-60"
 >
 Add Sector Type
 </button>
 </div>

 <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
 <input type="checkbox" checked={newSectorActive} onChange={(e) => setNewSectorActive(e.target.checked)} />
 Active by default
 </label>

 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black">
 <th className="pb-3">Name</th>
 <th className="pb-3">Order</th>
 <th className="pb-3">Status</th>
 <th className="pb-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {sectorTypeOptions.map((item) => (
 <tr key={item.id} className="text-sm">
 <td className="py-3 font-bold text-text-primary">{item.name}</td>
 <td className="py-3 text-text-secondary">{item.sort_order}</td>
 <td className="py-3">
 <span className={cn('inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', item.is_active ? 'bg-primary-light text-primary' : 'bg-surface text-text-muted')}>
 {item.is_active ? 'Active' : 'Inactive'}
 </span>
 </td>
 <td className="py-3 text-right space-x-2">
 <button onClick={() => setEditingSector({ ...item })} className="px-3 py-1.5 rounded-lg bg-surface text-xs font-bold">Edit</button>
 <button onClick={() => handleToggleSector(item)} className="px-3 py-1.5 rounded-lg bg-surface text-xs font-bold">
 {item.is_active ? 'Deactivate' : 'Activate'}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </section>
 )}

 {activeSection === 'institution' && (
 <section className="bg-white border border-border rounded-3xl p-6 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
 <select
 value={newInstitutionSectorId}
 onChange={(e) => setNewInstitutionSectorId(e.target.value)}
 className="md:col-span-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 >
 <option value="">Select sector type</option>
 {sectorTypeOptions.map((item) => (
 <option key={item.id} value={item.id}>{item.name}</option>
 ))}
 </select>
 <input
 value={newInstitutionName}
 onChange={(e) => setNewInstitutionName(e.target.value)}
 className="md:col-span-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="Institute name"
 />
 <input
 value={newInstitutionCity}
 onChange={(e) => setNewInstitutionCity(e.target.value)}
 className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="City"
 />
 <input
 value={newInstitutionProvince}
 onChange={(e) => setNewInstitutionProvince(e.target.value)}
 className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="Province/Region"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
 <input
 type="number"
 value={newInstitutionSortOrder}
 onChange={(e) => setNewInstitutionSortOrder(Number(e.target.value || 0))}
 className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="Sort order"
 />
 <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
 <input type="checkbox" checked={newInstitutionActive} onChange={(e) => setNewInstitutionActive(e.target.checked)} />
 Active by default
 </label>
 <button
 onClick={handleCreateInstitution}
 disabled={loading}
 className="rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-[0.12em] px-4 py-3 disabled:opacity-60"
 >
 Add Institute
 </button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black">
 <th className="pb-3">Institute</th>
 <th className="pb-3">Sector Type</th>
 <th className="pb-3">Location</th>
 <th className="pb-3">Order</th>
 <th className="pb-3">Status</th>
 <th className="pb-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {institutionOptions.map((item) => (
 <tr key={item.id} className="text-sm">
 <td className="py-3 font-bold text-text-primary">{item.name}</td>
 <td className="py-3 text-text-secondary">{item.sector_type?.name || '-'}</td>
 <td className="py-3 text-text-secondary">{[item.city, item.province_or_region].filter(Boolean).join(', ') || '-'}</td>
 <td className="py-3 text-text-secondary">{item.sort_order}</td>
 <td className="py-3">
 <span className={cn('inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', item.is_active ? 'bg-primary-light text-primary' : 'bg-surface text-text-muted')}>
 {item.is_active ? 'Active' : 'Inactive'}
 </span>
 </td>
 <td className="py-3 text-right space-x-2">
 <button onClick={() => setEditingInstitution({ ...item })} className="px-3 py-1.5 rounded-lg bg-surface text-xs font-bold">Edit</button>
 <button onClick={() => handleToggleInstitution(item)} className="px-3 py-1.5 rounded-lg bg-surface text-xs font-bold">
 {item.is_active ? 'Deactivate' : 'Activate'}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </section>
 )}

 {activeSection === 'department' && (
 <section className="bg-white border border-border rounded-3xl p-6 space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
 <select
 value={newDepartmentInstitutionId}
 onChange={(e) => setNewDepartmentInstitutionId(e.target.value)}
 className="md:col-span-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 >
 <option value="">Select institute</option>
 {institutionOptions.map((item) => (
 <option key={item.id} value={item.id}>{item.name}</option>
 ))}
 </select>
 <input
 value={newDepartmentName}
 onChange={(e) => setNewDepartmentName(e.target.value)}
 className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="Department name"
 />
 <input
 type="number"
 value={newDepartmentSortOrder}
 onChange={(e) => setNewDepartmentSortOrder(Number(e.target.value || 0))}
 className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="Sort order"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
 <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
 <input type="checkbox" checked={newDepartmentActive} onChange={(e) => setNewDepartmentActive(e.target.checked)} />
 Active by default
 </label>
 <button
 onClick={handleCreateDepartment}
 disabled={loading}
 className="rounded-xl bg-primary text-white text-sm font-bold uppercase tracking-[0.12em] px-4 py-3 disabled:opacity-60"
 >
 Add Department
 </button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black">
 <th className="pb-3">Department</th>
 <th className="pb-3">Institute</th>
 <th className="pb-3">Order</th>
 <th className="pb-3">Status</th>
 <th className="pb-3 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {departments
 .slice()
 .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
 .map((item) => (
 <tr key={item.id} className="text-sm">
 <td className="py-3 font-bold text-text-primary">{item.name}</td>
 <td className="py-3 text-text-secondary">{item.institution?.name || '-'}</td>
 <td className="py-3 text-text-secondary">{item.sort_order}</td>
 <td className="py-3">
 <span className={cn('inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', item.is_active ? 'bg-primary-light text-primary' : 'bg-surface text-text-muted')}>
 {item.is_active ? 'Active' : 'Inactive'}
 </span>
 </td>
 <td className="py-3 text-right space-x-2">
 <button onClick={() => setEditingDepartment({ ...item })} className="px-3 py-1.5 rounded-lg bg-surface text-xs font-bold">Edit</button>
 <button onClick={() => handleToggleDepartment(item)} className="px-3 py-1.5 rounded-lg bg-surface text-xs font-bold">
 {item.is_active ? 'Deactivate' : 'Activate'}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </section>
 )}

 {editingSector && (
 <ModalShell title="Edit Sector Type" onClose={() => setEditingSector(null)}>
 <div className="space-y-4">
 <input
 value={editingSector.name}
 onChange={(e) => setEditingSector((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 />
 <input
 type="number"
 value={editingSector.sort_order}
 onChange={(e) => setEditingSector((prev) => (prev ? { ...prev, sort_order: Number(e.target.value || 0) } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 />
 <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
 <input
 type="checkbox"
 checked={editingSector.is_active}
 onChange={(e) => setEditingSector((prev) => (prev ? { ...prev, is_active: e.target.checked } : prev))}
 />
 Active
 </label>
 <button onClick={handleSaveSector} disabled={loading} className="w-full rounded-xl bg-primary text-white py-3 text-sm font-bold uppercase tracking-[0.12em] disabled:opacity-60">
 Save Sector Type
 </button>
 </div>
 </ModalShell>
 )}

 {editingInstitution && (
 <ModalShell title="Edit Institute" onClose={() => setEditingInstitution(null)}>
 <div className="space-y-4">
 <select
 value={editingInstitution.sector_type_id}
 onChange={(e) => setEditingInstitution((prev) => (prev ? { ...prev, sector_type_id: e.target.value } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 >
 <option value="">Select sector type</option>
 {sectorTypeOptions.map((item) => (
 <option key={item.id} value={item.id}>{item.name}</option>
 ))}
 </select>
 <input
 value={editingInstitution.name}
 onChange={(e) => setEditingInstitution((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 />
 <input
 value={editingInstitution.city || ''}
 onChange={(e) => setEditingInstitution((prev) => (prev ? { ...prev, city: e.target.value } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="City"
 />
 <input
 value={editingInstitution.province_or_region || ''}
 onChange={(e) => setEditingInstitution((prev) => (prev ? { ...prev, province_or_region: e.target.value } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 placeholder="Province/Region"
 />
 <input
 type="number"
 value={editingInstitution.sort_order}
 onChange={(e) => setEditingInstitution((prev) => (prev ? { ...prev, sort_order: Number(e.target.value || 0) } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 />
 <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
 <input
 type="checkbox"
 checked={editingInstitution.is_active}
 onChange={(e) => setEditingInstitution((prev) => (prev ? { ...prev, is_active: e.target.checked } : prev))}
 />
 Active
 </label>
 <button onClick={handleSaveInstitution} disabled={loading} className="w-full rounded-xl bg-primary text-white py-3 text-sm font-bold uppercase tracking-[0.12em] disabled:opacity-60">
 Save Institute
 </button>
 </div>
 </ModalShell>
 )}

 {editingDepartment && (
 <ModalShell title="Edit Department" onClose={() => setEditingDepartment(null)}>
 <div className="space-y-4">
 <select
 value={editingDepartment.institution_id}
 onChange={(e) => setEditingDepartment((prev) => (prev ? { ...prev, institution_id: e.target.value } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 >
 <option value="">Select institute</option>
 {institutionOptions.map((item) => (
 <option key={item.id} value={item.id}>{item.name}</option>
 ))}
 </select>
 <input
 value={editingDepartment.name}
 onChange={(e) => setEditingDepartment((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 />
 <input
 type="number"
 value={editingDepartment.sort_order}
 onChange={(e) => setEditingDepartment((prev) => (prev ? { ...prev, sort_order: Number(e.target.value || 0) } : prev))}
 className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm"
 />
 <label className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary">
 <input
 type="checkbox"
 checked={editingDepartment.is_active}
 onChange={(e) => setEditingDepartment((prev) => (prev ? { ...prev, is_active: e.target.checked } : prev))}
 />
 Active
 </label>
 <button onClick={handleSaveDepartment} disabled={loading} className="w-full rounded-xl bg-primary text-white py-3 text-sm font-bold uppercase tracking-[0.12em] disabled:opacity-60">
 Save Department
 </button>
 </div>
 </ModalShell>
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

function SectionTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
 return (
 <button
 onClick={onClick}
 className={cn(
 'px-5 py-2 rounded-full text-sm font-bold transition-colors',
 active ? 'bg-primary text-white' : 'text-text-secondary hover:bg-white'
 )}
 >
 {label}
 </button>
 )
}

function ModalShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
 return (
 <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white border border-border rounded-3xl w-full max-w-xl p-6 space-y-5">
 <div className="flex items-center justify-between">
 <h3 className="text-2xl font-black text-text-primary tracking-tight">{title}</h3>
 <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-text-primary">
 <span className="material-symbols-outlined">close</span>
 </button>
 </div>
 {children}
 </div>
 </div>
 )
}
