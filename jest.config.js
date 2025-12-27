// Set test environment before anything else
process.env.NODE_ENV = 'test';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/services/authService.ts',
    'src/services/cacheService.ts',
    'src/middleware/auth.ts',
    'src/middleware/errorHandler.ts',
    'src/middleware/validator.ts',
    'src/middleware/rateLimiter.ts',
    'src/config/index.ts',
    'src/utils/logger.ts',
    'src/database/postgres.ts',
    'src/database/redis.ts',
    'src/database/mongodb.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: false,
};

