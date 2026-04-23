import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const uuidSchema = z.string().uuid()

const createSectorSchema = z.object({
 entity_type: z.literal('sector_type'),
 name: z.string().trim().min(1).max(120),
 is_active: z.boolean().optional(),
 sort_order: z.coerce.number().int().min(0).max(10000).optional(),
})

const createInstitutionSchema = z.object({
 entity_type: z.literal('institution'),
 sector_type_id: uuidSchema,
 name: z.string().trim().min(1).max(160),
 city: z.string().trim().max(120).optional().nullable(),
 province_or_region: z.string().trim().max(120).optional().nullable(),
 is_active: z.boolean().optional(),
 sort_order: z.coerce.number().int().min(0).max(10000).optional(),
})

const createDepartmentSchema = z.object({
 entity_type: z.literal('department'),
 institution_id: uuidSchema,
 name: z.string().trim().min(1).max(160),
 is_active: z.boolean().optional(),
 sort_order: z.coerce.number().int().min(0).max(10000).optional(),
})

const createSchema = z.discriminatedUnion('entity_type', [
 createSectorSchema,
 createInstitutionSchema,
 createDepartmentSchema,
])

const patchSectorSchema = z.object({
 entity_type: z.literal('sector_type'),
 id: uuidSchema,
 name: z.string().trim().min(1).max(120).optional(),
 is_active: z.boolean().optional(),
 sort_order: z.coerce.number().int().min(0).max(10000).optional(),
})

const patchInstitutionSchema = z.object({
 entity_type: z.literal('institution'),
 id: uuidSchema,
 sector_type_id: uuidSchema.optional(),
 name: z.string().trim().min(1).max(160).optional(),
 city: z.string().trim().max(120).nullable().optional(),
 province_or_region: z.string().trim().max(120).nullable().optional(),
 is_active: z.boolean().optional(),
 sort_order: z.coerce.number().int().min(0).max(10000).optional(),
})

const patchDepartmentSchema = z.object({
 entity_type: z.literal('department'),
 id: uuidSchema,
 institution_id: uuidSchema.optional(),
 name: z.string().trim().min(1).max(160).optional(),
 is_active: z.boolean().optional(),
 sort_order: z.coerce.number().int().min(0).max(10000).optional(),
})

const patchSchema = z.discriminatedUnion('entity_type', [
 patchSectorSchema,
 patchInstitutionSchema,
 patchDepartmentSchema,
])

async function requireAdmin() {
 const authClient = await createClient()
 const {
 data: { user },
 } = await authClient.auth.getUser()
 if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

 const { data: profile } = await authClient
 .from('profiles')
 .select('role')
 .eq('id', user.id)
 .single()

 if (profile?.role !== 'admin') {
 return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
 }

 return { user, client: authClient }
}

function hasPatchPayload(data: Record<string, unknown>, keys: string[]) {
 return keys.some((key) => Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined)
}

