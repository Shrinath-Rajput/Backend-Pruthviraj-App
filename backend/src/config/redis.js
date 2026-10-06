import Redis from "ioredis";
import environment from "./environment.js";

let redisClient = null;
let isRedisAvailable = false;

// In-memory fallback map for environments where Redis is temporarily offline during testing/dev
const memoryCache = new Map();
const memoryExpirations = new Map();

function cleanMemoryExpired(key) {
  const exp = memoryExpirations.get(key);
  if (exp && Date.now() > exp) {
    memoryCache.delete(key);
    memoryExpirations.delete(key);
    return true;
  }
  return false;
}

try {
  redisClient = new Redis(environment.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    connectTimeout: 3000,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying if Redis is not running
      }
      return Math.min(times * 150, 1000);
    },
    lazyConnect: true,
  });

  redisClient.on("connect", () => {
    isRedisAvailable = true;
    console.log("[Redis] Connected to Redis server.");
  });

  redisClient.on("ready", () => {
    isRedisAvailable = true;
    console.log("[Redis] Ready for commands.");
  });

  redisClient.on("error", (err) => {
    isRedisAvailable = false;
    // Keep log concise to prevent console flooding
    if (environment.NODE_ENV !== "test") {
      console.warn(`[Redis Notice] Server offline (${err.message}). Using memory fallback store.`);
    }
  });

  redisClient.on("close", () => {
    isRedisAvailable = false;
  });
} catch (err) {
  console.warn(`[Redis Init] Could not initialize ioredis: ${err.message}`);
}

export const connectRedis = async () => {
  if (!redisClient) return false;
  try {
    await redisClient.connect();
    isRedisAvailable = true;
    return true;
  } catch (error) {
    isRedisAvailable = false;
    return false;
  }
};

export const disconnectRedis = async () => {
  if (redisClient && isRedisAvailable) {
    try {
      await redisClient.quit();
      console.log("[Redis] Disconnected cleanly.");
    } catch (e) {
      redisClient.disconnect();
    }
  }
};

/**
 * Universal Redis & In-Memory Store Wrapper
 */
export const redisService = {
  isAvailable: () => isRedisAvailable,

  async get(key) {
    if (isRedisAvailable && redisClient) {
      try {
        return await redisClient.get(key);
      } catch (e) {
        // Fallback to memory
      }
    }
    if (cleanMemoryExpired(key)) return null;
    return memoryCache.get(key) || null;
  },

  async set(key, value, expireSeconds = null) {
    const stringVal = typeof value === "object" ? JSON.stringify(value) : String(value);
    if (isRedisAvailable && redisClient) {
      try {
        if (expireSeconds) {
          return await redisClient.set(key, stringVal, "EX", expireSeconds);
        }
        return await redisClient.set(key, stringVal);
      } catch (e) {
        // Fallback to memory
      }
    }
    memoryCache.set(key, stringVal);
    if (expireSeconds) {
      memoryExpirations.set(key, Date.now() + expireSeconds * 1000);
    } else {
      memoryExpirations.delete(key);
    }
    return "OK";
  },

  async del(key) {
    if (isRedisAvailable && redisClient) {
      try {
        return await redisClient.del(key);
      } catch (e) {
        // Fallback
      }
    }
    memoryCache.delete(key);
    memoryExpirations.delete(key);
    return 1;
  },

  async incr(key, ttlSeconds = 60) {
    if (isRedisAvailable && redisClient) {
      try {
        const val = await redisClient.incr(key);
        if (val === 1 && ttlSeconds) {
          await redisClient.expire(key, ttlSeconds);
        }
        return val;
      } catch (e) {
        // Fallback
      }
    }
    cleanMemoryExpired(key);
    const curr = parseInt(memoryCache.get(key) || "0", 10) + 1;
    memoryCache.set(key, String(curr));
    if (curr === 1 && ttlSeconds) {
      memoryExpirations.set(key, Date.now() + ttlSeconds * 1000);
    }
    return curr;
  },

  /**
   * Distributed Lock implementation for race conditions (e.g. Supervisor Handover)
   */
  async acquireLock(lockKey, ttlSeconds = 10, lockToken = String(Date.now())) {
    const fullKey = `lock:${lockKey}`;
    if (isRedisAvailable && redisClient) {
      try {
        const res = await redisClient.set(fullKey, lockToken, "NX", "EX", ttlSeconds);
        return res === "OK" ? lockToken : null;
      } catch (e) {
        // Fallback
      }
    }
    cleanMemoryExpired(fullKey);
    if (memoryCache.has(fullKey)) return null;
    memoryCache.set(fullKey, lockToken);
    memoryExpirations.set(fullKey, Date.now() + ttlSeconds * 1000);
    return lockToken;
  },

  async releaseLock(lockKey, lockToken) {
    const fullKey = `lock:${lockKey}`;
    if (isRedisAvailable && redisClient) {
      try {
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        return await redisClient.eval(script, 1, fullKey, lockToken);
      } catch (e) {
        // Fallback
      }
    }
    if (memoryCache.get(fullKey) === lockToken) {
      memoryCache.delete(fullKey);
      memoryExpirations.delete(fullKey);
      return 1;
    }
    return 0;
  },
};

export default redisClient;
