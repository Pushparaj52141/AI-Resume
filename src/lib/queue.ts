import { getRedisConnection } from '@/lib/redis-connection';

export const isQueueEnabled = !!process.env.REDIS_URL;

let queuePromise: Promise<import('bullmq').Queue> | null = null;

/**
 * Lazy-loads bullmq only when REDIS_URL is set so Next.js / Turbopack does not
 * bundle or externalize ioredis for routes that only use sync PDF generation.
 */
export function getPdfQueue(): Promise<import('bullmq').Queue> {
  if (!isQueueEnabled) {
    return Promise.reject(new Error('PDF queue requires REDIS_URL'));
  }
  if (!queuePromise) {
    queuePromise = (async () => {
      const { Queue } = await import('bullmq');
      return new Queue('pdf-generation', {
        connection: getRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });
    })();
  }
  return queuePromise;
}
