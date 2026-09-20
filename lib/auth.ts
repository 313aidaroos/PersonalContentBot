import crypto from "crypto";

const TOKEN_SECRET = process.env.MAGIC_TOKEN_SECRET || "dev-secret-change-in-prod";
const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export function generateMagicToken(email: string, expiryMs: number = TOKEN_EXPIRY_MS): string {
  const timestamp = Date.now();
  const expiryTime = timestamp + expiryMs;
  const payload = `${email}|${expiryTime}`;
  const hash = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}|${hash}`;
}

export function verifyMagicToken(token: string, email: string): boolean {
  try {
    const parts = token.split("|");
    if (parts.length !== 3) return false;

    const [tokenEmail, expiryStr, providedHash] = parts;
    if (tokenEmail !== email) return false;

    const expiryTime = parseInt(expiryStr, 10);
    if (isNaN(expiryTime) || expiryTime < Date.now()) return false;

    const payload = `${tokenEmail}|${expiryStr}`;
    const expectedHash = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}

export async function sendMagicLink(email: string, token: string, origin: string): Promise<void> {
  const link = `${origin}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  // In production, use a real email service (SendGrid, AWS SES, etc.)
  console.log(`[DEV] Magic link for ${email}: ${link}`);
}
