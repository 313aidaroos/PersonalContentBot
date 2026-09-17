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
  // Never log or return the link: it is a login credential.
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const err = new Error("Login email is not configured yet. Please try again later.");
    (err as Error & { status?: number }).status = 503;
    throw err;
  }
  const { Resend } = await import("resend");
  await new Resend(key).emails.send({
    from: process.env.EMAIL_FROM || "Content Bot <contentbot@apixis.dev>",
    to: email,
    subject: "Your Content Bot sign-in link",
    text: `As-salamu alaykum,\n\nClick to sign in (valid for a limited time):\n${link}\n\nIf you did not request this, ignore this email.`,
  });
}
