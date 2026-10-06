import Redis from "ioredis";
import environment from "./environment.js";

/**
 * Initialize Redis client with fallback/retry handling
 */
const redisClient = new Redis(environment.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) {
      console.warn("[Redis] Retried 5 times. Disabling automatic retries.");
      return null;
    }
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: true, // Connect when needed or explicitly during bootstrap
});

redisClient.on("connect", () => {
  console.log("[Redis] Connected to Redis server.");
});

redisClient.on("ready", () => {
  console.log("[Redis] Redis client is ready.");
});

redisClient.on("error", (err) => {
  console.warn(`[Redis Warning] Redis error: ${err.message}. (Continuing in fallback mode if offline)`);
});

redisClient.on("close", () => {
  console.log("[Redis] Connection closed.");
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("[Redis] Connected explicitly during startup.");
  } catch (error) {
    console.warn(`[Redis Warning] Redis unavailable: ${error.message}`);
  }
};

export default redisClient;
