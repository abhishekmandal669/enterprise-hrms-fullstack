import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitStore>();

// Cleanup expired memoryStore records every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (now > value.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests from this address. Please try again later.'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const clientKey = req.ip || req.socket.remoteAddress || 'unknown';

    const record = memoryStore.get(clientKey);

    if (!record || now > record.resetTime) {
      memoryStore.set(clientKey, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      return res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds
      });
    }

    record.count++;
    next();
  };
}

/**
 * Login rate limiter: Max 20 attempts per minute per IP to prevent brute force attacks
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Security alert: Too many login attempts. Please wait 1 minute before retrying.'
});
