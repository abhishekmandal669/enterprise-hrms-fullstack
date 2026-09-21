import { Request, Response, NextFunction } from 'express';

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const buckets = new Map<string, RateLimitBucket>();

export const createRateLimiter = (windowMs: number = 60 * 1000, maxRequests: number = 120) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const current = buckets.get(ip);
    if (!current || now > current.resetTime) {
      buckets.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    current.count++;
    if (current.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP. Please try again after a minute.',
        retryAfterMs: Math.max(0, current.resetTime - now)
      });
    }

    next();
  };
};

export const apiRateLimiter = createRateLimiter(60 * 1000, 150);
export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 30);
