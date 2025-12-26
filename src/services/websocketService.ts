import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { AuthService } from '../services/authService';
import { redisSubscriber, redisClient } from '../database/redis';
import { Activity } from '../database/models/Activity';
import { EventType, CollaborationEvent } from '../types';
import logger from '../utils/logger';
import config from '../config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  workspaceId?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      path: config.websocket.path,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupRedisSubscriber();
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = AuthService.verifyAccessToken(token);
        socket.userId = decoded.userId;
        socket.userName = decoded.email;

        logger.info(`User ${socket.userId} authenticated for WebSocket`);
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Client connected: ${socket.id}, User: ${socket.userId}`);

      socket.on('join_workspace', async (workspaceId: string) => {
        try {
          socket.workspaceId = workspaceId;
          await socket.join(workspaceId);

          // Track user socket
          if (!this.userSockets.has(socket.userId!)) {
            this.userSockets.set(socket.userId!, new Set());
          }
          this.userSockets.get(socket.userId!)!.add(socket.id);

          const event: CollaborationEvent = {
            type: EventType.USER_JOINED,
            workspaceId,
            userId: socket.userId!,
            timestamp: new Date(),
            payload: {
              userName: socket.userName,
            },
          };

          // Broadcast to workspace
          this.broadcastToWorkspace(workspaceId, 'user_joined', event);

          // Save activity to MongoDB
          await this.saveActivity(event);

          // Publish to Redis for horizontal scaling
          await redisClient.publish('collaboration_events', JSON.stringify(event));

          logger.info(`User ${socket.userId} joined workspace ${workspaceId}`);
        } catch (error) {
          logger.error('Join workspace error:', error);
          socket.emit('error', { message: 'Failed to join workspace' });
        }
      });

      socket.on('leave_workspace', async (workspaceId: string) => {
        try {
          await socket.leave(workspaceId);

          const event: CollaborationEvent = {
            type: EventType.USER_LEFT,
            workspaceId,
            userId: socket.userId!,
            timestamp: new Date(),
            payload: {
              userName: socket.userName,
            },
          };

          this.broadcastToWorkspace(workspaceId, 'user_left', event);
          await this.saveActivity(event);
          await redisClient.publish('collaboration_events', JSON.stringify(event));

          logger.info(`User ${socket.userId} left workspace ${workspaceId}`);
        } catch (error) {
          logger.error('Leave workspace error:', error);
        }
      });

      socket.on('file_change', async (data: any) => {
        try {
          if (!socket.workspaceId) {
            socket.emit('error', { message: 'Not in a workspace' });
            return;
          }

          const event: CollaborationEvent = {
            type: EventType.FILE_CHANGED,
            workspaceId: socket.workspaceId,
            userId: socket.userId!,
            timestamp: new Date(),
            payload: {
              fileName: data.fileName,
              changes: data.changes,
              userName: socket.userName,
            },
          };

          this.broadcastToWorkspace(socket.workspaceId, 'file_change', event, socket.id);
          await this.saveActivity(event);
          await redisClient.publish('collaboration_events', JSON.stringify(event));
        } catch (error) {
          logger.error('File change error:', error);
        }
      });

      socket.on('cursor_move', async (data: any) => {
        try {
          if (!socket.workspaceId) return;

          const event: CollaborationEvent = {
            type: EventType.CURSOR_MOVED,
            workspaceId: socket.workspaceId,
            userId: socket.userId!,
            timestamp: new Date(),
            payload: {
              position: data.position,
              fileName: data.fileName,
              userName: socket.userName,
            },
          };

          // Don't save cursor movements to DB (too frequent)
          this.broadcastToWorkspace(socket.workspaceId, 'cursor_move', event, socket.id);
        } catch (error) {
          logger.error('Cursor move error:', error);
        }
      });

      socket.on('activity_update', async (data: any) => {
        try {
          if (!socket.workspaceId) return;

          const event: CollaborationEvent = {
            type: EventType.ACTIVITY_UPDATE,
            workspaceId: socket.workspaceId,
            userId: socket.userId!,
            timestamp: new Date(),
            payload: {
              activity: data.activity,
              userName: socket.userName,
            },
          };

          this.broadcastToWorkspace(socket.workspaceId, 'activity_update', event, socket.id);
          await this.saveActivity(event);
          await redisClient.publish('collaboration_events', JSON.stringify(event));
        } catch (error) {
          logger.error('Activity update error:', error);
        }
      });

      socket.on('disconnect', async () => {
        try {
          // Clean up user socket tracking
          if (socket.userId && this.userSockets.has(socket.userId)) {
            this.userSockets.get(socket.userId)!.delete(socket.id);
            if (this.userSockets.get(socket.userId)!.size === 0) {
              this.userSockets.delete(socket.userId);
            }
          }

          if (socket.workspaceId) {
            const event: CollaborationEvent = {
              type: EventType.USER_LEFT,
              workspaceId: socket.workspaceId,
              userId: socket.userId!,
              timestamp: new Date(),
              payload: {
                userName: socket.userName,
              },
            };

            this.broadcastToWorkspace(socket.workspaceId, 'user_left', event);
            await this.saveActivity(event);
            await redisClient.publish('collaboration_events', JSON.stringify(event));
          }

          logger.info(`Client disconnected: ${socket.id}`);
        } catch (error) {
          logger.error('Disconnect error:', error);
        }
      });
    });
  }

  private setupRedisSubscriber() {
    redisSubscriber.subscribe('collaboration_events', (err) => {
      if (err) {
        logger.error('Redis subscription error:', err);
      } else {
        logger.info('Subscribed to Redis collaboration events');
      }
    });

    redisSubscriber.on('message', (channel, message) => {
      if (channel === 'collaboration_events') {
        try {
          const event: CollaborationEvent = JSON.parse(message);
          // Broadcast to local connected clients
          this.broadcastToWorkspace(event.workspaceId, event.type, event);
        } catch (error) {
          logger.error('Redis message processing error:', error);
        }
      }
    });
  }

  private broadcastToWorkspace(workspaceId: string, eventName: string, data: any, excludeSocketId?: string) {
    if (excludeSocketId) {
      this.io.to(workspaceId).except(excludeSocketId).emit(eventName, data);
    } else {
      this.io.to(workspaceId).emit(eventName, data);
    }
  }

  private async saveActivity(event: CollaborationEvent) {
    try {
      // Don't save cursor movements
      if (event.type === EventType.CURSOR_MOVED) {
        return;
      }

      const activity = new Activity({
        workspaceId: event.workspaceId,
        userId: event.userId,
        userName: event.payload.userName || 'Unknown',
        eventType: event.type,
        payload: event.payload,
        timestamp: event.timestamp,
      });

      await activity.save();
    } catch (error) {
      logger.error('Save activity error:', error);
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

