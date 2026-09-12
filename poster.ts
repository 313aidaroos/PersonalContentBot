import { config } from '../config.js';
import { ADAPTERS, needsPublicUrl } from '../platforms/index.js';
import { generatePlatformCopy } from '../platforms/copy.js';
import { uploadPublic } from '../services/uploader.js';
import { alreadyPosted, completePost, countPostsInLastHour, recordPost } from '../db/index.js';
import { HourlyLimiter } from '../lib/queue.js';
import { sleep } from '../lib/retry.js';
import { assertSafe } from '../lib/moderation.js';
import { createLogger } from '../logger.js';
import type { AssemblyResult, Idea, Platform, PostResult, Script } from '../types.js';

const log = createLogger('agent:poster');

/**
 * Posts sequentially with a stagger between platforms. Identical uploads fired
 * simultaneously across networks is exactly the pattern spam classifiers look
 * for, so the gap is deliberate, not incidental.
 */
export async function runPoster(
  jobId: string,
  idea: Idea,
  script: Script,
  assembly: AssemblyResult,
  platforms: Platform[],
): Promise<PostResult[]> {
  const active = platforms.filter(p => {
    const adapter = ADAPTERS[p];
    if (!adapter) { log.warn(`unknown platform ${p}, skipping`); return false; }
    if (!adapter.configured()) { log.warn(`${p} is not configured, skipping`); return false; }
    return true;
  });

  if (!active.length) {
    log.warn('no configured platforms — nothing to post');
    return [];
  }

  const copy = await generatePlatformCopy(idea, script, active);
  for (const p of active) {
    await assertSafe(`${copy[p].title}\n${copy[p].description}`, `${p} caption`);
    recordPost(jobId, p, copy[p]);
  }

  let publicUrl: string | null = null;
  if (needsPublicUrl(active)) {
    publicUrl = await uploadPublic(assembly.videoPath, jobId);
  }

  const limiter = new HourlyLimiter(config.MAX_POSTS_PER_HOUR_PER_PLATFORM, countPostsInLastHour);
  const results: PostResult[] = [];

  for (const [i, platform] of active.entries()) {
    if (alreadyPosted(jobId, platform)) {
      log.info(`${platform}: already posted, skipping`);
      continue;
    }

    const { allowed, used, max } = limiter.check(platform);
    if (!allowed) {
      const result: PostResult = { platform, ok: false, error: `Hourly limit reached (${used}/${max})` };
      completePost(jobId, result);
      results.push(result);
      log.warn(`${platform}: ${result.error}`);
      continue;
    }

    const adapter = ADAPTERS[platform];
    if (adapter.requiresPublicUrl && !publicUrl) {
      const result: PostResult = { platform, ok: false, error: 'Requires a hosted video URL; PUBLIC_UPLOAD_PROVIDER is not configured' };
      completePost(jobId, result);
      results.push(result);
      continue;
    }

    if (config.DRY_RUN) {
      log.info(`[dry run] would post to ${platform}: ${copy[platform].title}`);
      results.push({ platform, ok: true, postUrl: 'dry-run' });
      continue;
    }

    try {
      log.info(`posting to ${platform}`);
      const result = await adapter.publish({
        videoPath: assembly.videoPath,
        publicVideoUrl: publicUrl,
        thumbnailPath: assembly.thumbnailPath,
        copy: copy[platform],
        durationSec: assembly.durationSec,
      });
      completePost(jobId, result);
      results.push(result);
      log.info(`${platform} → ${result.postUrl ?? result.remoteId}`);
    } catch (err) {
      const result: PostResult = {
        platform, ok: false,
        error: err instanceof Error ? (err.stack ?? err.message) : String(err),
      };
      completePost(jobId, result);
      results.push(result);
      // One platform failing must not abort the rest of the distribution.
      log.error(`${platform} failed`, err);
    }

    if (i < active.length - 1) {
      const gapMs = config.POST_STAGGER_MINUTES * 60_000;
      log.info(`waiting ${config.POST_STAGGER_MINUTES}m before the next platform`);
      await sleep(gapMs);
    }
  }

  return results;
}
