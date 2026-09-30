// Change note (Claude, Sep 2026): Removed `queueAndRun` (unpaid path that skipped the Wallet). See docs/LAUNCH_NOTES.md.
import { insertJob, patchJob } from "./db";
import { generateScriptWithSource } from "./script";
import { renderJobMp4 } from "./render";
import { redeem, buyIxisUrl } from "./apixis-wallet";
import type { Job, Orientation, Storyboard } from "./types";

/**
 * Thrown from inside provision() when the clip was made from the built-in template script
 * (Anthropic unavailable). redeem() treats any provision error as "release the hold", so the
 * customer is NOT charged; queueAndRunWithPayment catches it and still returns the finished clip.
 */
class DeliveredWithoutCharge extends Error {
  job: Job;
  constructor(job: Job) {
    super("template-script fallback: hold released, clip delivered free");
    this.name = "DeliveredWithoutCharge";
    this.job = job;
  }
}

export const FALLBACK_BILLING_NOTE =
  "Our AI script writer was unavailable, so this clip uses the built-in template script. You were not charged.";

function storyboardFrom(job: Job): Storyboard {
  const script = job.script;
  if (!script) throw new Error("script missing");
  const vertical = job.orientation !== "horizontal";
  const all = [script.hook, ...script.beats, script.cta];
  return {
    aspect: vertical ? "9:16" : "16:9",
    width: vertical ? 1080 : 1920,
    height: vertical ? 1920 : 1080,
    durationSec: job.duration_sec,
    safeZones: {
      captions: "Keep captions in the middle 40–75% of frame height (above platform UI).",
      faces: "Keep faces in the upper 60%. Never cover with stickers or CTA bars.",
    },
    frames: all.map((b) => ({
      t: b.start,
      caption: b.onScreen,
      visual: b.visual,
    })),
  };
}

/**
 * Queue and run a video job with Ixis payment (reserve → render → capture/release)
 *
 * If the AI script writer is unavailable and the built-in template is used, the hold is
 * RELEASED (not captured) and the clip is still delivered, marked render.billing.charged=false.
 *
 * attemptId: client-generated UUID per button click (retry of same click reuses it)
 */
export async function queueAndRunWithPayment(input: {
  idea: string;
  niche?: string;
  orientation?: Orientation;
  ownerEmail: string;
  /** Wallet identity is separate from the email used to own local job records. */
  walletOwner?: string;
  attemptId: string;
}): Promise<Job> {
  const idea = input.idea.trim();
  if (idea.length < 3) throw new Error("Idea is too short");
  if (idea.length > 280) throw new Error("Idea is too long");

  // Idempotency key: stable per attempt, <80 chars, no email
  const idempotencyKey = `contentbot-${input.attemptId}`;

  const result = await redeem({
    owner: input.walletOwner ?? input.ownerEmail,
    productKey: "contentbot.clip",
    idempotencyKey,
    provision: async () => {
      let job = await insertJob({
        owner_email: input.ownerEmail.toLowerCase(),
        idea,
        niche: input.niche?.trim() || null,
        orientation: input.orientation === "horizontal" ? "horizontal" : "vertical",
        duration_sec: 60,
      });

      let usedTemplate = false;
      try {
        job = await patchJob(job.id, { status: "scripting" });
        const outcome = await generateScriptWithSource(job.idea, job.niche, job.orientation);
        const script = outcome.script;
        if (outcome.source === "template") {
          usedTemplate = true;
          // Raw reason stays in server logs only.
          console.warn(`pcb job ${job.id}: script fallback to template (${outcome.fallbackReason ?? "unknown"}); releasing Wallet hold`);
        }
        job = await patchJob(job.id, { status: "rendering", script });

        const storyboard = storyboardFrom({ ...job, script });
        job = await patchJob(job.id, { storyboard });
        const render = await renderJobMp4({ ...job, script, storyboard });
        if (render.fallbackReason) {
          console.warn(`pcb job ${job.id}: xAI hero clip skipped (${render.fallbackReason})`);
        }
        job = await patchJob(job.id, {
          status: "ready",
          storyboard,
          render: usedTemplate
            ? { ...render, billing: { charged: false, reason: "script_fallback", note: FALLBACK_BILLING_NOTE } }
            : render,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await patchJob(job.id, { status: "failed", error: message });
        throw err;
      }
      // Outside the try above so the finished job is not marked failed. Throwing here makes
      // redeem() release the hold instead of capturing it (lib/apixis-wallet.ts is unchanged).
      if (usedTemplate) throw new DeliveredWithoutCharge(job);
      return job;
    },
    unprovision: async (reservation, job) => {
      // Capture failed after job was created: delete the job row
      // (In a real system with user-visible history, mark as "unpaid" instead)
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/pcb_jobs?id=eq.${job.id}`, {
        method: "DELETE",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
      });
    },
  }).catch((err: unknown) => {
    // Template fallback: redeem() already released the hold. Hand back the free clip.
    if (err instanceof DeliveredWithoutCharge) return { ok: true as const, receiptId: null, result: err.job };
    throw err;
  });

  if (!result.ok) {
    const buyUrl = buyIxisUrl("contentbot", "https://personalcontentbot.vercel.app");
    throw new Error(
      `Not enough Ixis. You need ${result.needed} Ixis ($${(result.needed / 100).toFixed(2)}). Buy Ixis at ${buyUrl}`
    );
  }

  return result.result;
}
