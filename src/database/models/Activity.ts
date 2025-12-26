import mongoose, { Schema, Document } from 'mongoose';
import { EventType } from '../../types';

export interface IActivity extends Document {
  workspaceId: string;
  userId: string;
  userName: string;
  eventType: EventType;
  payload: any;
  timestamp: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    workspaceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    eventType: {
      type: String,
      enum: Object.values(EventType),
      required: true,
      index: true,
    },
    payload: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

ActivitySchema.index({ workspaceId: 1, timestamp: -1 });
ActivitySchema.index({ userId: 1, timestamp: -1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);

