import dotenv from "dotenv";

dotenv.config();

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.redisClient = null;
    this.isRedisReady = false;
    this.initRedis();
  }

  // Attempt dynamic import of Redis package if REDIS_URL is present
  async initRedis() {
    if (!process.env.REDIS_URL) {
      console.log("REDIS_URL is not defined. Using In-Memory cache for AI requests.");
      return;
    }
    try {
      const { createClient } = await import("redis");
      this.redisClient = createClient({ url: process.env.REDIS_URL });
      
      this.redisClient.on("error", (err) => {
        console.warn("Redis client error, falling back to In-Memory cache:", err.message);
        this.isRedisReady = false;
      });

      await this.redisClient.connect();
      this.isRedisReady = true;
      console.log("🚀 Connected to Redis successfully for AI Caching.");
    } catch (err) {
      console.log("Redis client library 'redis' is not installed. Using In-Memory cache fallback.");
      this.isRedisReady = false;
    }
  }

  /**
   * Retrieves an item from the cache. Returns null if expired or missing.
   * @param {string} key 
   * @returns {Promise<any>}
   */
  async get(key) {
    if (this.isRedisReady && this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        console.error("Redis get failed, falling back to In-Memory:", err.message);
      }
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;

    // Check automatic invalidation
    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Saves an item to the cache with an expiration time.
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds - Time-to-live in seconds (default 300s / 5 minutes)
   */
  async set(key, value, ttlSeconds = 300) {
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), {
          EX: ttlSeconds,
        });
        return;
      } catch (err) {
        console.error("Redis set failed, saving to In-Memory fallback:", err.message);
      }
    }

    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  }

  /**
   * Removes a specific item from the cache.
   * @param {string} key 
   */
  async delete(key) {
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (err) {
        console.error("Redis delete failed:", err.message);
      }
    }
    this.memoryCache.delete(key);
  }

  /**
   * Resets and clears the cache state.
   */
  async clear() {
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.flushAll();
        return;
      } catch (err) {
        console.error("Redis flushAll failed:", err.message);
      }
    }
    this.memoryCache.clear();
  }
}

export const cacheService = new CacheService();
export default cacheService;
