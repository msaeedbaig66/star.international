import { createAdminClient } from '@/lib/supabase/admin'
import { AcademicStructureManager } from '@/components/admin/academic-structure-manager'

export default async function AdminAcademicStructurePage() {
  const supabase = createAdminClient()
  if (!supabase) return <div>Missing Admin Client Configuration</div>

  let sectorTypes: any[] = []
  let institutions: any[] = []
  let departments: any[] = []

  try {
    const [{ data: sectorData }, { data: institutionData }, { data: departmentData }] = await Promise.all([
      supabase
        .from('sector_types')
        .select('id, name, is_active, sort_order, created_at, updated_at')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('institutions')
        .select('id, sector_type_id, name, city, province_or_region, is_active, sort_order, created_at, updated_at, sector_type:sector_types(id, name)')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('departments')
        .select('id, institution_id, name, is_active, sort_order, created_at, updated_at, institution:institutions(id, name, sector_type_id)')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
    ])

    sectorTypes = sectorData || []
    institutions = (institutionData || []).map((row: any) => ({
      ...row,
      sector_type: Array.isArray(row.sector_type) ? row.sector_type[0] || null : row.sector_type,
    }))
    departments = (departmentData || []).map((row: any) => ({
      ...row,
      institution: Array.isArray(row.institution) ? row.institution[0] || null : row.institution,
    }))
  } catch (error) {
    console.error('Failed to load academic structure admin data:', error)
  }

  return (
    <AcademicStructureManager
      initialSectorTypes={sectorTypes}
      initialInstitutions={institutions}
      initialDepartments={departments}
    />
  )
}
