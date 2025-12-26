import { Router } from 'express';
import { body, param } from 'express-validator';
import { WorkspaceController } from '../controllers/workspaceController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/workspaces:
 *   post:
 *     tags:
 *       - Workspaces
 *     summary: Create a new workspace
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - projectId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               projectId:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Workspace created successfully
 */
router.post(
  '/',
  validate([body('name').notEmpty().trim(), body('projectId').isUUID(), body('description').optional().trim()]),
  WorkspaceController.createWorkspace
);

/**
 * @swagger
 * /api/v1/workspaces/project/{projectId}:
 *   get:
 *     tags:
 *       - Workspaces
 *     summary: Get all workspaces for a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspaces retrieved successfully
 */
router.get('/project/:projectId', validate([param('projectId').isUUID()]), WorkspaceController.getWorkspaces);

/**
 * @swagger
 * /api/v1/workspaces/{workspaceId}:
 *   get:
 *     tags:
 *       - Workspaces
 *     summary: Get workspace by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace retrieved successfully
 */
router.get('/:workspaceId', validate([param('workspaceId').isUUID()]), WorkspaceController.getWorkspaceById);

/**
 * @swagger
 * /api/v1/workspaces/{workspaceId}:
 *   put:
 *     tags:
 *       - Workspaces
 *     summary: Update workspace
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 */
router.put('/:workspaceId', validate([param('workspaceId').isUUID()]), WorkspaceController.updateWorkspace);

/**
 * @swagger
 * /api/v1/workspaces/{workspaceId}:
 *   delete:
 *     tags:
 *       - Workspaces
 *     summary: Delete workspace
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 */
router.delete('/:workspaceId', validate([param('workspaceId').isUUID()]), WorkspaceController.deleteWorkspace);

/**
 * @swagger
 * /api/v1/workspaces/{workspaceId}/collaborators:
 *   post:
 *     tags:
 *       - Workspaces
 *     summary: Invite a collaborator
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [owner, collaborator, viewer]
 *     responses:
 *       201:
 *         description: Collaborator invited successfully
 */
router.post(
  '/:workspaceId/collaborators',
  validate([param('workspaceId').isUUID(), body('email').isEmail().normalizeEmail(), body('role').optional().isIn(['owner', 'collaborator', 'viewer'])]),
  WorkspaceController.inviteCollaborator
);

/**
 * @swagger
 * /api/v1/workspaces/{workspaceId}/collaborators/{collaboratorId}:
 *   put:
 *     tags:
 *       - Workspaces
 *     summary: Update collaborator role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: collaboratorId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [owner, collaborator, viewer]
 *     responses:
 *       200:
 *         description: Collaborator role updated successfully
 */
router.put(
  '/:workspaceId/collaborators/:collaboratorId',
  validate([param('workspaceId').isUUID(), param('collaboratorId').isUUID(), body('role').isIn(['owner', 'collaborator', 'viewer'])]),
  WorkspaceController.updateCollaboratorRole
);

/**
 * @swagger
 * /api/v1/workspaces/{workspaceId}/collaborators/{collaboratorId}:
 *   delete:
 *     tags:
 *       - Workspaces
 *     summary: Remove a collaborator
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: collaboratorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collaborator removed successfully
 */
router.delete(
  '/:workspaceId/collaborators/:collaboratorId',
  validate([param('workspaceId').isUUID(), param('collaboratorId').isUUID()]),
  WorkspaceController.removeCollaborator
);

export default router;

