import { client } from "../services/redisService.js";

export function rateLimit(maxReq, windowPeriod) {
  return async (req, res, next) => {
      const ip = req.ip;
      const requestCount = await client.incr(`rateLimit:${ip}`);
      if (requestCount === 1) {
        await client.expire(`rateLimit:${ip}`, windowPeriod);
      }
      if (requestCount > maxReq) {
        return res.status(429).json({
          error: "Too many requests!",
          retryAfter: await client.ttl(`rateLimit:${ip}`)
        });
      }
      next();
  };
}
