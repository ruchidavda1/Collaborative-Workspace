// Test setup file
import { AppDataSource } from '../database/postgres';
import mongoose from 'mongoose';
import { redisClient, redisSubscriber } from '../database/redis';

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup all connections
  try {
    // Close PostgreSQL
  if (AppDataSource && AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
    
    // Close MongoDB
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    }
    
    // Close Redis connections
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.quit();
    }
    if (redisSubscriber && redisSubscriber.status === 'ready') {
      await redisSubscriber.quit();
    }
    
    // Give time for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error('Cleanup error:', error);
  }
});

