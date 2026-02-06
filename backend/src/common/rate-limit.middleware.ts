import { Request, Response, NextFunction } from 'express';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const stores = new Map<string, Map<string, RateLimitEntry>>();

const getClientIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, max, keyPrefix } = options;
  let store = stores.get(keyPrefix);
  if (!store) {
    store = new Map<string, RateLimitEntry>();
    stores.set(keyPrefix, store);
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientIp(req)}`;
    const entry = store!.get(key);

    let current = entry;
    if (!current || current.resetAt <= now) {
      current = { count: 0, resetAt: now + windowMs };
    }

    current.count += 1;
    store!.set(key, current);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current.count));
    res.setHeader('X-RateLimit-Reset', current.resetAt);

    if (current.count > max) {
      res.status(429).json({ message: 'Too many requests' });
      return;
    }

    next();
  };
};
