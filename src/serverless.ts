import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import config from './config';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import jobRoutes from './routes/jobRoutes';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

const app = express();

// Middleware
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", `http://localhost:${config.port}`, `ws://localhost:${config.port}`, "https://cdn.socket.io"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"]
      },
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Serve static files
app.use(express.static(path.join(__dirname, '../basicfrontend')));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is running (Vercel Serverless - WebSockets disabled)',
    timestamp: new Date().toISOString(),
    environment: config.node_env,
  });
});

// Demo page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../basicfrontend/demo.html'));
});

// API Routes
app.use(`/api/${config.api_version}/auth`, authRoutes);
app.use(`/api/${config.api_version}/projects`, projectRoutes);
app.use(`/api/${config.api_version}/workspaces`, workspaceRoutes);
app.use(`/api/${config.api_version}/jobs`, jobRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${_req.path} not found`,
  });
});

// Error handler
app.use(errorHandler);

export default app;

