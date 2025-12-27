import http from 'http';
import { createApp } from './app';
import { initializeDatabase } from './database/postgres';
import { connectMongoDB } from './database/mongodb';
import { WebSocketService } from './services/websocketService';
import config from './config';
import logger from './utils/logger';

// Import worker to start job processing
import './workers/jobWorker';

const startServer = async () => {
  try {
    // Initialize databases
    logger.info('Initializing databases...');
    await initializeDatabase();
    
    // Try to connect to MongoDB, but don't fail if it's not available
    try {
      await connectMongoDB();
    } catch (mongoError) {
      logger.warn('MongoDB connection failed (non-critical):', mongoError);
      logger.info('Server will continue without MongoDB (jobs and activities disabled)');
    }

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket (instantiated for side effects)
    void new WebSocketService(server);
    logger.info('WebSocket service initialized');

    // Start server
    server.listen(config.port, () => {
      logger.info(`Server started successfully`);
      logger.info(`Environment: ${config.node_env}`);
      logger.info(`Server running on port ${config.port}`);
      logger.info(`API Documentation: http://localhost:${config.port}/api-docs`);
      logger.info(`Health Check: http://localhost:${config.port}/health`);
      logger.info(`WebSocket Path: ${config.websocket.path}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connections
          const { AppDataSource } = await import('./database/postgres');
          await AppDataSource.destroy();
          logger.info('PostgreSQL connection closed');

          const { disconnectMongoDB } = await import('./database/mongodb');
          await disconnectMongoDB();
          logger.info('MongoDB connection closed');

          // Close Redis connections
          const { redisClient, redisSubscriber } = await import('./database/redis');
          await redisClient.quit();
          await redisSubscriber.quit();
          logger.info('Redis connections closed');

          // Close job queue
          const { jobQueue } = await import('./queue/jobQueue');
          await jobQueue.close();
          logger.info('Job queue closed');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

