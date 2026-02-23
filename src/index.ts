import db from "./db";

type JobHandler<T = any> = (payload: T) => Promise<void> | void;

type JobOptions = {
  retries?: number;
  backoffMs?: number;
};

type EnqueueOptions = {
  delay?: number | string;
};

type JobDefinition = {
  handler: JobHandler;
  options: Required<JobOptions>;
};

type JobRow = {
  id: number;
  name: string;
  payload: string;
  attempts: number;
  runAt: number;
  status: string;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
};

const registry = new Map<string, JobDefinition>();

let isWorkerRunning = false;
let concurrency = 1;
let activeCount = 0;
let isShuttingDown = false;

/**
 * Register a job
 */
export function job<T = any>(
  name: string,
  handler: JobHandler<T>,
  options: JobOptions = {},
) {
  if (registry.has(name)) {
    throw new Error(`Job "${name}" is already registered`);
  }

  registry.set(name, {
    handler,
    options: {
      retries: options.retries ?? 0,
      backoffMs: options.backoffMs ?? 1000,
    },
  });

  startWorker();
}

/**
 * Enqueue job (persistent)
 */
export async function enqueue<T = any>(
  name: string,
  payload: T,
  options: EnqueueOptions = {},
) {
  if (!registry.has(name)) {
    throw new Error(`Job "${name}" is not registered`);
  }

  const delayMs = parseDelay(options.delay);

  db.prepare(
    `INSERT INTO jobs (name, payload, attempts, runAt, status)
   VALUES (?, ?, ?, ?, 'queued')`,
  ).run(name, JSON.stringify(payload), 0, Date.now() + delayMs);
}

/**
 * Configure
 */
export function configure(options: { concurrency?: number }) {
  if (options.concurrency && options.concurrency > 0) {
    concurrency = options.concurrency;
  }
}

/**
 * Worker
 */
function startWorker() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  setInterval(processQueue, 50);
}

async function processQueue() {
  if (isShuttingDown) return;
  if (activeCount >= concurrency) return;

  const row = db
    .prepare(
      `SELECT * FROM jobs
     WHERE status = 'queued'
     AND runAt <= ?
     ORDER BY id ASC
     LIMIT 1`,
    )
    .get(Date.now()) as JobRow | undefined;

  if (!row) return;

  const def = registry.get(row.name);
  if (!def) return;

  // lock by deleting first (simple v1 strategy)
  db.prepare(
    `UPDATE jobs
   SET status = 'running',
       startedAt = ?
   WHERE id = ?`,
  ).run(Date.now(), row.id);

  activeCount++;

  try {
    await def.handler(JSON.parse(row.payload));
    db.prepare(
      `UPDATE jobs
   SET status = 'completed',
       finishedAt = ?
   WHERE id = ?`,
    ).run(Date.now(), row.id);
  } catch (err) {
    await handleRetry(row, def);
  } finally {
    activeCount--;
  }
}

/**
 * Retry
 */
async function handleRetry(row: JobRow, def: JobDefinition) {
  const attempts = row.attempts + 1;
  const { retries, backoffMs } = def.options;

  if (attempts > retries) {
    db.prepare(
      `UPDATE jobs
     SET status = 'failed',
         finishedAt = ?,
         error = ?
     WHERE id = ?`,
    ).run(Date.now(), String(row.error ?? "Unknown error"), row.id);

    return;
  }

  const delay = backoffMs * attempts;

  db.prepare(
    `UPDATE jobs
   SET attempts = ?,
       runAt = ?,
       status = 'queued'
   WHERE id = ?`,
  ).run(attempts, Date.now() + delay, row.id);
}

/**
 * Delay parser
 */
function parseDelay(delay?: number | string): number {
  if (!delay) return 0;
  if (typeof delay === "number") return delay;

  const match = /^(\d+)(ms|s|m|h)?$/.exec(delay.trim());
  if (!match) {
    throw new Error(`[OneQueue] Invalid delay format: ${delay}`);
  }

  const value = Number(match[1]);
  const unit = match[2] ?? "ms";

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
    default:
      return value;
  }
}

export async function shutdown() {
  if (isShuttingDown) return;

  console.log("[OneQueue] Graceful shutdown started…");
  isShuttingDown = true;

  // wait for running jobs
  while (activeCount > 0) {
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log("[OneQueue] All jobs finished. Exiting cleanly.");
}

function setupSignalHandlers() {
  const handler = async () => {
    await shutdown();
    process.exit(0);
  };

  process.once("SIGINT", handler);
  process.once("SIGTERM", handler);
}

// auto-enable
setupSignalHandlers();