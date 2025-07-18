import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import { prisma } from '../index';
import { AuthenticatedRequest } from '../middleware/auth';
import { registerSchema, loginSchema, RegisterRequest, LoginRequest } from '../schemas/auth';
import { createApiError } from '../middleware/errorHandler';
import { createSession, setAuthCookies, clearAuthCookies, getSessionInfoFromRequest, revokeSession, revokeAllOtherSessions } from '../utils/sessionManager';
import { logAuthEvent, logSecurityEvent } from '../utils/auditLogger';
import { createEmailVerificationToken, verifyEmailToken, createPasswordResetToken, verifyPasswordResetToken, consumePasswordResetToken } from '../utils/tokenManager';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get salt for user (for client-side password hashing)
router.post('/salt', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Valid email is required',
        },
      });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        salt: true,
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
      
      // Log the failed attempt
      await logAuthEvent(req, 'login', undefined, false, 'User not found');
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        salt: user.salt.toString('base64'),
      },
    });
  } catch (error) {
    console.error('Error getting salt:', error);
    throw error;
  }
});

// Register new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData: RegisterRequest = registerSchema.parse(req.body);
    const { email, passwordHash, salt, firstName, lastName } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'An account with this email already exists',
        },
      });
      await logAuthEvent(req, 'register', undefined, false, 'User already exists');
      return;
    }

    // Decode the salt from base64
    const saltBuffer = Buffer.from(salt, 'base64');
    
    // Validate salt length (should be 32 bytes)
    if (saltBuffer.length !== 32) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SALT',
          message: 'Salt must be exactly 32 bytes',
        },
      });
      await logAuthEvent(req, 'register', undefined, false, 'Invalid salt length');
      return;
    }

    // Hash the provided password hash with Argon2id for server storage
    // This creates a double-hashed password: Argon2id(client_hash)
    const serverPasswordHash = await argon2.hash(passwordHash, {
      type: argon2.argon2id,
      timeCost: parseInt(process.env.ARGON2_TIME_COST || '3'),
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536'),
      parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1'),
      hashLength: parseInt(process.env.ARGON2_HASH_LENGTH || '32'),
    });

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        pwHash: serverPasswordHash,
        salt: saltBuffer,
        firstName: firstName || null,
        lastName: lastName || null,
        isVerified: false,
        lastLogin: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        isVerified: true,
      },
    });

    // Create session
    const sessionInfo = getSessionInfoFromRequest(req);
    const { accessToken, refreshToken, expiresAt } = await createSession(
      user.id,
      user.email,
      sessionInfo
    );

    // Set cookies
    setAuthCookies(res, { accessToken, refreshToken, expiresAt });

    // Generate email verification token
    const verificationToken = await createEmailVerificationToken(user.id);
    // TODO: Send verification email with token

    // Log successful registration
    await logAuthEvent(req, 'register', user.id, true);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt.toISOString(),
          isVerified: user.isVerified,
        },
        token: accessToken,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    throw error;
  }
});

// Login user
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData: LoginRequest = loginSchema.parse(req.body);
    const { email, passwordHash } = validatedData;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        pwHash: true,
        salt: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        isVerified: true,
        failedLoginAttempts: true,
        lastFailedLogin: true,
        accountLocked: true,
        accountLockedUntil: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      await logAuthEvent(req, 'login', undefined, false, 'User not found');
      return;
    }

    // Check if account is locked
    if (user.accountLocked) {
      const lockedUntil = user.accountLockedUntil;
      if (lockedUntil && lockedUntil > new Date()) {
        // Account is temporarily locked
        res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account is temporarily locked due to too many failed login attempts',
            lockedUntil: lockedUntil.toISOString(),
          },
        });
        await logSecurityEvent(req, 'account-locked', user.id, { lockedUntil: lockedUntil.toISOString() }, false);
        return;
      } else if (!lockedUntil) {
        // Account is permanently locked (requires admin intervention)
        res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account is locked. Please contact support.',
          },
        });
        await logSecurityEvent(req, 'account-locked', user.id, { permanent: true }, false);
        return;
      }
      
      // If we get here, the temporary lock has expired, so we'll reset it
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accountLocked: false,
          accountLockedUntil: null,
          failedLoginAttempts: 0,
        },
      });
    }

    // Verify password hash
    const isValidPassword = await argon2.verify(user.pwHash, passwordHash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
      
      let updateData: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLogin: new Date(),
      };
      
      // Lock account after too many failed attempts
      if (failedAttempts >= maxAttempts) {
        const lockDuration = parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || '30');
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + lockDuration);
        
        updateData.accountLocked = true;
        updateData.accountLockedUntil = lockedUntil;
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
      
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          remainingAttempts: Math.max(0, maxAttempts - failedAttempts),
        },
      });
      
      await logAuthEvent(req, 'login', user.id, false, 'Invalid password');
      return;
    }

    // Reset failed login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        lastLogin: new Date(),
      },
    });

    // Create session
    const sessionInfo = getSessionInfoFromRequest(req);
    const { accessToken, refreshToken, expiresAt } = await createSession(
      user.id,
      user.email,
      sessionInfo
    );

    // Set cookies
    setAuthCookies(res, { accessToken, refreshToken, expiresAt });
    
    // Log successful login
    await logAuthEvent(req, 'login', user.id, true);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          salt: user.salt.toString('base64'),
          createdAt: user.createdAt.toISOString(),
          isVerified: user.isVerified,
        },
        token: accessToken,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    throw error;
  }
});

