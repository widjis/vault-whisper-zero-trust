import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as securityController from '../controllers/security.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get security score
router.get('/score', securityController.getSecurityScore);

// Get password health
router.get('/password-health', securityController.getPasswordHealth);

// Get security events
router.get('/events', securityController.getSecurityEvents);

export default router;