import { generalLimiter, authLimiter, apiLimiter } from '../middleware/rateLimiter';

describe('Rate Limiter Middleware', () => {
  describe('generalLimiter', () => {
    it('should be defined', () => {
      expect(generalLimiter).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof generalLimiter).toBe('function');
    });
  });

  describe('authLimiter', () => {
    it('should be defined', () => {
      expect(authLimiter).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof authLimiter).toBe('function');
    });
  });

  describe('apiLimiter', () => {
    it('should be defined', () => {
      expect(apiLimiter).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof apiLimiter).toBe('function');
    });
  });
});

