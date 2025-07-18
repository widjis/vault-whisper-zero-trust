import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { profileUpdateSchema, passwordChangeSchema, ProfileUpdateRequest, PasswordChangeRequest } from '../schemas/profile';
import { createApiError } from '../middleware/errorHandler';
import { logAuthEvent, logDataEvent } from '../utils/auditLogger';
import { getSessionInfoFromRequest, revokeAllOtherSessions } from '../utils/sessionManager';
import argon2 from 'argon2';
import crypto from 'crypto';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get user profile
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Log the profile access event
    await logDataEvent({
      userId,
      action: 'READ',
      resourceType: 'USER_PROFILE',
      resourceId: userId,
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        createdAt: true,
        lastLogin: true,
        failedLoginAttempts: true,
        accountLocked: true,
        accountLockedUntil: true,
        _count: {
          select: {
            vaultEntries: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Format response
    const formattedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString() || null,
      accountStatus: {
        locked: user.accountLocked,
        lockedUntil: user.accountLockedUntil?.toISOString() || null,
      },
      stats: {
        vaultEntriesCount: user._count.vaultEntries,
        activeSessions: user._count.sessions,
      },
    };

    res.status(200).json({
      success: true,
      data: {
        profile: formattedUser,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Update user profile
router.put('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData: ProfileUpdateRequest = profileUpdateSchema.parse(req.body);
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Check if email is being updated and if it's already in use
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        res.status(400).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email is already in use',
          },
        });
        return;
      }

      // If email is being changed, set isVerified to false
      validatedData.email = validatedData.email.toLowerCase();
      (validatedData as any).isVerified = false;
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    // Log the profile update event
    await logDataEvent({
      userId,
      action: 'UPDATE',
      resourceType: 'USER_PROFILE',
      resourceId: userId,
      metadata: {
        updatedFields: Object.keys(validatedData),
      },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Format response
    const formattedUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName || '',
      lastName: updatedUser.lastName || '',
      isVerified: updatedUser.isVerified,
      createdAt: updatedUser.createdAt.toISOString(),
      lastLogin: updatedUser.lastLogin?.toISOString() || null,
    };

    res.status(200).json({
      success: true,
      data: {
        profile: formattedUser,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Change password
router.post('/change-password', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData: PasswordChangeRequest = passwordChangeSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        pwHash: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await argon2.verify(user.pwHash, currentPassword);
    if (!isPasswordValid) {
      // Log failed password change attempt
      await logAuthEvent({
        userId,
        action: 'PASSWORD_CHANGE',
        status: 'FAILED',
        metadata: { reason: 'INVALID_CURRENT_PASSWORD' },
        sessionId: sessionInfo?.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Current password is incorrect',
        },
      });
      return;
    }

    // Generate new salt and hash the new password
    const salt = crypto.randomBytes(16).toString('hex');
    const pwHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 1,
      salt: Buffer.from(salt, 'hex'),
    });

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: {
        pwHash,
        salt,
      },
    });

    // Revoke all other sessions for security
    await revokeAllOtherSessions(userId, sessionInfo?.sessionId || '');

    // Log successful password change
    await logAuthEvent({
      userId,
      action: 'PASSWORD_CHANGE',
      status: 'SUCCESS',
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. All other sessions have been logged out.',
    });
  } catch (error) {
    throw error;
  }
});

export default router;