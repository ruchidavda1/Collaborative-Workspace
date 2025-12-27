import Redis from 'ioredis';
import config from '../config';
import logger from '../utils/logger';

// Use REDIS_URL if available (Railway provides this), otherwise use individual config
const createRedisClient = () => {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL);
  }
  
  return new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
    retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
};

export const redisClient = createRedisClient();
export const redisSubscriber = createRedisClient();

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (error) => {
  logger.error('Redis client error:', error);
});

redisSubscriber.on('connect', () => {
  logger.info('Redis subscriber connected');
});

redisSubscriber.on('error', (error) => {
  logger.error('Redis subscriber error:', error);
});

export const cacheService = {
  async get(key: string): Promise<any> {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  async set(key: string, value: any, expiryInSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (expiryInSeconds) {
        await redisClient.setex(key, expiryInSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  },

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
    }
  },
};

