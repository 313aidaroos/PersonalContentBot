import { randomUUID } from 'node:crypto';
import {
  createJob, failStep, finishStep, getJob, getStepOutput,
  logToDb, setJobStatus, startStep,
} from '../db/index.js';
import { runIdeation } from './ideation.js';
import { runScriptwriter } from './scriptwriter.js';
import { runVideoGeneration } from './video.js';
import { runAssembly } from './assembly.js';
import { runPoster } from './poster.js';
import { createLogger } from '../logger.js';
import type {
  AssemblyResult, Clip, Idea, Orientation, Platform, PostResult, Script, StepName,
} from '../types.js';

const log = createLogger('orchestrator');

export interface PipelineOptions {
  jobId?: string;
  seed?: string | null;
  trending?: boolean;
  niche?: string;
  orientation?: Orientation;
  platforms?: Platform[];
  durationTarget?: number;
  scheduledFor?: string | null;
}

/**
 * Each step writes its output to the DB before the next one starts, so a rerun
 * with the same job id resumes from the first step that has not completed
 * rather than regenerating (and re-paying for) everything upstream.
 */
async function step<T>(jobId: string, name: StepName, fn: () => Promise<T>): Promise<T> {
  const cached = getStepOutput<T>(jobId, name);
  if (cached) {
    log.info(`${name}: reusing checkpoint`);
    return cached;
  }

  startStep(jobId, name);
  try {
    const result = await fn();
    finishStep(jobId, name, result);
    return result;
  } catch (err) {
    failStep(jobId, name, err);
    logToDb(jobId, 'error', name, 'step failed', err);
    throw err;
  }
}

export async function runPipeline(opts: PipelineOptions): Promise<{
  jobId: string;
  idea: Idea;
  assembly: AssemblyResult;
  posts: PostResult[];
}> {
  const orientation = opts.orientation ?? 'vertical';
  const platforms = opts.platforms ?? [];
  const jobId = opts.jobId ?? randomUUID();

  if (!getJob(jobId)) {
    createJob({
      id: jobId,
      seed: opts.seed ?? null,
      orientation,
      platforms,
      scheduledFor: opts.scheduledFor ?? null,
    });
  }

  log.info(`job ${jobId} starting (${orientation}, ${platforms.join(', ') || 'no platforms'})`);

  try {
    setJobStatus(jobId, 'ideation');
    const idea = await step(jobId, 'ideation', () =>
      runIdeation({
        seed: opts.seed,
        useTrending: opts.trending,
        niche: opts.niche,
        durationTarget: opts.durationTarget,
      }),
    );

    setJobStatus(jobId, 'scripting');
    const script = await step(jobId, 'scriptwriter', () => runScriptwriter(idea, orientation));

    setJobStatus(jobId, 'generating');
    const clips = await step<Clip[]>(jobId, 'video', () =>
      runVideoGeneration(jobId, script.scenes, orientation),
    );

    setJobStatus(jobId, 'assembling');
    const assembly = await step(jobId, 'assembly', () =>
      runAssembly(jobId, idea, script, clips, orientation),
    );

    setJobStatus(jobId, 'posting');
    const posts = await step<PostResult[]>(jobId, 'poster', () =>
      runPoster(jobId, idea, script, assembly, platforms),
    );

    const anyFailed = posts.some(p => !p.ok);
    setJobStatus(jobId, 'done', anyFailed ? 'One or more platforms failed; see posts table' : null);
    log.info(`job ${jobId} complete`);

    return { jobId, idea, assembly, posts };
  } catch (err) {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    setJobStatus(jobId, 'failed', message);
    log.error(`job ${jobId} failed`, err);
    throw err;
  }
}
