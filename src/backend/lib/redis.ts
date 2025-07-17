import { createClient, RedisClientType } from 'redis';

// กำหนดค่า Redis configuration สำหรับ production performance optimization
const redisConfig = {
  username: process.env.REDIS_USERNAME!,
  password: process.env.REDIS_PASSWORD!,
  socket: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!),
    connectTimeout: 2000, // ลดจาก 5000 เป็น 2000ms
    commandTimeout: 1000, // ลดจาก 3000 เป็น 1000ms
    lazyConnect: true, // เชื่อมต่อเฉพาะเมื่อจำเป็น
    reconnectOnError: (err: Error) => err.message.includes('READONLY'), // Auto-reconnect on specific errors
    maxRetriesPerRequest: 2, // จำกัด retry เพื่อความเร็ว
  },
  // Performance optimizations สำหรับ production
  isolationPoolOptions: {
    min: 5, // เพิ่มจาก 2 เป็น 5
    max: 20, // เพิ่มจาก 10 เป็น 20
  },
  // เพิ่ม compression และ serialization options
  legacyMode: false, // ใช้ Redis 4.0+ features
};

// สร้าง Redis client instance
const redis: RedisClientType = createClient(redisConfig);

// Global cache สำหรับ connection ใน development
declare global {
  interface GlobalThis {
    __redis: RedisClientType | undefined;
    __redisConnectionPromise: Promise<RedisClientType> | undefined;
  }
}

let redisClient: RedisClientType;

if (process.env.NODE_ENV === 'production') {
  redisClient = redis;
} else {
  // ใน development ใช้ global cache เพื่อไม่ให้สร้าง connection ใหม่เมื่อ hot reload
  if (!globalThis.__redis) {
    globalThis.__redis = redis;
  }
  redisClient = globalThis.__redis;
}

// Event handlers สำหรับ monitoring
redisClient.on('connect', () => {
  console.log('✅ [Redis] Connected successfully');
});

redisClient.on('ready', () => {
  console.log('🚀 [Redis] Ready to use');
});

redisClient.on('error', (err) => {
  console.error('❌ [Redis] Connection error:', err);
});

redisClient.on('end', () => {
  console.log('🔌 [Redis] Connection closed');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 [Redis] Reconnecting...');
});

// เชื่อมต่อ Redis พร้อม connection pooling
let isConnecting = false;
const connectRedis = async (): Promise<RedisClientType> => {
  if (redisClient.isReady) {
    return redisClient;
  }

  // ใช้ global promise เพื่อป้องกัน concurrent connections
  if (!globalThis.__redisConnectionPromise) {
    globalThis.__redisConnectionPromise = (async () => {
      if (isConnecting) {
        // รอให้การเชื่อมต่อปัจจุบันเสร็จสิ้น
        while (isConnecting && !redisClient.isReady) {
          await new Promise(resolve => setTimeout(resolve, 50)); // ลดจาก 100 เป็น 50ms
        }
        return redisClient;
      }

      try {
        isConnecting = true;
        if (!redisClient.isOpen) {
          await redisClient.connect();
        }
        return redisClient;
      } catch (error) {
        console.error('❌ [Redis] Failed to connect:', error);
        throw error;
      } finally {
        isConnecting = false;
      }
    })();
  }

  return await globalThis.__redisConnectionPromise;
};

// Advanced Cache key generators พร้อม namespace และ versioning
export const CacheKeys = {
  // Homepage และ main sections
  HOMEPAGE_DATA: () => `divwy:v2:homepage:main`,
  HOMEPAGE_SECTIONS: () => `divwy:v2:homepage:sections`,
  
  // Novel lists พร้อม compression
  NOVELS_LIST: (filter: string, page: number, limit: number, categorySlug?: string, novelType?: string) => 
    `divwy:v2:novels:list:${filter}:p${page}:l${limit}:c${categorySlug || 'all'}:t${novelType || 'all'}`,
  
  // Trending และ popular content
  TRENDING_NOVELS: () => `divwy:v2:trending:novels`,
  POPULAR_CATEGORIES: () => `divwy:v2:popular:categories`,
  
  // User-specific cache
  USER_SESSION: (userId: string) => `divwy:v2:user:session:${userId}`,
  USER_PREFERENCES: (userId: string) => `divwy:v2:user:prefs:${userId}`,
  
  // Static content
  STATIC_CONTENT: (type: string) => `divwy:v2:static:${type}`,
} as const;

// Cache TTL settings (in seconds) - optimized สำหรับ performance
export const CacheTTL = {
  // Short-term cache สำหรับ dynamic content
  NOVELS_LIST: 60, // 1 minute - เร็วขึ้นสำหรับ real-time content
  TRENDING_NOVELS: 120, // 2 minutes
  
  // Medium-term cache สำหรับ semi-static content
  HOMEPAGE_SECTIONS: 300, // 5 minutes
  POPULAR_CATEGORIES: 600, // 10 minutes
  
  // Long-term cache สำหรับ static content
  HOMEPAGE_DATA: 900, // 15 minutes
  STATIC_CONTENT: 3600, // 1 hour
  
  // User-specific cache
  USER_SESSION: 1800, // 30 minutes
  USER_PREFERENCES: 86400, // 24 hours
} as const;

