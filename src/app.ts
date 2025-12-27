import express, { Application } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import config from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import jobRoutes from './routes/jobRoutes';
import logger from './utils/logger';

export const createApp = (): Application => {
  const app = express();

  // Security middleware (with CSP adjustments for demo page)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io"],
        scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'", 
          "http://localhost:3000", 
          "ws://localhost:3000", 
          "https://cdn.socket.io",
          "https://collaborative-workspace-production.up.railway.app",
          "wss://collaborative-workspace-production.up.railway.app"
        ],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
      },
    },
  }));
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  if (config.node_env === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Rate limiting
  app.use(generalLimiter);

  // Swagger documentation
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Collaborative Workspace API',
        version: '1.0.0',
        description: 'Real-Time Collaborative Workspace Backend Service'
        
      },
      servers: [
        {
          url: `http://localhost:${config.port}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    apis: ['./src/routes/*.ts'],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve static files (demo page)
  app.use(express.static(path.join(__dirname, '../basicfrontend')));

  // Demo page route
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../basicfrontend/demo.html'));
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.node_env,
      version: config.api_version,
    });
  });

  // Feature flags endpoint
  app.get('/api/features', (_req, res) => {
    res.json({
      success: true,
      data: config.features,
    });
  });

  // API routes
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/projects', projectRoutes);
  apiRouter.use('/workspaces', workspaceRoutes);
  apiRouter.use('/jobs', jobRoutes);

  app.use(`/api/${config.api_version}`, apiRouter);

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('Express app created successfully');

  return app;
};

