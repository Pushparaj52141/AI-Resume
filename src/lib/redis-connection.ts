/** Shared Redis options for BullMQ worker and API (no bullmq import — keeps Next/Turbopack from pulling ioredis into the route graph). */

const REDIS_URL = process.env.REDIS_URL;

export function getRedisConnection() {
  if (!REDIS_URL) {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }

  try {
    const redisUrl = new URL(REDIS_URL);
    const port = redisUrl.port ? parseInt(redisUrl.port, 10) : 6379;
    return {
      host: redisUrl.hostname,
      port: Number.isFinite(port) ? port : 6379,
      password: redisUrl.password || undefined,
      username: redisUrl.username || undefined,
      maxRetriesPerRequest: null,
    };
  } catch (e) {
    console.error('Invalid REDIS_URL:', REDIS_URL);
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

/** Process-wide connection config for the PDF worker process. */
export const connection = getRedisConnection();