export async function GET() {
 try {
 const adminGuard = await requireAdmin()
 if ('error' in adminGuard) return adminGuard.error

 const supabase = createAdminClient()

 const [{ data: sectorTypes, error: sectorError }, { data: institutions, error: instError }, { data: departments, error: deptError }] = await Promise.all([
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

 if (sectorError) throw sectorError
 if (instError) throw instError
 if (deptError) throw deptError

 return NextResponse.json({
 data: {
 sector_types: sectorTypes || [],
 institutions: institutions || [],
 departments: departments || [],
 },
 error: null,
 })
 } catch (error: any) {
 console.error('admin academic-structure GET failed:', error)
 return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 }
}

export async function POST(req: Request) {
 try {
 const adminGuard = await requireAdmin()
 if ('error' in adminGuard) return adminGuard.error

 const body = await req.json().catch(() => ({}))
 const parsed = createSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }

 const payload = parsed.data
 const supabase = createAdminClient()

 if (payload.entity_type === 'sector_type') {
 const { data, error } = await supabase
 .from('sector_types')
 .insert({
 name: payload.name,
 is_active: payload.is_active ?? true,
 sort_order: payload.sort_order ?? 0,
 updated_at: new Date().toISOString(),
 })
 .select('id, name, is_active, sort_order, created_at, updated_at')
 .single()

 if (error) throw error
 return NextResponse.json({ data, error: null }, { status: 201 })
 }

 if (payload.entity_type === 'institution') {
 const { data: sectorType } = await supabase
 .from('sector_types')
 .select('id')
 .eq('id', payload.sector_type_id)
 .maybeSingle()

 if (!sectorType) {
 return NextResponse.json({ error: 'Selected sector type does not exist' }, { status: 400 })
 }

 const { data, error } = await supabase
 .from('institutions')
 .insert({
 sector_type_id: payload.sector_type_id,
 name: payload.name,
 city: payload.city || null,
 province_or_region: payload.province_or_region || null,
 is_active: payload.is_active ?? true,
 sort_order: payload.sort_order ?? 0,
 updated_at: new Date().toISOString(),
 })
 .select('id, sector_type_id, name, city, province_or_region, is_active, sort_order, created_at, updated_at, sector_type:sector_types(id, name)')
 .single()

 if (error) throw error
 return NextResponse.json({ data, error: null }, { status: 201 })
 }

 const { data: institution } = await supabase
 .from('institutions')
 .select('id')
 .eq('id', payload.institution_id)
 .maybeSingle()

 if (!institution) {
 return NextResponse.json({ error: 'Selected institution does not exist' }, { status: 400 })
 }

 const { data, error } = await supabase
 .from('departments')
 .insert({
 institution_id: payload.institution_id,
 name: payload.name,
 is_active: payload.is_active ?? true,
 sort_order: payload.sort_order ?? 0,
 updated_at: new Date().toISOString(),
 })
 .select('id, institution_id, name, is_active, sort_order, created_at, updated_at, institution:institutions(id, name, sector_type_id)')
 .single()

 if (error) throw error

 return NextResponse.json({ data, error: null }, { status: 201 })
 } catch (error: any) {
 console.error('admin academic-structure POST failed:', error)
 return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
 }
}

export async function PATCH(req: Request) {
 try {
 const adminGuard = await requireAdmin()
 if ('error' in adminGuard) return adminGuard.error

 const body = await req.json().catch(() => ({}))
 const parsed = patchSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
 }

 const payload = parsed.data
 const supabase = createAdminClient()

 if (payload.entity_type === 'sector_type') {
 if (!hasPatchPayload(payload, ['name', 'is_active', 'sort_order'])) {
 return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 })
 }

 const { data, error } = await supabase
 .from('sector_types')
 .update({
 ...(payload.name !== undefined ? { name: payload.name } : {}),
 ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
 ...(payload.sort_order !== undefined ? { sort_order: payload.sort_order } : {}),
 updated_at: new Date().toISOString(),
 })
 .eq('id', payload.id)
 .select('id, name, is_active, sort_order, created_at, updated_at')
 .single()

 if (error) throw error
 return NextResponse.json({ data, error: null })
 }

 if (payload.entity_type === 'institution') {
 if (!hasPatchPayload(payload, ['sector_type_id', 'name', 'city', 'province_or_region', 'is_active', 'sort_order'])) {
 return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 })
 }

 if (payload.sector_type_id) {
 const { data: sectorType } = await supabase
 .from('sector_types')
 .select('id')
 .eq('id', payload.sector_type_id)
 .maybeSingle()

 if (!sectorType) {
 return NextResponse.json({ error: 'Selected sector type does not exist' }, { status: 400 })
 }
 }

 const { data, error } = await supabase
 .from('institutions')
 .update({
 ...(payload.sector_type_id !== undefined ? { sector_type_id: payload.sector_type_id } : {}),
 ...(payload.name !== undefined ? { name: payload.name } : {}),
 ...(payload.city !== undefined ? { city: payload.city || null } : {}),
 ...(payload.province_or_region !== undefined ? { province_or_region: payload.province_or_region || null } : {}),
 ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
 ...(payload.sort_order !== undefined ? { sort_order: payload.sort_order } : {}),
 updated_at: new Date().toISOString(),
 })
 .eq('id', payload.id)
 .select('id, sector_type_id, name, city, province_or_region, is_active, sort_order, created_at, updated_at, sector_type:sector_types(id, name)')
 .single()

 if (error) throw error
 return NextResponse.json({ data, error: null })
 }

 if (!hasPatchPayload(payload, ['institution_id', 'name', 'is_active', 'sort_order'])) {
 return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 })
 }

 if (payload.institution_id) {
 const { data: institution } = await supabase
 .from('institutions')
 .select('id')
 .eq('id', payload.institution_id)
 .maybeSingle()

 if (!institution) {
 return NextResponse.json({ error: 'Selected institution does not exist' }, { status: 400 })
 }
 }

 const { data, error } = await supabase
 .from('departments')
 .update({
 ...(payload.institution_id !== undefined ? { institution_id: payload.institution_id } : {}),
 ...(payload.name !== undefined ? { name: payload.name } : {}),
 ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
 ...(payload.sort_order !== undefined ? { sort_order: payload.sort_order } : {}),
 updated_at: new Date().toISOString(),
 })
 .eq('id', payload.id)
 .select('id, institution_id, name, is_active, sort_order, created_at, updated_at, institution:institutions(id, name, sector_type_id)')
 .single()

 if (error) throw error

 return NextResponse.json({ data, error: null })
 } catch (error: any) {
 console.error('admin academic-structure PATCH failed:', error)
 return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
 }
}
