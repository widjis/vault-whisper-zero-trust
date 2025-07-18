import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { calculatePasswordStrength } from '../utils/passwordStrength';

/**
 * Get the security score for the authenticated user
 */
export const getSecurityScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: true,
        twoFactorBackupCodes: {
          where: { used: false },
        },
        vaultEntries: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate password age
    const passwordLastChanged = user.passwordChangedAt || user.createdAt;
    const daysSincePasswordChange = Math.floor(
      (Date.now() - passwordLastChanged.getTime()) / (1000 * 60 * 60 * 24)
    );
    const recentPasswordChange = daysSincePasswordChange < 90;

    // Calculate password strength for vault entries
    let weakPasswords = 0;
    let duplicatePasswords = new Set();
    let duplicateCount = 0;

    // Map to track password occurrences
    const passwordMap = new Map();

    user.vaultEntries.forEach((entry) => {
      if (entry.password) {
        // Check password strength
        const strength = calculatePasswordStrength(entry.password);
        if (strength < 40) {
          weakPasswords++;
        }

        // Check for duplicates
        if (passwordMap.has(entry.password)) {
          if (!duplicatePasswords.has(entry.password)) {
            duplicatePasswords.add(entry.password);
            duplicateCount++;
          }
          passwordMap.set(entry.password, passwordMap.get(entry.password) + 1);
        } else {
          passwordMap.set(entry.password, 1);
        }
      }
    });

    // Calculate overall security score
    const twoFactorScore = user.twoFactorEnabled ? 25 : 0;
    const passwordStrengthScore = Math.min(25, Math.max(0, 25 - (weakPasswords * 5)));
    const passwordAgeScore = recentPasswordChange ? 15 : 0;
    const backupCodesScore = user.twoFactorBackupCodes.length > 0 ? 15 : 0;
    const sessionsScore = Math.min(10, Math.max(0, 10 - ((user.sessions.length - 1) * 2)));
    const duplicateScore = Math.min(10, Math.max(0, 10 - (duplicateCount * 2)));

    const overallScore = Math.min(100, 
      twoFactorScore + 
      passwordStrengthScore + 
      passwordAgeScore + 
      backupCodesScore + 
      sessionsScore + 
      duplicateScore
    );

    return res.status(200).json({
      overall: overallScore,
      passwordStrength: passwordStrengthScore * 4, // Scale to 0-100
      twoFactorEnabled: user.twoFactorEnabled,
      unusedBackupCodes: user.twoFactorBackupCodes.length,
      recentPasswordChange,
      activeSessions: user.sessions.length,
      weakPasswords,
      expiredPasswords: 0, // Not implemented yet
      duplicatePasswords: duplicateCount,
    });
  } catch (error) {
    logger.error('Error getting security score:', error);
    return res.status(500).json({ message: 'Failed to get security score' });
  }
};

/**
 * Get password health statistics for the authenticated user
 */
export const getPasswordHealth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's vault entries
    const vaultEntries = await prisma.vaultEntry.findMany({
      where: { userId },
      select: {
        id: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate password health statistics
    let weak = 0;
    let medium = 0;
    let strong = 0;
    let expired = 0;
    let expiringSoon = 0;
    let duplicates = 0;
    const total = vaultEntries.length;
    const passwordMap = new Map();

    // Current date for expiry calculations
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    vaultEntries.forEach((entry) => {
      if (entry.password) {
        // Check password strength
        const strength = calculatePasswordStrength(entry.password);
        if (strength < 40) {
          weak++;
        } else if (strength < 70) {
          medium++;
        } else {
          strong++;
        }

        // Check password age
        const lastUpdated = entry.updatedAt || entry.createdAt;
        if (lastUpdated < ninetyDaysAgo) {
          expired++;
        } else if (lastUpdated < thirtyDaysAgo) {
          expiringSoon++;
        }

        // Check for duplicates
        if (passwordMap.has(entry.password)) {
          duplicates++;
          passwordMap.set(entry.password, passwordMap.get(entry.password) + 1);
        } else {
          passwordMap.set(entry.password, 1);
        }
      }
    });

    // Adjust duplicates count to represent unique passwords that are duplicated
    duplicates = Array.from(passwordMap.values()).filter(count => count > 1).length;

    return res.status(200).json({
      weak,
      medium,
      strong,
      expired,
      expiringSoon,
      duplicates,
      total,
    });
  } catch (error) {
    logger.error('Error getting password health:', error);
    return res.status(500).json({ message: 'Failed to get password health statistics' });
  }
};

/**
 * Get security events for the authenticated user
 */
export const getSecurityEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const events = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // Transform audit logs to security events
    const securityEvents = events.map(event => ({
      id: event.id,
      eventType: event.action,
      ipAddress: event.ipAddress || 'Unknown',
      userAgent: event.userAgent || 'Unknown',
      timestamp: event.timestamp.toISOString(),
      details: event.details || '',
    }));

    return res.status(200).json(securityEvents);
  } catch (error) {
    logger.error('Error getting security events:', error);
    return res.status(500).json({ message: 'Failed to get security events' });
  }
};