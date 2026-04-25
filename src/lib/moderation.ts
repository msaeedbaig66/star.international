/**
 * Professional Moderation System
 * Layer 1: Static Keyword Filter (Free Forever)
 * Layer 2: Gemini 1.5 Flash AI (Free Tier)
 */

const BANNED_WORDS = [
  'casino', 'gambling', 'betting', 'poker', 'slots',
  'porn', 'sex', 'sexy', 'xxx', 'adult',
  'crypto', 'bitcoin', 'eth', 'solana', 'pump',
  'fast money', 'get rich', 'earn daily', 'investment plan',
  'cheap drug', 'pharmacy', 'viagra',
  'whatsapp group', 'telegram link', 'dm for details'
];

const BANNED_DOMAINS = [
  '.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.work'
];

export interface ModerationResult {
  status: 'approved' | 'pending';
  reason: string;
}

/**
 * Layer 1: Static Filter (High Speed, No Cost)
 */
function runStaticFilter(content: string): ModerationResult | null {
  const lowerContent = content.toLowerCase();

  // Check for banned words
  for (const word of BANNED_WORDS) {
    if (lowerContent.includes(word)) {
      return { status: 'pending', reason: `Filter: Banned keyword found ("${word}")` };
    }
  }

  // Check for suspicious domains in links
  for (const domain of BANNED_DOMAINS) {
    if (lowerContent.includes(domain)) {
      return { status: 'pending', reason: `Filter: Suspicious domain found ("${domain}")` };
    }
  }

  return null;
}

/**
 * Layer 2: Gemini AI (Semantic Understanding, Free Tier)
 */
async function runAiModeration(content: string): Promise<ModerationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not found. Skipping AI moderation.');
    return null;
  }

  try {
    const prompt = `
      You are a professional content moderator for a student community platform. 
      Analyze the following text and determine if it is:
      1. SPAM (scams, links to suspicious sites, bots).
      2. INAPPROPRIATE (hate speech, adult content, harassment).
      3. SAFE (legitimate student discussion, marketplace item, or blog).

      Return ONLY a JSON object: {"is_safe": boolean, "reason": "short explanation if unsafe"}.

      Text to analyze:
      """
      ${content.substring(0, 5000)}
      """
    `.trim();

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    if (!response.ok) throw new Error('Gemini API Error');

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = JSON.parse(resultText);

    if (!result.is_safe) {
      return { status: 'pending', reason: `AI: ${result.reason}` };
    }

    return { status: 'approved', reason: 'AI: Passed safety check' };
  } catch (error) {
    console.error('AI Moderation failed:', error);
    return null; // Fallback to manual moderation if AI fails
  }
}

/**
 * Main entry point for moderation
 */
export async function performModeration(title: string, body: string): Promise<ModerationResult> {
  const fullContent = `${title}\n\n${body}`;

  // 1. Try static filter first
  const filterResult = runStaticFilter(fullContent);
  if (filterResult) return filterResult;

  // 2. Try AI moderation
  const aiResult = await runAiModeration(fullContent);
  if (aiResult) return aiResult;

  // 3. Fallback: Default to pending for safety if AI is skipped or fails
  return { status: 'pending', reason: 'Admin: Awaiting manual review' };
}
