import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing');
  }
  return new Resend(apiKey);
}

interface TransactionalEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Professional Transactional Email Wrapper
 * Used for marketplace notifications, approvals, and system alerts.
 * Bypasses Supabase Auth 3-email limit.
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  from = 'Allpanga <no-reply@allpanga.com>' // Verified domain: allpanga.com
}: TransactionalEmailOptions) {
  try {
    const resend = getResendClient()
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error('[Email Error] Failed to send email:', error);
    return { success: false, error };
  }
}
