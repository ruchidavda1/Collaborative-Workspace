import { DataSource } from 'typeorm';
import config from '../config';
import { User } from './entities/User';
import { Project } from './entities/Project';
import { Workspace } from './entities/Workspace';
import { WorkspaceCollaborator } from './entities/WorkspaceCollaborator';
import logger from '../utils/logger';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.postgres.host,
  port: config.postgres.port,
  username: config.postgres.username,
  password: config.postgres.password,
  database: config.postgres.database,
  synchronize: config.node_env === 'development',
  logging: config.node_env === 'development',
  entities: [User, Project, Workspace, WorkspaceCollaborator],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: [],
  ssl: config.node_env === 'production' ? { rejectUnauthorized: false } : false,
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    logger.info('PostgreSQL database connected successfully');
  } catch (error) {
    logger.error('Error connecting to PostgreSQL database:', error);
    throw error;
  }
};

