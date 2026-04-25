import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { escapeHtml } from '@/lib/utils/html-escape'

/**
 * Notifications Digest Cron
 * Runs every 6 hours to batch unread notifications into a single email.
 * This saves Resend quota (100/day limit) and avoids notification fatigue.
 */
export async function GET(request: Request) {
  // 1. Verify cron secret (Professional security)
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Admin client initialization failed' }, { status: 500 })
  }

  try {
    // 2. Find all unread and un-emailed notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id, type, message')
      .eq('is_read', false)
      .is('emailed_at', null)
      .order('created_at', { ascending: false })

    if (fetchError) throw fetchError
    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No new notifications to digest.' })
    }

    // 3. Group by user
    const userGroups = notifications.reduce((acc, n) => {
      if (!acc[n.user_id]) acc[n.user_id] = []
      acc[n.user_id].push(n)
      return acc
    }, {} as Record<string, any[]>)

    let emailsSent = 0
    const processedNotificationIds: string[] = []

    // 4. Send digest for each user
    for (const [userId, userNotifications] of Object.entries(userGroups)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      if (!profile?.email) continue

      const count = userNotifications.length
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0ea5e9; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px;">New Activity on Allpanga!</h2>
          <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${escapeHtml(profile.full_name || 'Student')}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.6;">
            You have received <strong>${count}</strong> new notification${count > 1 ? 's' : ''} while you were away.
          </p>
          <div style="margin: 25px 0; padding: 20px; background: #f8fafc; border-left: 4px solid #0ea5e9; border-radius: 8px;">
            ${userNotifications.slice(0, 5).map(n => `<p style="margin: 8px 0; font-size: 15px; color: #475569;">• ${escapeHtml(n.message)}</p>`).join('')}
            ${count > 5 ? `<p style="margin: 10px 0 0 0; font-size: 14px; font-style: italic; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">...and ${count - 5} more notifications</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/notifications" 
               style="display: inline-block; padding: 14px 32px; background: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              View All Notifications
            </a>
          </div>
          <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
            You're receiving this because you have unread notifications on Allpanga.<br/>
            This is an automated digest sent every 6 hours to keep your inbox clean.
          </p>
        </div>
      `

      const { error: emailError } = await sendTransactionalEmail({
        to: profile.email,
        subject: `[Allpanga] ${count} new notification${count > 1 ? 's' : ''}`,
        html: emailHtml
      })

      if (!emailError) {
        emailsSent++
        processedNotificationIds.push(...userNotifications.map(n => n.id))
      }
    }

    // 5. Mark as emailed
    if (processedNotificationIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ emailed_at: new Date().toISOString() })
        .in('id', processedNotificationIds)
    }

    return NextResponse.json({ 
      success: true, 
      emails_sent: emailsSent,
      notifications_processed: processedNotificationIds.length 
    })

  } catch (error: any) {
    console.error('Notification Digest Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
