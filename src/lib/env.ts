/**
 * Environment Variable Validation
 * This file ensures that required environment variables are present at startup.
 * We distinguish between CRITICAL (must throw) and RECOMMENDED (warn but allow start).
 */

const CRITICAL_ENVS = [
 'NEXT_PUBLIC_SUPABASE_URL',
 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
 'NEXT_PUBLIC_APP_URL',
];

// Add server-only critical variables
if (typeof window === 'undefined') {
 CRITICAL_ENVS.push('SUPABASE_SERVICE_ROLE_KEY');
}

const RECOMMENDED_ENVS = [
 'UPSTASH_REDIS_REST_URL',
 'UPSTASH_REDIS_REST_TOKEN',
 'RESEND_API_KEY',
 'CLOUDINARY_CLOUD_NAME',
 'CLOUDINARY_API_KEY',
 'CLOUDINARY_API_SECRET',
 'NEXT_PUBLIC_SENTRY_DSN',
 'ADMIN_PANEL_PASSCODE',
];

const missingCritical: string[] = [];
const missingRecommended: string[] = [];

for (const env of CRITICAL_ENVS) {
 if (!process.env[env]?.trim()) {
 missingCritical.push(env);
 }
}

for (const env of RECOMMENDED_ENVS) {
 if (!process.env[env]?.trim()) {
 missingRecommended.push(env);
 }
}

if (missingCritical.length > 0) {
 throw new Error(
 `❌ CRITICAL STARTUP ERROR: Missing required environment variables:\n- ${missingCritical.join(
 '\n- '
 )}\n\nPlease check your .env file.`
 );
}

if (typeof window === 'undefined' && missingRecommended.length > 0) {
 console.warn(
 `⚠️ WARNING: Missing recommended environment variables:\n- ${missingRecommended.join(
 '\n- '
 )}\nSome features (Rate Limiting, Emails, Uploads) may be degraded.`
 );
}

export {};
