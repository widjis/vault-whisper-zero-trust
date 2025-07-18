import { prisma } from '../index';

/**
 * Database statistics utility
 * Provides methods to get various statistics about the database
 */

/**
 * Get overall system statistics
 * @returns Object containing system-wide statistics
 */
export async function getSystemStats() {
  try {
    // Get counts from various tables
    const [userCount, entryCount, sessionCount, auditLogCount] = await Promise.all([
      prisma.user.count(),
      prisma.vaultEntry.count(),
      prisma.userSession.count(),
      prisma.auditLog.count(),
    ]);

    // Get active user count (users with at least one active session)
    const activeUserCount = await prisma.user.count({
      where: {
        sessions: {
          some: {
            expiresAt: {
              gt: new Date(),
            },
          },
        },
      },
    });

    // Get verified user count
    const verifiedUserCount = await prisma.user.count({
      where: {
        isVerified: true,
      },
    });

    // Get locked account count
    const lockedAccountCount = await prisma.user.count({
      where: {
        accountLocked: true,
      },
    });

    // Get recent user registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUserCount = await prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get recent entry count (last 30 days)
    const recentEntryCount = await prisma.vaultEntry.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get recent audit log count (last 30 days)
    const recentAuditLogCount = await prisma.auditLog.count({
      where: {
        timestamp: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Return compiled statistics
    return {
      users: {
        total: userCount,
        active: activeUserCount,
        verified: verifiedUserCount,
        locked: lockedAccountCount,
        recentRegistrations: recentUserCount,
      },
      vaultEntries: {
        total: entryCount,
        recentlyCreated: recentEntryCount,
      },
      sessions: {
        total: sessionCount,
      },
      auditLogs: {
        total: auditLogCount,
        recent: recentAuditLogCount,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    throw error;
  }
}

/**
 * Get user activity statistics
 * @returns Object containing user activity statistics
 */
export async function getUserActivityStats() {
  try {
    // Time periods for analysis
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);
    
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(now.getDate() - 30);

    // Get login counts for different time periods
    const [dailyLogins, weeklyLogins, monthlyLogins] = await Promise.all([
      prisma.auditLog.count({
        where: {
          action: 'AUTH',
          resourceType: 'USER',
          metadata: {
            path: ['action'],
            equals: 'LOGIN',
          },
          status: 'SUCCESS',
          timestamp: {
            gte: oneDayAgo,
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: 'AUTH',
          resourceType: 'USER',
          metadata: {
            path: ['action'],
            equals: 'LOGIN',
          },
          status: 'SUCCESS',
          timestamp: {
            gte: oneWeekAgo,
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: 'AUTH',
          resourceType: 'USER',
          metadata: {
            path: ['action'],
            equals: 'LOGIN',
          },
          status: 'SUCCESS',
          timestamp: {
            gte: oneMonthAgo,
          },
        },
      }),
    ]);

    // Get failed login attempts
    const [dailyFailedLogins, weeklyFailedLogins, monthlyFailedLogins] = await Promise.all([
      prisma.auditLog.count({
        where: {
          action: 'AUTH',
          resourceType: 'USER',
          metadata: {
            path: ['action'],
            equals: 'LOGIN',
          },
          status: 'FAILED',
          timestamp: {
            gte: oneDayAgo,
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: 'AUTH',
          resourceType: 'USER',
          metadata: {
            path: ['action'],
            equals: 'LOGIN',
          },
          status: 'FAILED',
          timestamp: {
            gte: oneWeekAgo,
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: 'AUTH',
          resourceType: 'USER',
          metadata: {
            path: ['action'],
            equals: 'LOGIN',
          },
          status: 'FAILED',
          timestamp: {
            gte: oneMonthAgo,
          },
        },
      }),
    ]);

    // Get vault entry operations
    const [dailyEntryOps, weeklyEntryOps, monthlyEntryOps] = await Promise.all([
      prisma.auditLog.count({
        where: {
          resourceType: 'VAULT_ENTRY',
          timestamp: {
            gte: oneDayAgo,
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          resourceType: 'VAULT_ENTRY',
          timestamp: {
            gte: oneWeekAgo,
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          resourceType: 'VAULT_ENTRY',
          timestamp: {
            gte: oneMonthAgo,
          },
        },
      }),
    ]);

    // Return compiled statistics
    return {
      logins: {
        daily: dailyLogins,
        weekly: weeklyLogins,
        monthly: monthlyLogins,
      },
      failedLogins: {
        daily: dailyFailedLogins,
        weekly: weeklyFailedLogins,
        monthly: monthlyFailedLogins,
      },
      vaultOperations: {
        daily: dailyEntryOps,
        weekly: weeklyEntryOps,
        monthly: monthlyEntryOps,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting user activity stats:', error);
    throw error;
  }
}

/**
 * Get security statistics
 * @returns Object containing security-related statistics
 */
export async function getSecurityStats() {
  try {
    // Time periods for analysis
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(now.getDate() - 30);

    // Get security event counts
    const [securityEvents, failedSecurityEvents] = await Promise.all([
      prisma.auditLog.count({
        where: {
          action: 'SECURITY',
          timestamp: {
            gte: oneMonthAgo,
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          action: 'SECURITY',
          status: 'FAILED',
          timestamp: {
            gte: oneMonthAgo,
          },
        },
      }),
    ]);

    // Get password reset counts
    const passwordResets = await prisma.auditLog.count({
      where: {
        action: 'AUTH',
        resourceType: 'USER',
        metadata: {
          path: ['action'],
          equals: 'PASSWORD_RESET',
        },
        timestamp: {
          gte: oneMonthAgo,
        },
      },
    });

    // Get account lockouts
    const accountLockouts = await prisma.auditLog.count({
      where: {
        action: 'SECURITY',
        resourceType: 'USER',
        metadata: {
          path: ['action'],
          equals: 'ACCOUNT_LOCKOUT',
        },
        timestamp: {
          gte: oneMonthAgo,
        },
      },
    });

    // Get suspicious activity count (IP changes, unusual login times, etc.)
    const suspiciousActivities = await prisma.auditLog.count({
      where: {
        action: 'SECURITY',
        metadata: {
          path: ['suspicious'],
          equals: true,
        },
        timestamp: {
          gte: oneMonthAgo,
        },
      },
    });

    // Return compiled statistics
    return {
      securityEvents: {
        total: securityEvents,
        failed: failedSecurityEvents,
      },
      passwordResets,
      accountLockouts,
      suspiciousActivities,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting security stats:', error);
    throw error;
  }
}