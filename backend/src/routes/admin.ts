import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { userStatusUpdateSchema, auditLogQuerySchema, userQuerySchema, UserStatusUpdateRequest, AuditLogQuery, UserQuery } from '../schemas/admin';
import { createApiError } from '../middleware/errorHandler';
import { logAuthEvent, logDataEvent } from '../utils/auditLogger';
import { getSessionInfoFromRequest } from '../utils/sessionManager';
import { getSystemStats, getUserActivityStats, getSecurityStats } from '../utils/dbStats';

const router = Router();

// Admin middleware to check if user has admin role
const isAdmin = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      const sessionInfo = getSessionInfoFromRequest(req);
      
      // Log unauthorized access attempt
      await logAuthEvent({
        userId,
        action: 'ADMIN_ACCESS',
        status: 'FAILED',
        metadata: { reason: 'UNAUTHORIZED' },
        sessionId: sessionInfo?.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(isAdmin);

// Get all users with pagination and filtering
router.get('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const query: UserQuery = userQuerySchema.parse(req.query);
    const { search, isActive, isVerified, accountLocked, page, limit } = query;
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Log the admin action
    await logAuthEvent({
      userId,
      action: 'ADMIN_ACCESS',
      status: 'SUCCESS',
      metadata: { resource: 'USERS_LIST', query: req.query },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    if (isVerified !== undefined) {
      whereClause.isVerified = isVerified;
    }

    if (accountLocked !== undefined) {
      whereClause.accountLocked = accountLocked;
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isVerified: true,
          accountLocked: true,
          accountLockedUntil: true,
          failedLoginAttempts: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              vaultEntries: true,
              sessions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    // Format response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      accountStatus: {
        locked: user.accountLocked,
        lockedUntil: user.accountLockedUntil?.toISOString() || null,
        failedLoginAttempts: user.failedLoginAttempts,
      },
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString() || null,
      stats: {
        vaultEntriesCount: user._count.vaultEntries,
        activeSessions: user._count.sessions,
      },
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.status(200).json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      },
    });
  } catch (error) {
    throw error;
  }
});

