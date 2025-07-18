/**
 * Session Manager Utility
 * 
 * This utility provides functions to manage user sessions with enhanced security features
 * including token management, device tracking, and session revocation.
 */

import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

interface TokenPayload {
  userId: string;
  sessionId: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface SessionInfo {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

/**
 * Create a new user session
 */
export async function createSession(
  userId: string,
  email: string,
  sessionInfo: SessionInfo
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  // Generate tokens
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  // Calculate expiration
  const expiresIn = parseInt(JWT_EXPIRES_IN.replace(/\D/g, ''), 10);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresIn);
  
  // Calculate refresh token expiration
  const refreshExpiresIn = parseInt(REFRESH_TOKEN_EXPIRES_IN.replace(/\D/g, ''), 10);
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + refreshExpiresIn);
  
  // Create session in database
  const session = await prisma.userSession.create({
    data: {
      userId,
      tokenHash: 'placeholder', // Will be updated after JWT is created
      refreshTokenHash,
      expiresAt: refreshExpiresAt,
      ipAddress: sessionInfo.ipAddress,
      userAgent: sessionInfo.userAgent,
      deviceFingerprint: sessionInfo.deviceFingerprint,
    },
  });
  
  // Create JWT with session ID
  const payload: TokenPayload = {
    userId,
    sessionId: session.id,
    email,
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  
  // Update session with token hash
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  await prisma.userSession.update({
    where: { id: session.id },
    data: { tokenHash },
  });
  
  return { accessToken, refreshToken, expiresAt };
}

/**
 * Validate a user session
 */
export async function validateSession(token: string): Promise<TokenPayload | null> {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Check if session exists and is not revoked
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await prisma.userSession.findFirst({
      where: {
        id: decoded.sessionId,
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });
    
    if (!session) {
      return null;
    }
    
    // Update last used timestamp
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsed: new Date() },
    });
    
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshToken(
  refreshToken: string,
  sessionInfo: SessionInfo
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  try {
    // Find session by refresh token hash
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await prisma.userSession.findFirst({
      where: {
        refreshTokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    
    if (!session) {
      return null;
    }
    
    // Create new access token
    const payload: TokenPayload = {
      userId: session.userId,
      sessionId: session.id,
      email: session.user.email,
    };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    
    // Calculate expiration
    const expiresIn = parseInt(JWT_EXPIRES_IN.replace(/\D/g, ''), 10);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresIn);
    
    // Update session with new token hash and info
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        tokenHash,
        lastUsed: new Date(),
        ipAddress: sessionInfo.ipAddress || session.ipAddress,
        userAgent: sessionInfo.userAgent || session.userAgent,
      },
    });
    
    return { accessToken, expiresAt };
  } catch (error) {
    return null;
  }
}

/**
 * Revoke a user session
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { revoked: true },
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Revoke all sessions for a user except the current one
 */
export async function revokeAllOtherSessions(userId: string, currentSessionId: string): Promise<number> {
  try {
    const result = await prisma.userSession.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        revoked: false,
      },
      data: { revoked: true },
    });
    
    return result.count;
  } catch (error) {
    return 0;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<any[]> {
  try {
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
    
    return sessions;
  } catch (error) {
    return [];
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    // Call the database function to clean up expired tokens
    const result = await prisma.$queryRaw<{ cleanup_expired_tokens: number }>`SELECT cleanup_expired_tokens()`;
    return result[0].cleanup_expired_tokens;
  } catch (error) {
    console.error('Failed to clean up expired sessions:', error);
    return 0;
  }
}

/**
 * Extract session info from request
 */
export function getSessionInfoFromRequest(req: Request): SessionInfo {
  const ipAddress = (
    req.headers['x-forwarded-for'] as string ||
    req.socket.remoteAddress ||
    ''
  ).split(',')[0].trim();
  
  const userAgent = req.headers['user-agent'] || '';
  
  // Simple device fingerprint based on headers
  // In production, you might want to use a more sophisticated approach
  const headers = JSON.stringify({
    accept: req.headers.accept,
    'accept-language': req.headers['accept-language'],
    'user-agent': userAgent,
    'sec-ch-ua': req.headers['sec-ch-ua'],
  });
  
  const deviceFingerprint = crypto
    .createHash('sha256')
    .update(headers)
    .digest('hex');
  
  return { ipAddress, userAgent, deviceFingerprint };
}

/**
 * Set authentication cookies
 */
export function setAuthCookies(
  res: Response,
  { accessToken, refreshToken, expiresAt }: { accessToken: string; refreshToken: string; expiresAt: Date }
): void {
  // Set HTTP-only cookies for tokens
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
  });
  
  // Refresh token with longer expiration
  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days
  
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: refreshExpiresAt,
  });
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
}