export const ADMIN_EMAIL = "awad@apixis.dev";

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}
