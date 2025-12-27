import config from '../config';

describe('Config', () => {
  it('should load configuration', () => {
    expect(config).toBeDefined();
    expect(config.node_env).toBeDefined();
    expect(config.port).toBeDefined();
  });

  it('should have JWT configuration', () => {
    expect(config.jwt).toBeDefined();
    expect(config.jwt.secret).toBeDefined();
    expect(config.jwt.refreshSecret).toBeDefined();
    expect(config.jwt.expiresIn).toBeDefined();
    expect(config.jwt.refreshExpiresIn).toBeDefined();
  });

  it('should have database configurations', () => {
    expect(config.postgres).toBeDefined();
    expect(config.mongodb).toBeDefined();
    expect(config.redis).toBeDefined();
  });

  it('should have rate limit configuration', () => {
    expect(config.rateLimit).toBeDefined();
    expect(config.rateLimit.windowMs).toBeGreaterThan(0);
    expect(config.rateLimit.maxRequests).toBeGreaterThan(0);
  });

  it('should have CORS configuration', () => {
    expect(config.cors).toBeDefined();
    expect(Array.isArray(config.cors.origin)).toBe(true);
  });

  it('should have logging configuration', () => {
    expect(config.logging).toBeDefined();
    expect(config.logging.level).toBeDefined();
  });

  it('should have features configuration', () => {
    expect(config.features).toBeDefined();
    expect(typeof config.features.advancedAnalytics).toBe('boolean');
    expect(typeof config.features.codeExecution).toBe('boolean');
  });

  it('should have job queue configuration', () => {
    expect(config.jobQueue).toBeDefined();
    expect(config.jobQueue.concurrency).toBeGreaterThan(0);
    expect(config.jobQueue.maxRetries).toBeGreaterThan(0);
  });

  it('should have websocket configuration', () => {
    expect(config.websocket).toBeDefined();
    expect(config.websocket.port).toBeDefined();
    expect(config.websocket.path).toBeDefined();
  });

  it('should have valid port number', () => {
    expect(config.port).toBeGreaterThan(0);
    expect(config.port).toBeLessThan(65536);
  });

  it('should have valid API version', () => {
    expect(config.api_version).toBeDefined();
    expect(typeof config.api_version).toBe('string');
  });
});

