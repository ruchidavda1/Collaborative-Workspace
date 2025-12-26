import mongoose, { Schema, Document } from 'mongoose';
import { JobStatus } from '../../types';

export interface IJob extends Document {
  jobId: string;
  type: string;
  status: JobStatus;
  payload: any;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  userId: string;
  workspaceId?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.PENDING,
      index: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

JobSchema.index({ createdAt: -1 });
JobSchema.index({ userId: 1, status: 1 });

export const Job = mongoose.model<IJob>('Job', JobSchema);

