import Bull, { Job as BullJob, Queue } from 'bull';
import config from '../config';
import logger from '../utils/logger';

export const jobQueue: Queue = new Bull('jobs', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
  defaultJobOptions: {
    attempts: config.jobQueue.maxRetries,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: false,
  },
});

jobQueue.on('error', (error) => {
  logger.error('Job queue error:', error);
});

jobQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed:`, error);
});

jobQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

export interface JobPayload {
  type: string;
  data: any;
  userId: string;
  workspaceId?: string;
}

export const addJob = async (payload: JobPayload): Promise<BullJob> => {
  return jobQueue.add(payload, {
    jobId: `${payload.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  });
};

export const getJobStatus = async (jobId: string) => {
  const job = await jobQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  return {
    id: job.id,
    type: job.data.type,
    status: state,
    progress: job.progress(),
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
};

