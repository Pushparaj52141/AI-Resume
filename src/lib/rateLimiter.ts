import { Ratelimit, Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const isConfigured = 
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN;

/** Avoid spamming the terminal on every cold import in dev (same message, no new info). */
const warnedNoRedis = new Set<string>();

const createRatelimiter = (limit: number, window: Duration, prefix: string) => {
  if (!isConfigured) {
    if (!warnedNoRedis.has(prefix)) {
      warnedNoRedis.add(prefix);
      console.warn(`Upstash Redis not configured for ${prefix}. Rate limiting is disabled.`);
    }
    return {
      limit: async () => ({ success: true, reset: Date.now() + 60000 }),
    } as unknown as Ratelimit;
  }

  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `@upstash/ratelimit/${prefix}`,
  });
};

// Create a new ratelimiter, that allows 5 requests per 60 seconds
export const pdfRateLimiter = createRatelimiter(5, '60 s', 'pdf');

// General API rate limiter
export const apiRateLimiter = createRatelimiter(20, '60 s', 'api');
