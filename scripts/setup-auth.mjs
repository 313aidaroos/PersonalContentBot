// Appends PersonalContentBot redirect URLs to Supabase Auth allow list. Leaves site_url alone (shared project).
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = "myfclypikkcvfurkbzmj";
if (!TOKEN) { console.error("SUPABASE_ACCESS_TOKEN missing"); process.exit(1); }
const h = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const cur = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, { headers: h })).json();
const existing = String(cur.uri_allow_list || "").split(",").map((s) => s.trim()).filter(Boolean);
const add = [
  "https://personalcontentbot.vercel.app/auth/callback",
  "https://personalcontentbot.vercel.app/**",
  "https://*-313aidaroos-projects.vercel.app/auth/callback",
  "http://localhost:3000/auth/callback",
];
const merged = Array.from(new Set([...existing, ...add]));
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  method: "PATCH", headers: h, body: JSON.stringify({ uri_allow_list: merged.join(",") }),
});
console.log("patch", res.status);
const after = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, { headers: h })).json();
console.log("allow list:", after.uri_allow_list);
console.log("rate_limit_email_sent/hour:", after.rate_limit_email_sent, "smtp_host:", after.smtp_host);
