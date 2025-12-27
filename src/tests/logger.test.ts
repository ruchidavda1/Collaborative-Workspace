import logger from '../utils/logger';

describe('Logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should have info method', () => {
    expect(typeof logger.info).toBe('function');
  });

  it('should have error method', () => {
    expect(typeof logger.error).toBe('function');
  });

  it('should have warn method', () => {
    expect(typeof logger.warn).toBe('function');
  });

  it('should have debug method', () => {
    expect(typeof logger.debug).toBe('function');
  });

  it('should log info messages without throwing', () => {
    expect(() => logger.info('Test info message')).not.toThrow();
  });

  it('should log error messages without throwing', () => {
    expect(() => logger.error('Test error message')).not.toThrow();
  });

  it('should log warn messages without throwing', () => {
    expect(() => logger.warn('Test warn message')).not.toThrow();
  });

  it('should log debug messages without throwing', () => {
    expect(() => logger.debug('Test debug message')).not.toThrow();
  });

  it('should handle logging with metadata', () => {
    expect(() => logger.info('Test message', { key: 'value' })).not.toThrow();
  });
});

