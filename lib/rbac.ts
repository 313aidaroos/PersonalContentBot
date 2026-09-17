export const OWNER_EMAIL = "awad@apixis.dev";
export const SUPPORT_EMAIL = "contentbot@apixis.dev";

export function isOwner(email: string | null): boolean {
  return email === OWNER_EMAIL;
}

export function isSupport(email: string | null): boolean {
  return email === SUPPORT_EMAIL || email === OWNER_EMAIL;
}

export function getRole(email: string | null): "owner" | "support" | "user" | null {
  if (!email) return null;
  if (email === OWNER_EMAIL) return "owner";
  if (email === SUPPORT_EMAIL) return "support";
  return "user";
}
