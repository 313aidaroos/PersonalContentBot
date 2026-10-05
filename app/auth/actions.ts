"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Magic link: the default way in. `next` is where the user was headed; kept same-origin only. */
export async function magicLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  
  if (!email.includes("@")) return { message: "Enter your email." };
  
  const supabase = await createClient();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://personalcontentbot.vercel.app";
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // 2026-10-04 (Grok): existing accounts only; new accounts use Apixis ID
      emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(`/set-password?next=${encodeURIComponent(next)}`)}`,
    },
  });
  
  if (error) {
    if (/signups? not allowed|otp_disabled|user not found/i.test(`${error.code ?? ""} ${error.message}`)) {
      return { message: "No account uses this email yet. New here? Use Sign in with Apixis to create your account." };
    }
    return { message: error.message };
  }
  
  return { 
    message: `Check ${email} — the sign-in link is on its way.` 
  };
}

/** Password sign-in (secondary option) */
export async function passwordLogin(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) return { message: error.message };
  
  redirect(next);
}

/** Called from /set-password after a magic-link sign-in. */
export async function setPassword(form: FormData) {
  const password = String(form.get("password") ?? "");
  const rawNext = String(form.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  
  if (password.length < 8) return { message: "Password must be at least 8 characters." };
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { message: "Your sign-in link expired. Request a new one." };
  
  const { error } = await supabase.auth.updateUser({ 
    password, 
    data: { password_set: true } 
  });
  
  if (error) return { message: error.message };
  
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}
