function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function bucket() {
  return process.env.PCB_VIDEO_BUCKET || "pcb-videos";
}

function headers() {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

export function publicVideoUrl(objectPath: string): string {
  return `${required("SUPABASE_URL")}/storage/v1/object/public/${bucket()}/${objectPath}`;
}

export async function ensureVideoBucket(): Promise<void> {
  const res = await fetch(`${required("SUPABASE_URL")}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      id: bucket(),
      name: bucket(),
      public: true,
      file_size_limit: 52_428_800,
    }),
  });
  if (res.ok || res.status === 409) return;
  const text = await res.text();
  if (res.status === 400 && /already exists|duplicate/i.test(text)) return;
  throw new Error(`bucket ${res.status}: ${text.slice(0, 200)}`);
}

export async function uploadMp4(objectPath: string, body: Buffer): Promise<string> {
  await ensureVideoBucket();
  const res = await fetch(
    `${required("SUPABASE_URL")}/storage/v1/object/${bucket()}/${objectPath}`,
    {
      method: "POST",
      headers: {
        ...headers(),
        "Content-Type": "video/mp4",
        "x-upsert": "true",
      },
      body: new Uint8Array(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`upload ${res.status}: ${text.slice(0, 240)}`);
  }
  return publicVideoUrl(objectPath);
}