// Verify token endpoint (for checking if token is still valid)
router.get('/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // If we get here, the token is valid (authenticateToken middleware verified it)
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        isVerified: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user!.id,
          email: user!.email,
          firstName: user!.firstName,
          lastName: user!.lastName,
          createdAt: user!.createdAt.toISOString(),
          isVerified: user!.isVerified,
        },
      },
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Revoke the current session
    if (req.user && req.user.sessionId) {
      await revokeSession(req.user.sessionId);
      await logAuthEvent(req, 'logout', req.user.id, true);
    }
    
    // Clear auth cookies
    clearAuthCookies(res);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
});

// Refresh token endpoint
router.post('/refresh-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;
    
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
        },
      });
      return;
    }
    
    const sessionInfo = getSessionInfoFromRequest(req);
    const result = await refreshToken(refreshToken, sessionInfo);
    
    if (!result) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      });
      await logSecurityEvent(req, 'invalid-token', undefined, { tokenType: 'refresh' }, false);
      return;
    }
    
    // Set new access token cookie
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: result.expiresAt,
    });
    
    res.status(200).json({
      success: true,
      data: {
        token: result.accessToken,
        expiresAt: result.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
});

// Email verification endpoint
router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, token } = req.body;
    
    if (!userId || !token) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'User ID and token are required',
        },
      });
      return;
    }
    
    const verified = await verifyEmailToken(userId, token);
    
    if (!verified) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired verification token',
        },
      });
      await logSecurityEvent(req, 'invalid-token', userId, { tokenType: 'email_verification' }, false);
      return;
    }
    
    await logAuthEvent(req, 'register', userId, true, 'Email verified');
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    throw error;
  }
});

// Request password reset endpoint
router.post('/request-password-reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email is required',
        },
      });
      return;
    }
    
    const token = await createPasswordResetToken(email);
    
    // Always return success, even if email doesn't exist (security best practice)
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    });
    
    // TODO: Send password reset email with token
    
    // Only log if we actually found a user and created a token
    if (token) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await logAuthEvent(req, 'password-reset', user.id, true, 'Password reset requested');
      }
    }
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
});

// Reset password endpoint
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, passwordHash } = req.body;
    
    if (!token || !passwordHash) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Token and new password are required',
        },
      });
      return;
    }
    
    // Verify token and get user ID
    const userId = await verifyPasswordResetToken(token);
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
        },
      });
      await logSecurityEvent(req, 'invalid-token', undefined, { tokenType: 'password_reset' }, false);
      return;
    }
    
    // Hash the new password
    const serverPasswordHash = await argon2.hash(passwordHash, {
      type: argon2.argon2id,
      timeCost: parseInt(process.env.ARGON2_TIME_COST || '3'),
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536'),
      parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1'),
      hashLength: parseInt(process.env.ARGON2_HASH_LENGTH || '32'),
    });
    
    // Update user's password
    await prisma.user.update({
      where: { id: userId },
      data: {
        pwHash: serverPasswordHash,
        failedLoginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
      },
    });
    
    // Mark token as used
    await consumePasswordResetToken(token);
    
    // Revoke all sessions for this user
    await prisma.userSession.updateMany({
      where: { userId },
      data: { revoked: true },
    });
    
    await logAuthEvent(req, 'password-reset', userId, true, 'Password reset successful');
    
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
});

// Get active sessions endpoint
router.get('/sessions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsed: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsed: true,
        deviceFingerprint: true,
      },
    });
    
    // Mark current session
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      current: session.id === req.user!.sessionId,
      createdAt: session.createdAt.toISOString(),
      lastUsed: session.lastUsed?.toISOString(),
    }));
    
    res.status(200).json({
      success: true,
      data: {
        sessions: sessionsWithCurrent,
      },
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    throw error;
  }
});

// Revoke session endpoint
router.post('/revoke-session', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const userId = req.user!.id;
    
    if (!sessionId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Session ID is required',
        },
      });
      return;
    }
    
    // Check if session belongs to user
    const session = await prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });
    
    if (!session) {
      res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found or does not belong to user',
        },
      });
      await logSecurityEvent(req, 'permission-denied', userId, { sessionId }, false);
      return;
    }
    
    // Prevent revoking current session through this endpoint
    if (sessionId === req.user!.sessionId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_REVOKE_CURRENT',
          message: 'Cannot revoke current session. Use logout instead.',
        },
      });
      return;
    }
    
    // Revoke session
    await revokeSession(sessionId);
    await logSecurityEvent(req, 'security:session-revoked', userId, { sessionId }, true);
    
    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    throw error;
  }
});

// Revoke all other sessions endpoint
router.post('/revoke-all-sessions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const currentSessionId = req.user!.sessionId;
    
    // Revoke all sessions except current
    const count = await revokeAllOtherSessions(userId, currentSessionId);
    await logSecurityEvent(req, 'security:sessions-revoked', userId, { count }, true);
    
    res.status(200).json({
      success: true,
      message: `${count} sessions revoked successfully`,
      data: { count },
    });
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    throw error;
  }
});

export default router;