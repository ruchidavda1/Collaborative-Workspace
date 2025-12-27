import { redisClient, redisSubscriber, cacheService } from '../database/redis';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    status: 'ready',
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  }));
});

describe('Redis Connection', () => {
  describe('redisClient', () => {
    it('should be defined', () => {
      expect(redisClient).toBeDefined();
    });

    it('should have get method', () => {
      expect(typeof redisClient.get).toBe('function');
    });

    it('should have set method', () => {
      expect(typeof redisClient.set).toBe('function');
    });

    it('should have del method', () => {
      expect(typeof redisClient.del).toBe('function');
    });

    it('should have keys method', () => {
      expect(typeof redisClient.keys).toBe('function');
    });
  });

  describe('redisSubscriber', () => {
    it('should be defined', () => {
      expect(redisSubscriber).toBeDefined();
    });

    it('should have get method', () => {
      expect(typeof redisSubscriber.get).toBe('function');
    });

    it('should have set method', () => {
      expect(typeof redisSubscriber.set).toBe('function');
    });

    it('should be a separate instance from redisClient', () => {
      expect(redisSubscriber).not.toBe(redisClient);
    });
  });

  describe('cacheService', () => {
    it('should be defined', () => {
      expect(cacheService).toBeDefined();
    });

    it('should have get method', () => {
      expect(typeof cacheService.get).toBe('function');
    });

    it('should have set method', () => {
      expect(typeof cacheService.set).toBe('function');
    });

    it('should have del method', () => {
      expect(typeof cacheService.del).toBe('function');
    });

    it('should have delPattern method', () => {
      expect(typeof cacheService.delPattern).toBe('function');
    });
  });
});