// High-performance cache manager พร้อม advanced features
export class CacheManager {
  private static async ensureConnection(): Promise<RedisClientType> {
    return await connectRedis();
  }

  // Compressed JSON serialization สำหรับ performance
  private static serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('❌ [Redis] Serialization error:', error);
      return '{}';
    }
  }

  private static deserialize<T>(value: string): T | null {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('❌ [Redis] Deserialization error:', error);
      return null;
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.ensureConnection();
      const cached = await client.get(key);
      return cached ? this.deserialize<T>(cached) : null;
    } catch (error) {
      console.error(`❌ [Redis] Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const client = await this.ensureConnection();
      const serialized = this.serialize(value);
      
      if (ttl) {
        await client.setEx(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`❌ [Redis] Error setting cache for key ${key}:`, error);
      return false;
    }
  }

  // Batch operations สำหรับ performance
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const client = await this.ensureConnection();
      const values = await client.mGet(keys);
      return values.map(value => value ? this.deserialize<T>(value) : null);
    } catch (error) {
      console.error(`❌ [Redis] Error getting multiple cache keys:`, error);
      return keys.map(() => null);
    }
  }

  static async mset(keyValuePairs: Array<{key: string, value: any, ttl?: number}>): Promise<boolean> {
    try {
      const client = await this.ensureConnection();
      
      // Group by TTL for efficiency
      const withoutTTL: string[] = [];
      const withTTL: Array<{key: string, value: string, ttl: number}> = [];
      
      keyValuePairs.forEach(({key, value, ttl}) => {
        const serialized = this.serialize(value);
        if (ttl) {
          withTTL.push({key, value: serialized, ttl});
        } else {
          withoutTTL.push(key, serialized);
        }
      });
      
      // Execute batch operations
      const promises: Promise<any>[] = [];
      
      if (withoutTTL.length > 0) {
        promises.push(client.mSet(withoutTTL));
      }
      
      withTTL.forEach(({key, value, ttl}) => {
        promises.push(client.setEx(key, ttl, value));
      });
      
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error(`❌ [Redis] Error setting multiple cache keys:`, error);
      return false;
    }
  }

  static async del(key: string | string[]): Promise<boolean> {
    try {
      const client = await this.ensureConnection();
      if (Array.isArray(key)) {
        await client.del(key);
      } else {
        await client.del(key);
      }
      return true;
    } catch (error) {
      console.error(`❌ [Redis] Error deleting cache for key ${Array.isArray(key) ? key.join(', ') : key}:`, error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const client = await this.ensureConnection();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ [Redis] Error checking cache existence for key ${key}:`, error);
      return false;
    }
  }

  // Pattern-based invalidation สำหรับ cache busting
  static async invalidatePattern(pattern: string): Promise<boolean> {
    try {
      const client = await this.ensureConnection();
      const keys = await client.keys(`${pattern}*`);
      if (keys.length > 0) {
        await client.del(keys);
        console.log(`🗑️ [Redis] Invalidated ${keys.length} keys with pattern: ${pattern}`);
      }
      return true;
    } catch (error) {
      console.error(`❌ [Redis] Error invalidating pattern ${pattern}:`, error);
      return false;
    }
  }

  // Cache-aside pattern with automatic fallback
  static async getWithFallback<T>(
    key: string, 
    fallbackFn: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // ถ้าไม่มี cache ให้ fetch ข้อมูลใหม่และ cache
      const fresh = await fallbackFn();
      // Don't await cache set to avoid blocking
      this.set(key, fresh, ttl).catch(error => {
        console.error(`❌ [Redis] Failed to cache result for key ${key}:`, error);
      });
      return fresh;
    } catch (error) {
      console.error(`❌ [Redis] Error in getWithFallback for key ${key}:`, error);
      // ถ้า Redis error ให้ fallback ไปที่ function
      return await fallbackFn();
    }
  }

  // Advanced cache warming
  static async warmCache(cacheMap: Map<string, () => Promise<any>>): Promise<void> {
    try {
      const promises = Array.from(cacheMap.entries()).map(async ([key, fetchFn]) => {
        try {
          const exists = await this.exists(key);
          if (!exists) {
            const data = await fetchFn();
            await this.set(key, data, CacheTTL.HOMEPAGE_DATA);
          }
        } catch (error) {
          console.error(`❌ [Redis] Cache warming failed for key ${key}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
      console.log(`🔥 [Redis] Cache warming completed for ${cacheMap.size} keys`);
    } catch (error) {
      console.error(`❌ [Redis] Cache warming error:`, error);
    }
  }

  // Health check
  static async healthCheck(): Promise<boolean> {
    try {
      const client = await this.ensureConnection();
      await client.ping();
      return true;
    } catch (error) {
      console.error('❌ [Redis] Health check failed:', error);
      return false;
    }
  }
}

// Export Redis client สำหรับใช้งานโดยตรง
export { redisClient };
export default redisClient;