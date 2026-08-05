const buckets = new Map();

function getClientKey(req) {
  return req.session?.user?.id || req.ip || req.socket?.remoteAddress || "unknown";
}

export function simpleRateLimit({ windowMs, max, name }) {
  return (req, res, next) => {
    // Keep testing easy: set RATE_LIMIT_ENABLED=false to skip all rate limits.
    if (process.env.RATE_LIMIT_ENABLED === "false") {
      return next();
    }

    const now = Date.now();
    const key = `${name}:${getClientKey(req)}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        retry_after_seconds: retryAfter,
      });
    }

    return next();
  };
}

export const authRateLimit = simpleRateLimit({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  max: 20,
});

export const studentReadRateLimit = simpleRateLimit({
  name: "student-read",
  windowMs: 60 * 1000,
  max: 90,
});

export const lecturerWriteRateLimit = simpleRateLimit({
  name: "lecturer-write",
  windowMs: 60 * 60 * 1000,
  max: 30,
});


