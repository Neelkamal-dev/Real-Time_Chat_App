const rateLimitStore = new Map();

/**
 * Reusable Sliding Window Rate Limiter Middleware
 * @param {number} limit - Maximum number of requests allowed in the time window (default 30)
 * @param {number} windowMs - Time window in milliseconds (default 1 minute / 60000ms)
 */
export const aiRateLimiter = (limit = 30, windowMs = 60000) => {
  return (req, res, next) => {
    // Check if user is authenticated, fallback to client IP
    const key = req.user ? req.user._id.toString() : (req.ip || "anonymous");
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);

    // Filter out and discard requests older than the sliding window boundary
    const activeRequests = requests.filter((timestamp) => now - timestamp < windowMs);

    if (activeRequests.length >= limit) {
      const oldestRequest = activeRequests[0];
      const msRemaining = windowMs - (now - oldestRequest);
      const secondsRemaining = Math.max(1, Math.ceil(msRemaining / 1000));

      res.setHeader("Retry-After", secondsRemaining.toString());
      
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Too many requests. Please retry in ${secondsRemaining} seconds.`,
      });
    }

    // Append the current request timestamp
    activeRequests.push(now);
    rateLimitStore.set(key, activeRequests);

    next();
  };
};

export default aiRateLimiter;
