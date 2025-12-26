import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { JobController } from '../controllers/jobController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Create a new job
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - data
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [code_execution, file_processing, workspace_export]
 *               data:
 *                 type: object
 *               workspaceId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job created successfully
 */
router.post(
  '/',
  validate([
    body('type').isIn(['code_execution', 'file_processing', 'workspace_export']),
    body('data').isObject(),
    body('workspaceId').optional().isUUID(),
  ]),
  JobController.createJob
);

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     tags:
 *       - Jobs
 *     summary: Get all jobs for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 */
router.get(
  '/',
  validate([query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })]),
  JobController.getUserJobs
);

/**
 * @swagger
 * /api/v1/jobs/{jobId}:
 *   get:
 *     tags:
 *       - Jobs
 *     summary: Get job status by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 */
router.get('/:jobId', validate([param('jobId').notEmpty()]), JobController.getJobById);

/**
 * @swagger
 * /api/v1/jobs/{jobId}/retry:
 *   post:
 *     tags:
 *       - Jobs
 *     summary: Retry a failed job
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job retried successfully
 */
router.post('/:jobId/retry', validate([param('jobId').notEmpty()]), JobController.retryJob);

export default router;

