// Test setup file
import { AppDataSource } from '../database/postgres';
import mongoose from 'mongoose';

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup
  if (AppDataSource && AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

