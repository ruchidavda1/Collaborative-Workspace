import { Response } from 'express';
import { AppDataSource } from '../database/postgres';
import { Workspace } from '../database/entities/Workspace';
import { WorkspaceCollaborator } from '../database/entities/WorkspaceCollaborator';
import { User } from '../database/entities/User';
import { Project } from '../database/entities/Project';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, UserRole } from '../types';
import { AppError } from '../middleware/errorHandler';
import { cacheService } from '../database/redis';
import logger from '../utils/logger';

export class WorkspaceController {
  static async createWorkspace(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, projectId, metadata } = req.body;
      const userId = req.user!.userId;

      const projectRepository = AppDataSource.getRepository(Project);
      const project = await projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Debug logging
      logger.info(`Checking authorization - Project owner: ${project.ownerId}, Current user: ${userId}`);

      if (project.ownerId !== userId) {
        logger.error(`Authorization failed - Owner: ${project.ownerId} (${typeof project.ownerId}), User: ${userId} (${typeof userId})`);
        throw new AppError('Unauthorized access', 403);
      }

      const workspaceRepository = AppDataSource.getRepository(Workspace);
      const workspace = workspaceRepository.create({
        name,
        description,
        projectId,
        metadata,
      });

      await workspaceRepository.save(workspace);

      await cacheService.delPattern(`workspaces:project:${projectId}*`);

