export enum UserRole {
  OWNER = 'owner',
  COLLABORATOR = 'collaborator',
  VIEWER = 'viewer',
}

export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export enum EventType {
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  FILE_CHANGED = 'file_changed',
  CURSOR_MOVED = 'cursor_moved',
  ACTIVITY_UPDATE = 'activity_update',
  MESSAGE_SENT = 'message_sent',
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface JWTPayload {
  userId: string;
  email: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

export interface CollaborationEvent {
  type: EventType;
  workspaceId: string;
  userId: string;
  timestamp: Date;
  payload: any;
}

