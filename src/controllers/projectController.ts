import { Response } from 'express';
import { AppDataSource } from '../database/postgres';
import { Project } from '../database/entities/Project';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, ProjectStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import { cacheService } from '../database/redis';
import logger from '../utils/logger';

export class ProjectController {
  static async createProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, settings } = req.body;
      const userId = req.user!.userId;

      const projectRepository = AppDataSource.getRepository(Project);

      const project = projectRepository.create({
        name,
        description,
        ownerId: userId,
        settings,
        status: ProjectStatus.ACTIVE,
      });

      await projectRepository.save(project);

      await cacheService.del(`projects:user:${userId}`);

      logger.info(`Project created: ${project.id} by user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project,
      } as ApiResponse);
    } catch (error) {
      logger.error('Create project error:', error);
      throw new AppError('Failed to create project', 500);
    }
  }

  static async getProjects(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const cacheKey = `projects:user:${userId}:${page}:${limit}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        res.json(cached as ApiResponse);
        return;
      }

      const projectRepository = AppDataSource.getRepository(Project);

      const [projects, total] = await projectRepository.findAndCount({
        where: { ownerId: userId, status: ProjectStatus.ACTIVE },
        relations: ['workspaces'],
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });

      const response: ApiResponse = {
        success: true,
        data: projects,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      await cacheService.set(cacheKey, response, 300); // 5 minutes

      res.json(response);
    } catch (error) {
      logger.error('Get projects error:', error);
      throw new AppError('Failed to fetch projects', 500);
    }
  }

  static async getProjectById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;

      const projectRepository = AppDataSource.getRepository(Project);

      const project = await projectRepository.findOne({
        where: { id: projectId },
        relations: ['workspaces', 'owner'],
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      if (project.ownerId !== userId) {
        throw new AppError('Unauthorized access', 403);
      }

      res.json({
        success: true,
        data: project,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get project error:', error);
      throw new AppError('Failed to fetch project', 500);
    }
  }

  static async updateProject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user!.userId;
      const { name, description, settings, status } = req.body;

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

      if (name) project.name = name;
      if (description !== undefined) project.description = description;
      if (settings) project.settings = settings;
      if (status) project.status = status;

      await projectRepository.save(project);
      await cacheService.delPattern(`projects:user:${userId}*`);

      logger.info(`Project updated: ${project.id}`);

      res.json({
        success: true,
        message: 'Project updated successfully',
        data: project,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Update project error:', error);
      throw new AppError('Failed to update project', 500);
    }
  }

  static async deleteProject(req: AuthRequest, res: Response): Promise<void> {
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

      project.status = ProjectStatus.DELETED;
      await projectRepository.save(project);

      await cacheService.delPattern(`projects:user:${userId}*`);

      logger.info(`Project deleted: ${project.id}`);

      res.json({
        success: true,
        message: 'Project deleted successfully',
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Delete project error:', error);
      throw new AppError('Failed to delete project', 500);
    }
  }
}

