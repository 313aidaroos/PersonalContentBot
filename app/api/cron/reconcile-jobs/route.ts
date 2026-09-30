import { NextResponse } from "next/server";
import { durableJobsEnabled, listStuckJobs, patchJob } from "@/lib/db";
import { release, reservationStatus, WalletError } from "@/lib/apixis-wallet";

export const dynamic = "force-dynamic";

/** A 60 s clip renders in well under 5 minutes; anything still "rendering" after this died. */
const STUCK_AFTER_MINUTES = 15;

/**
 * Reconcile jobs whose render died (function timeout, crash, lost connection):
 *   - hold still open   → release it (customer not charged), job → failed
 *   - hold captured     → the clip was delivered before the process died: job → ready is NOT safe
 *                         to assume (no render result), so keep the receipt and mark failed with a
 *                         note for support; a captured hold is never refunded here.
 *   - hold expired/released already → job → failed
 * Runs from vercel.json; needs PCB_DURABLE_JOBS=true and the columns from supabase/pcb_jobs_durable.sql.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!durableJobsEnabled()) return NextResponse.json({ skipped: true, reason: "PCB_DURABLE_JOBS is not true" });

  const stuck = await listStuckJobs(STUCK_AFTER_MINUTES);
  const results: { id: string; outcome: string }[] = [];

  for (const job of stuck) {
    let outcome = "failed_no_hold";
    const hold = job.wallet_reservation_id;
    try {
      if (hold) {
        const status = await reservationStatus(hold).catch(() => null);
        if (status?.status === "captured") {
          outcome = "failed_after_capture";
          await patchJob(job.id, {
            status: "failed",
            error: "Render did not finish after payment was captured. Support: the clip is owed, not a refund.",
            wallet_receipt_id: status.receiptId ?? job.wallet_receipt_id ?? null,
          });
          results.push({ id: job.id, outcome });
          continue;
        }
        if (status?.status === "held") {
          try {
            await release(hold);
            outcome = "released";
          } catch (err) {
            // already_captured cannot happen here (checked above); anything else is a Wallet outage — retry next run.
            if (err instanceof WalletError && err.code !== "already_released") throw err;
            outcome = "already_released";
          }
        } else {
          outcome = status ? `hold_${status.status}` : "hold_unknown";
        }
      }
      await patchJob(job.id, {
        status: "failed",
        error: "Render did not finish. You were not charged — try again.",
      });
    } catch (err) {
      outcome = `retry_later: ${err instanceof Error ? err.message : String(err)}`;
    }
    results.push({ id: job.id, outcome });
  }

  return NextResponse.json({ checked: stuck.length, results });
}
