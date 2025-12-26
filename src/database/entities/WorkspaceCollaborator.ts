import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index, JoinColumn, Unique } from 'typeorm';
import { Workspace } from './Workspace';
import { User } from './User';
import { UserRole } from '../../types';

@Entity('workspace_collaborators')
@Unique(['workspaceId', 'userId'])
export class WorkspaceCollaborator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.collaborators, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  role: UserRole;

  @Column({ default: false })
  isAccepted: boolean;

  @Column({ nullable: true })
  invitedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

