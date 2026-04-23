import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { signupSchema } from '@/lib/validations/auth'

function toUsernameSeed(value: string) {
 return value
 .toLowerCase()
 .replace(/[^a-z0-9_]+/g, '_')
 .replace(/^_+|_+$/g, '')
 .slice(0, 24)
}

async function resolveUniqueUsername(
 supabase: Awaited<ReturnType<typeof createClient>>,
 base: string
) {
 const sanitizedBase = toUsernameSeed(base) || 'user'
 for (let i = 0; i < 40; i += 1) {
 const candidate = i === 0 ? sanitizedBase : `${sanitizedBase}_${i}`
 const { data, error } = await supabase
 .from('profiles')
 .select('id')
 .eq('username', candidate)
 .maybeSingle()

 if (error) {
 throw error
 }
 if (!data) {
 return candidate
 }
 }

 return `${sanitizedBase}_${Date.now().toString().slice(-4)}`
}

function resolveAuthRedirectUrl() {
 const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
 if (!envUrl) {
 throw new Error('NEXT_PUBLIC_APP_URL is not configured')
 }
 return `${envUrl.replace(/\/+$/, '')}/auth/callback`
}

export async function POST(req: Request) {
 try {
 const body = await req.json().catch(() => ({}))
 const parsed = signupSchema.safeParse(body)
 if (!parsed.success) {
 return NextResponse.json({ data: null, error: { message: parsed.error.issues[0].message } }, { status: 400 })
 }

 const {
 first_name,
 last_name,
 phone_number,
 email,
 sector_type_id,
 institution_id,
 department_id,
 password,
 } = parsed.data

 const normalizedFirstName = first_name.trim()
 const normalizedLastName = last_name.trim()
 const normalizedPhone = phone_number?.trim() || null
 const normalizedEmail = email.trim().toLowerCase()
 const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim()
 const emailRedirectTo = resolveAuthRedirectUrl()

 const supabase = await createClient()

 const [
 { data: sectorType }, 
 { data: institution }, 
 { data: department }
 ] = await Promise.all([
 supabase
 .from('sector_types')
 .select('id, name, is_active')
 .eq('id', sector_type_id)
 .eq('is_active', true)
 .maybeSingle(),
 supabase
 .from('institutions')
 .select('id, name, sector_type_id, is_active')
 .eq('id', institution_id)
 .eq('is_active', true)
 .maybeSingle(),
 supabase
 .from('departments')
 .select('id, name, institution_id, is_active')
 .eq('id', department_id)
 .eq('is_active', true)
 .maybeSingle(),
 ])

 if (!sectorType) {
 return NextResponse.json({ data: null, error: { message: 'Selected sector type is not available' } }, { status: 400 })
 }
 if (!institution) {
 return NextResponse.json({ data: null, error: { message: 'Selected university is not available' } }, { status: 400 })
 }
 if (!department) {
 return NextResponse.json({ data: null, error: { message: 'Selected department is not available' } }, { status: 400 })
 }

 if (institution.sector_type_id !== sectorType.id) {
 return NextResponse.json({ data: null, error: { message: 'University does not belong to selected sector type' } }, { status: 400 })
 }
 
 // Cross-check department relationship
 if (department.institution_id !== institution.id) {
 return NextResponse.json({ data: null, error: { message: 'Department does not belong to selected university' } }, { status: 400 })
 }

 const username = await resolveUniqueUsername(supabase, `${normalizedFirstName}_${normalizedLastName}` || email.split('@')[0])

 const { error: authError } = await supabase.auth.signUp({
 email: normalizedEmail,
 password,
 options: {
 data: {
 username,
 full_name: fullName,
 first_name: normalizedFirstName,
 last_name: normalizedLastName,
 phone_number: normalizedPhone,
 sector_type_id: sectorType.id,
 institution_id: institution.id,
 department_id: department.id,
 institution_name: institution.name,
 department_name: department.name,
 },
 emailRedirectTo,
 },
 })

 if (authError) {
 const lowered = (authError.message || '').toLowerCase()
 if (lowered.includes('already registered') || lowered.includes('already been registered')) {
 await supabase.auth.resend({
 type: 'signup',
 email: normalizedEmail,
 options: { emailRedirectTo },
 }).catch(() => null)

 return NextResponse.json(
 { data: { message: 'If your account is unverified, a new verification email has been sent.' }, error: null },
 { status: 200 }
 )
 }
 return NextResponse.json({ data: null, error: { message: 'Failed to create account. Please try a different email.' } }, { status: 400 })
 }

 return NextResponse.json({ data: { message: 'Verification email sent' }, error: null }, { status: 201 })
 } catch (err: unknown) {
 console.error('Signup Internal Error:', err)
 return NextResponse.json({ data: null, error: { message: 'An internal server error occurred' } }, { status: 500 })
 }
}