// Get user by ID
router.get('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Log the admin action
    await logAuthEvent({
      userId,
      action: 'ADMIN_ACCESS',
      status: 'SUCCESS',
      metadata: { resource: 'USER_DETAILS', targetUserId: id },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Get user
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isVerified: true,
        accountLocked: true,
        accountLockedUntil: true,
        failedLoginAttempts: true,
        createdAt: true,
        lastLogin: true,
        _count: {
          select: {
            vaultEntries: true,
            sessions: true,
            auditLogs: true,
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

    // Get recent sessions
    const recentSessions = await prisma.userSession.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
      },
    });

    // Format response
    const formattedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      accountStatus: {
        locked: user.accountLocked,
        lockedUntil: user.accountLockedUntil?.toISOString() || null,
        failedLoginAttempts: user.failedLoginAttempts,
      },
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString() || null,
      stats: {
        vaultEntriesCount: user._count.vaultEntries,
        activeSessions: user._count.sessions,
        auditLogsCount: user._count.auditLogs,
      },
      recentSessions: recentSessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        lastUsedAt: session.lastUsedAt?.toISOString() || null,
      })),
    };

    res.status(200).json({
      success: true,
      data: {
        user: formattedUser,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Update user status
router.put('/users/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData: UserStatusUpdateRequest = userStatusUpdateSchema.parse({
      ...req.body,
      userId: id,
    });
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
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

    // Prevent modifying other admins
    if (existingUser.role === 'ADMIN' && existingUser.id !== userId) {
      // Log failed admin action
      await logAuthEvent({
        userId,
        action: 'ADMIN_ACTION',
        status: 'FAILED',
        metadata: { 
          action: 'UPDATE_USER_STATUS', 
          targetUserId: id,
          reason: 'CANNOT_MODIFY_ADMIN'
        },
        sessionId: sessionInfo?.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot modify another admin user',
        },
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }
    
    if (validatedData.isVerified !== undefined) {
      updateData.isVerified = validatedData.isVerified;
    }
    
    if (validatedData.accountLocked !== undefined) {
      updateData.accountLocked = validatedData.accountLocked;
      
      // If unlocking account, reset failed login attempts
      if (validatedData.accountLocked === false) {
        updateData.failedLoginAttempts = 0;
        updateData.accountLockedUntil = null;
      }
    }
    
    if (validatedData.accountLockedUntil !== undefined) {
      updateData.accountLockedUntil = validatedData.accountLockedUntil;
    }
    
    if (validatedData.resetFailedLoginAttempts) {
      updateData.failedLoginAttempts = 0;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        isActive: true,
        isVerified: true,
        accountLocked: true,
        accountLockedUntil: true,
        failedLoginAttempts: true,
      },
    });

    // Log admin action
    await logAuthEvent({
      userId,
      action: 'ADMIN_ACTION',
      status: 'SUCCESS',
      metadata: { 
        action: 'UPDATE_USER_STATUS', 
        targetUserId: id,
        updatedFields: Object.keys(updateData),
      },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Format response
    const formattedUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      isActive: updatedUser.isActive,
      isVerified: updatedUser.isVerified,
      accountStatus: {
        locked: updatedUser.accountLocked,
        lockedUntil: updatedUser.accountLockedUntil?.toISOString() || null,
        failedLoginAttempts: updatedUser.failedLoginAttempts,
      },
    };

    res.status(200).json({
      success: true,
      data: {
        user: formattedUser,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Get audit logs with pagination and filtering
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const query: AuditLogQuery = auditLogQuerySchema.parse(req.query);
    const { userId: targetUserId, action, resourceType, status, startDate, endDate, page, limit } = query;
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Log the admin action
    await logAuthEvent({
      userId,
      action: 'ADMIN_ACCESS',
      status: 'SUCCESS',
      metadata: { resource: 'AUDIT_LOGS', query: req.query },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (targetUserId) {
      whereClause.userId = targetUserId;
    }

    if (action) {
      whereClause.action = action;
    }

    if (resourceType) {
      whereClause.resourceType = resourceType;
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereClause.timestamp = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.timestamp = {
        lte: new Date(endDate),
      };
    }

    // Get audit logs with pagination
    const [auditLogs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({
        where: whereClause,
      }),
    ]);

    // Format response
    const formattedLogs = auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      status: log.status,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      sessionId: log.sessionId,
      user: {
        id: log.userId,
        email: log.user.email,
        firstName: log.user.firstName || '',
        lastName: log.user.lastName || '',
      },
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.status(200).json({
      success: true,
      data: {
        auditLogs: formattedLogs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
      },
    });
  } catch (error) {
    throw error;
  }
});

// Get system statistics
router.get('/stats/system', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);
    
    // Log the admin action
    await logAuthEvent({
      userId,
      action: 'ADMIN_ACCESS',
      status: 'SUCCESS',
      metadata: { resource: 'SYSTEM_STATS' },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
    
    // Get system statistics
    const stats = await getSystemStats();
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    throw error;
  }
});

// Get user activity statistics
router.get('/stats/activity', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);
    
    // Log the admin action
    await logAuthEvent({
      userId,
      action: 'ADMIN_ACCESS',
      status: 'SUCCESS',
      metadata: { resource: 'ACTIVITY_STATS' },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
    
    // Get user activity statistics
    const stats = await getUserActivityStats();
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    throw error;
  }
});

// Get security statistics
router.get('/stats/security', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);
    
    // Log the admin action
    await logAuthEvent({
      userId,
      action: 'ADMIN_ACCESS',
      status: 'SUCCESS',
      metadata: { resource: 'SECURITY_STATS' },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
    
    // Get security statistics
    const stats = await getSecurityStats();
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    throw error;
  }
});

export default router;