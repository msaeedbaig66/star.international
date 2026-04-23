import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cloudinary } from '@/lib/cloudinary-server'
import { CATEGORIES, MAX_FILE_SIZE_MB } from '@/lib/constants'

// ─── Types ──────────────────────────────────────────────────────────────────
type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/webp'

// ─── Constants ──────────────────────────────────────────────────────────────
const ALLOWED_UPLOAD_CATEGORIES = new Set([
 'listings',
 'blogs',
 'communities',
 'avatars',
 'messages',
 'others',
 ...CATEGORIES.map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
])
// Server-side strict file size and type enforcement
const MIME_BY_EXTENSION: Record<string, SupportedMimeType> = {
 jpg: 'image/jpeg',
 jpeg: 'image/jpeg',
 png: 'image/png',
 webp: 'image/webp',
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function normalizeCategory(value: string) {
 return value
 .toLowerCase()
 .trim()
 .replace(/[^a-z0-9]+/g, '-')
 .replace(/^-+|-+$/g, '')
}

function normalizeMimeType(value: string) {
 const lowered = String(value || '').toLowerCase().trim()
 if (lowered === 'image/jpg') return 'image/jpeg'
 return lowered
}

function getFileExtension(filename: string) {
 const match = String(filename || '').toLowerCase().match(/\.([a-z0-9]+)$/)
 return match?.[1] || ''
}

function detectMimeType(buffer: Uint8Array): SupportedMimeType | null {
 if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
 return 'image/jpeg'
 }

 if (
 buffer.length >= 8 &&
 buffer[0] === 0x89 &&
 buffer[1] === 0x50 &&
 buffer[2] === 0x4e &&
 buffer[3] === 0x47 &&
 buffer[4] === 0x0d &&
 buffer[5] === 0x0a &&
 buffer[6] === 0x1a &&
 buffer[7] === 0x0a
 ) {
 return 'image/png'
 }

 if (
 buffer.length >= 12 &&
 buffer[0] === 0x52 &&
 buffer[1] === 0x49 &&
 buffer[2] === 0x46 &&
 buffer[3] === 0x46 &&
 buffer[8] === 0x57 &&
 buffer[9] === 0x45 &&
 buffer[10] === 0x42 &&
 buffer[11] === 0x50
 ) {
 return 'image/webp'
 }

 return null
}

// ─── Route Handler ──────────────────────────────────────────────────────────
export async function POST(request: Request) {
 try {
 const supabase = await createClient()
 
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 const formData = await request.formData()
 const file = formData.get('file') as File | null
 const rawCategory = String(formData.get('category') || 'listings')
 const category = normalizeCategory(rawCategory)

 if (!file) {
 return NextResponse.json({ error: 'No file provided' }, { status: 400 })
 }
 if (!ALLOWED_UPLOAD_CATEGORIES.has(category)) {
 return NextResponse.json({ error: 'Invalid upload category.' }, { status: 400 })
 }
 if (!file.size) {
 return NextResponse.json({ error: 'Empty files are not allowed.' }, { status: 400 })
 }
 const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024
 if (file.size > maxBytes) {
 return NextResponse.json({ error: `File size exceeds the ${MAX_FILE_SIZE_MB}MB limit.` }, { status: 400 })
 }
 const extension = getFileExtension(file.name)
 if (!Object.prototype.hasOwnProperty.call(MIME_BY_EXTENSION, extension)) {
 return NextResponse.json({ error: 'Unsupported file extension. Allowed: .jpg, .jpeg, .png, .webp.' }, { status: 400 })
 }

 const bytes = new Uint8Array(await file.arrayBuffer())
 const detectedMimeType = detectMimeType(bytes)
 if (!detectedMimeType) {
 return NextResponse.json({ error: 'Invalid file content. Only JPEG, PNG, and WEBP images are allowed.' }, { status: 400 })
 }
 const extensionMimeType = MIME_BY_EXTENSION[extension]
 if (detectedMimeType !== extensionMimeType) {
 return NextResponse.json({ error: 'File extension does not match file content.' }, { status: 400 })
 }

 const declaredMimeType = normalizeMimeType(file.type)
 if (declaredMimeType && declaredMimeType !== detectedMimeType) {
 return NextResponse.json({ error: 'Declared file type does not match file content.' }, { status: 400 })
 }

 // Upload to Cloudinary via shared server config
 return new Promise<NextResponse>((resolve) => {
 const uploadStream = cloudinary.uploader.upload_stream(
 {
 folder: `allpanga/${category}/${user.id}`,
 resource_type: 'image',
 },
 (error, result) => {
 if (error || !result) {
 console.error('Cloudinary upload error:', error)
 resolve(NextResponse.json({ error: 'Upload to Cloudinary failed.' }, { status: 500 }))
 } else {
 resolve(NextResponse.json({ 
 url: result.secure_url, 
 path: result.public_id 
 }, { status: 201 }))
 }
 }
 )
 uploadStream.end(Buffer.from(bytes))
 })
 } catch (error: any) {
 console.error('Upload Error:', error)
 return NextResponse.json({ error: 'Unexpected upload error.' }, { status: 500 })
 }
}
