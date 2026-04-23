import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ADMIN_PASSCODE = process.env.ADMIN_PANEL_PASSCODE

if (typeof window === 'undefined' && !ADMIN_PASSCODE) {
 console.warn('⚠️ ADMIN_PANEL_PASSCODE is not set. Admin panel access will be disabled until configured.')
}

export async function POST(req: Request) {
 try {
 const { passcode } = await req.json()

 if (!ADMIN_PASSCODE) {
 return NextResponse.json({ error: 'Admin panel is not configured' }, { status: 503 })
 }
 
 if (passcode === ADMIN_PASSCODE) {
 // Set a secure HTTP-only cookie for the admin session
 // This is much more secure than sessionStorage
 cookies().set('admin_unlocked', 'true', {
 httpOnly: true,
 secure: process.env.NODE_ENV === 'production',
 sameSite: 'lax',
 maxAge: 60 * 60 * 24, // 24 hours
 path: '/',
 })

 return NextResponse.json({ success: true })
 }

 return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
 } catch (error) {
 return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 }
}

export async function DELETE() {
 cookies().delete('admin_unlocked')
 return NextResponse.json({ success: true })
}
