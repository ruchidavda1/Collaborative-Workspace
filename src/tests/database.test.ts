import { AppDataSource } from '../database/postgres';

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    DataSource: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      isInitialized: false,
      getRepository: jest.fn(),
    })),
  };
});

describe('PostgreSQL Connection', () => {
  it('should have AppDataSource defined', () => {
    expect(AppDataSource).toBeDefined();
  });

  it('should have correct database type', () => {
    expect(AppDataSource.options.type).toBe('postgres');
  });

  it('should have entities configured', () => {
    expect(AppDataSource.options.entities).toBeDefined();
    expect(Array.isArray(AppDataSource.options.entities)).toBe(true);
  });
});

