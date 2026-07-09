class CacheService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Retrieves an item from the cache. Returns null if expired or missing.
   * @param {string} key 
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Saves an item to the cache with an expiration time.
   * @param {string} key 
   * @param {*} value 
   * @param {number} ttlMs - Time-to-live in milliseconds (default 2 minutes)
   */
  set(key, value, ttlMs = 120000) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  /**
   * Removes a specific item from the cache.
   * @param {string} key 
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Resets and clears the cache state.
   */
  clear() {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
export default cacheService;
