import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiResponse, JobStatus } from '../types';
import { addJob, getJobStatus } from '../queue/jobQueue';
import { Job } from '../database/models/Job';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class JobController {
  static async createJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { type, data, workspaceId } = req.body;
      const userId = req.user!.userId;

      const job = await addJob({
        type,
        data,
        userId,
        workspaceId,
      });

      logger.info(`Job created: ${job.id} by user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Job created successfully',
        data: {
          jobId: job.id,
          type,
          status: 'pending',
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Create job error:', error);
      throw new AppError('Failed to create job', 500);
    }
  }

  static async getJobById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user!.userId;

      const jobStatus = await getJobStatus(jobId);

      if (!jobStatus) {
        throw new AppError('Job not found', 404);
      }

      // Verify ownership
      if (jobStatus.data.userId !== userId) {
        throw new AppError('Unauthorized access', 403);
      }

      res.json({
        success: true,
        data: jobStatus,
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Get job error:', error);
      throw new AppError('Failed to fetch job', 500);
    }
  }

  static async getUserJobs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const total = await Job.countDocuments({ userId });
      const jobs = await Job.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      } as ApiResponse);
    } catch (error) {
      logger.error('Get user jobs error:', error);
      throw new AppError('Failed to fetch jobs', 500);
    }
  }

  static async retryJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user!.userId;

      const jobRecord = await Job.findOne({ jobId });

      if (!jobRecord) {
        throw new AppError('Job not found', 404);
      }

      if (jobRecord.userId !== userId) {
        throw new AppError('Unauthorized access', 403);
      }

      if (jobRecord.status !== JobStatus.FAILED) {
        throw new AppError('Only failed jobs can be retried', 400);
      }

      const newJob = await addJob({
        type: jobRecord.type,
        data: jobRecord.payload,
        userId,
        workspaceId: jobRecord.workspaceId,
      });

      logger.info(`Job retried: ${jobId} as ${newJob.id}`);

      res.json({
        success: true,
        message: 'Job retried successfully',
        data: {
          jobId: newJob.id,
        },
      } as ApiResponse);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Retry job error:', error);
      throw new AppError('Failed to retry job', 500);
    }
  }
}

