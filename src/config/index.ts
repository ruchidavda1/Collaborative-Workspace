import dotenv from 'dotenv';
dotenv.config();

interface Config {
  node_env: string;
  port: number;
  api_version: string;
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  postgres: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  mongodb: {
    uri: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string[];
  };
  logging: {
    level: string;
  };
  features: {
    advancedAnalytics: boolean;
    codeExecution: boolean;
  };
  jobQueue: {
    concurrency: number;
    maxRetries: number;
  };
  websocket: {
    port: number;
    path: string;
  };
}

const config: Config = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  api_version: process.env.API_VERSION || 'v1',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'workspace_user',
    password: process.env.POSTGRES_PASSWORD || 'workspace_password',
    database: process.env.POSTGRES_DB || 'collaborative_workspace',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/collaborative_workspace',
  },
  redis: {
    host: process.env.REDISHOST || 'localhost',
    port: parseInt(process.env.REDISPORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'https://collaborative-workspace-production.up.railway.app'
    ],
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  features: {
    advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true',
    codeExecution: process.env.FEATURE_CODE_EXECUTION !== 'false',
  },
  jobQueue: {
    concurrency: parseInt(process.env.JOB_QUEUE_CONCURRENCY || '5', 10),
    maxRetries: parseInt(process.env.JOB_MAX_RETRIES || '3', 10),
  },
  websocket: {
    port: parseInt(process.env.WS_PORT || '3001', 10),
    path: process.env.WS_PATH || '/socket.io',
  },
};

export default config;

