import { jobQueue } from '../queue/jobQueue';
import { Job } from '../database/models/Job';
import { JobStatus } from '../types';
import logger from '../utils/logger';
import config from '../config';

// Simulate code execution
const executeCode = async (_code: string, language: string): Promise<any> => {
  // Simulate execution time
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000));

  // Simulate random success/failure for demo
  if (Math.random() > 0.8) {
    throw new Error('Code execution failed: Syntax error or runtime exception');
  }

  return {
    output: `Executed ${language} code successfully`,
    executionTime: Math.floor(Math.random() * 1000),
    memoryUsed: Math.floor(Math.random() * 1024),
  };
};

// Process different job types
const processJob = async (jobData: any, progress: (value: number) => void) => {
  const { type, data } = jobData;

  progress(25);

  switch (type) {
    case 'code_execution': {
      const result = await executeCode(data.code, data.language);
      progress(75);
      return result;
    }

    case 'file_processing': {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      progress(75);
      return {
        status: 'processed',
        files: data.files,
        processedCount: data.files?.length || 0,
      };
    }

    case 'workspace_export': {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      progress(75);
      return {
        status: 'exported',
        workspaceId: data.workspaceId,
        exportUrl: `https://exports.example.com/${data.workspaceId}.zip`,
      };
    }

    default:
      throw new Error(`Unknown job type: ${type}`);
  }
};

// Job processor with idempotency and retry logic
jobQueue.process(config.jobQueue.concurrency, async (job) => {
  const { type, data, userId, workspaceId } = job.data;

  logger.info(`Processing job ${job.id}:`, { type, userId, workspaceId });

  try {
    // Update job status in MongoDB
    let jobRecord = await Job.findOne({ jobId: job.id as string });

    if (!jobRecord) {
      jobRecord = new Job({
        jobId: job.id as string,
        type,
        payload: data,
        userId,
        workspaceId,
        status: JobStatus.PROCESSING,
        retryCount: job.attemptsMade,
        maxRetries: job.opts.attempts || 3,
      });
    } else {
      // Idempotency: If job is already completed, return cached result
      if (jobRecord.status === JobStatus.COMPLETED) {
        logger.info(`Job ${job.id} already completed, returning cached result`);
        return jobRecord.result;
      }

      jobRecord.status = JobStatus.PROCESSING;
      jobRecord.retryCount = job.attemptsMade;
    }

    jobRecord.startedAt = new Date();
    await jobRecord.save();

    // Process the job
    const result = await processJob(job.data, (progress) => {
      job.progress(progress);
    });

    job.progress(100);

    // Update job as completed
    jobRecord.status = JobStatus.COMPLETED;
    jobRecord.result = result;
    jobRecord.completedAt = new Date();
    await jobRecord.save();

    logger.info(`Job ${job.id} completed successfully`);

    return result;
  } catch (error: any) {
    logger.error(`Job ${job.id} failed:`, error);

    // Update job status
    const jobRecord = await Job.findOne({ jobId: job.id as string });
    if (jobRecord) {
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        jobRecord.status = JobStatus.FAILED;
        jobRecord.error = error.message;
      } else {
        jobRecord.status = JobStatus.RETRYING;
        jobRecord.error = error.message;
      }
      jobRecord.retryCount = job.attemptsMade;
      await jobRecord.save();
    }

    throw error;
  }
});

logger.info('Job worker started');

