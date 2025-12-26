import { cacheService } from '../database/redis';

describe('Cache Service', () => {
  const testKey = 'test:key';
  const testValue = { data: 'test value', number: 123 };

  afterEach(async () => {
    await cacheService.del(testKey);
  });

  describe('set and get', () => {
    it('should set and get a value', async () => {
      await cacheService.set(testKey, testValue);
      const result = await cacheService.get(testKey);
      expect(result).toEqual(testValue);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should set value with expiry', async () => {
      await cacheService.set(testKey, testValue, 1);
      const result = await cacheService.get(testKey);
      expect(result).toEqual(testValue);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const expiredResult = await cacheService.get(testKey);
      expect(expiredResult).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      await cacheService.set(testKey, testValue);
      await cacheService.del(testKey);
      const result = await cacheService.get(testKey);
      expect(result).toBeNull();
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      await cacheService.set('test:1', { data: '1' });
      await cacheService.set('test:2', { data: '2' });
      await cacheService.set('other:1', { data: 'other' });

      await cacheService.delPattern('test:*');

      const result1 = await cacheService.get('test:1');
      const result2 = await cacheService.get('test:2');
      const result3 = await cacheService.get('other:1');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toEqual({ data: 'other' });

      // Cleanup
      await cacheService.del('other:1');
    });
  });
});