      logger.info(`Workspace created: ${workspace.id}`);

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: workspace,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Create workspace error:', error);
      throw new AppError('Failed to create workspace', 500);
    }
  }

  static async getWorkspaces(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;

      const projectRepository = AppDataSource.getRepository(Project);
      const project = await projectRepository.findOne({
        where: { id: projectId },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      if (project.ownerId !== userId) {
        throw new AppError('Unauthorized access', 403);
      }

      const workspaceRepository = AppDataSource.getRepository(Workspace);
      const workspaces = await workspaceRepository.find({
        where: { projectId },
        relations: ['collaborators', 'collaborators.user'],
        order: { createdAt: 'DESC' },
      });

      res.json({
        success: true,
        data: workspaces,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get workspaces error:', error);
      throw new AppError('Failed to fetch workspaces', 500);
    }
  }

  static async getWorkspaceById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!.userId;

      const workspaceRepository = AppDataSource.getRepository(Workspace);
      const workspace = await workspaceRepository.findOne({
        where: { id: workspaceId },
        relations: ['project', 'collaborators', 'collaborators.user'],
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404);
      }

      const hasAccess =
        workspace.project.ownerId === userId ||
        workspace.collaborators.some((c) => c.userId === userId);

      if (!hasAccess) {
        throw new AppError('Unauthorized access', 403);
      }

      res.json({
        success: true,
        data: workspace,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get workspace error:', error);
      throw new AppError('Failed to fetch workspace', 500);
    }
  }

  static async updateWorkspace(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!.userId;
      const { name, description, metadata } = req.body;

      const workspaceRepository = AppDataSource.getRepository(Workspace);
      const workspace = await workspaceRepository.findOne({
        where: { id: workspaceId },
        relations: ['project'],
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404);
      }

      if (workspace.project.ownerId !== userId) {
        throw new AppError('Unauthorized access', 403);
      }

      if (name) workspace.name = name;
      if (description !== undefined) workspace.description = description;
      if (metadata) workspace.metadata = metadata;

      await workspaceRepository.save(workspace);
      await cacheService.delPattern(`workspaces:project:${workspace.projectId}*`);

      logger.info(`Workspace updated: ${workspace.id}`);

      res.json({
        success: true,
        message: 'Workspace updated successfully',
        data: workspace,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update workspace error:', error);
      throw new AppError('Failed to update workspace', 500);
    }
  }

  static async deleteWorkspace(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId } = req.params;
      const userId = req.user!.userId;

      const workspaceRepository = AppDataSource.getRepository(Workspace);
      const workspace = await workspaceRepository.findOne({
        where: { id: workspaceId },
        relations: ['project'],
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404);
      }

      if (workspace.project.ownerId !== userId) {
        throw new AppError('Unauthorized access', 403);
      }

      await workspaceRepository.remove(workspace);
      await cacheService.delPattern(`workspaces:project:${workspace.projectId}*`);

      logger.info(`Workspace deleted: ${workspaceId}`);

      res.json({
        success: true,
        message: 'Workspace deleted successfully',
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete workspace error:', error);
      throw new AppError('Failed to delete workspace', 500);
    }
  }

  static async inviteCollaborator(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId } = req.params;
      const { email, role } = req.body;
      const userId = req.user!.userId;

      const workspaceRepository = AppDataSource.getRepository(Workspace);
      const workspace = await workspaceRepository.findOne({
        where: { id: workspaceId },
        relations: ['project'],
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404);
      }

      if (workspace.project.ownerId !== userId) {
        throw new AppError('Unauthorized access', 403);
      }

      const userRepository = AppDataSource.getRepository(User);
      const invitedUser = await userRepository.findOne({ where: { email } });

      if (!invitedUser) {
        throw new AppError('User not found', 404);
      }

      const collaboratorRepository = AppDataSource.getRepository(WorkspaceCollaborator);
      const existingCollaborator = await collaboratorRepository.findOne({
        where: { workspaceId, userId: invitedUser.id },
      });

      if (existingCollaborator) {
        throw new AppError('User is already a collaborator', 400);
      }

      const collaborator = collaboratorRepository.create({
        workspaceId,
        userId: invitedUser.id,
        role: role || UserRole.VIEWER,
        isAccepted: false,
        invitedBy: userId,
      });

      await collaboratorRepository.save(collaborator);

      logger.info(`Collaborator invited: ${invitedUser.email} to workspace ${workspaceId}`);

      res.status(201).json({
        success: true,
        message: 'Collaborator invited successfully',
        data: collaborator,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Invite collaborator error:', error);
      throw new AppError('Failed to invite collaborator', 500);
    }
  }

  static async updateCollaboratorRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId, collaboratorId } = req.params;
      const { role } = req.body;
      const userId = req.user!.userId;

      const workspaceRepository = AppDataSource.getRepository(Workspace);
      const workspace = await workspaceRepository.findOne({
        where: { id: workspaceId },
        relations: ['project'],
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404);
      }

      if (workspace.project.ownerId !== userId) {
        throw new AppError('Unauthorized access', 403);
      }

      const collaboratorRepository = AppDataSource.getRepository(WorkspaceCollaborator);
      const collaborator = await collaboratorRepository.findOne({
        where: { id: collaboratorId, workspaceId },
      });

      if (!collaborator) {
        throw new AppError('Collaborator not found', 404);
      }

      collaborator.role = role;
      await collaboratorRepository.save(collaborator);

      logger.info(`Collaborator role updated: ${collaboratorId} to ${role}`);

      res.json({
        success: true,
        message: 'Collaborator role updated successfully',
        data: collaborator,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update collaborator role error:', error);
      throw new AppError('Failed to update collaborator role', 500);
    }
  }

  static async removeCollaborator(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workspaceId, collaboratorId } = req.params;
      const userId = req.user!.userId;

      const workspaceRepository = AppDataSource.getRepository(Workspace);
      const workspace = await workspaceRepository.findOne({
        where: { id: workspaceId },
        relations: ['project'],
      });

      if (!workspace) {
        throw new AppError('Workspace not found', 404);
      }

      if (workspace.project.ownerId !== userId) {
        throw new AppError('Unauthorized access', 403);
      }

      const collaboratorRepository = AppDataSource.getRepository(WorkspaceCollaborator);
      const collaborator = await collaboratorRepository.findOne({
        where: { id: collaboratorId, workspaceId },
      });

      if (!collaborator) {
        throw new AppError('Collaborator not found', 404);
      }

      await collaboratorRepository.remove(collaborator);

      logger.info(`Collaborator removed: ${collaboratorId} from workspace ${workspaceId}`);

      res.json({
        success: true,
        message: 'Collaborator removed successfully',
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Remove collaborator error:', error);
      throw new AppError('Failed to remove collaborator', 500);
    }
  }
}

