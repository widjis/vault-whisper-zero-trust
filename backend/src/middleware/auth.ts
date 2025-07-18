import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { validateSession, getSessionInfoFromRequest } from '../utils/sessionManager';
import { logSecurityEvent } from '../utils/auditLogger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    sessionId: string;
  };
}

export interface JWTPayload {
  userId: string;
  sessionId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header or cookies
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]; // Bearer TOKEN
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
        },
      });
      await logSecurityEvent(req, 'invalid-token', undefined, { reason: 'missing_token' }, false);
      return;
    }

    // Validate session using the token
    const payload = await validateSession(token);
    
    if (!payload) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
      await logSecurityEvent(req, 'invalid-token', undefined, { reason: 'invalid_or_expired' }, false);
      return;
    }

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, isVerified: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with this token no longer exists',
        },
      });
      await logSecurityEvent(req, 'invalid-token', payload.userId, { reason: 'user_not_found' }, false);
      return;
    }
    
    // Optionally check if user is verified (for routes that require verification)
    if (req.path !== '/api/auth/verify-email' && req.originalUrl.includes('/api/secure/') && !user.isVerified) {
      res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email verification required to access this resource',
        },
      });
      await logSecurityEvent(req, 'permission-denied', user.id, { reason: 'email_not_verified' }, false);
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      sessionId: payload.sessionId
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during authentication',
      },
    });
    await logSecurityEvent(req, 'invalid-token', undefined, { reason: 'internal_error', error: String(error) }, false);
  }
};

// This function is now deprecated in favor of sessionManager.createSession
export const generateToken = (userId: string, email: string): string => {
  throw new Error('This function is deprecated. Use sessionManager.createSession instead.');

};