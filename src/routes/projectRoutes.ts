import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ProjectController } from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Create a new project
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post(
  '/',
  validate([body('name').notEmpty().trim(), body('description').optional().trim()]),
  ProjectController.createProject
);

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get all projects for the authenticated user
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
 *         description: Projects retrieved successfully
 */
router.get(
  '/',
  validate([query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })]),
  ProjectController.getProjects
);

/**
 * @swagger
 * /api/v1/projects/{projectId}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get project by ID
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
 *         description: Project retrieved successfully
 */
router.get('/:projectId', validate([param('projectId').isUUID()]), ProjectController.getProjectById);

/**
 * @swagger
 * /api/v1/projects/{projectId}:
 *   put:
 *     tags:
 *       - Projects
 *     summary: Update project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
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
 *               settings:
 *                 type: object
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project updated successfully
 */
router.put('/:projectId', validate([param('projectId').isUUID()]), ProjectController.updateProject);

/**
 * @swagger
 * /api/v1/projects/{projectId}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Delete project
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
 *         description: Project deleted successfully
 */
router.delete('/:projectId', validate([param('projectId').isUUID()]), ProjectController.deleteProject);

export default router;

