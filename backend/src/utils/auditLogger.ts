/**
 * Audit Logger Utility
 * 
 * This utility provides functions to log audit events to the database
 * for security monitoring and compliance purposes.
 */

import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export interface AuditLogOptions {
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(options: AuditLogOptions): Promise<string> {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        details: options.details,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        success: options.success,
        errorMessage: options.errorMessage,
      },
    });
    
    return auditLog.id;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Return a placeholder ID to avoid breaking the application flow
    return 'audit-log-failed';
  }
}

/**
 * Extract request information for audit logging
 */
export function getRequestInfo(req: Request): { ipAddress: string; userAgent: string } {
  const ipAddress = (
    req.headers['x-forwarded-for'] as string ||
    req.socket.remoteAddress ||
    ''
  ).split(',')[0].trim();
  
  const userAgent = req.headers['user-agent'] || '';
  
  return { ipAddress, userAgent };
}

/**
 * Log an authentication event
 */
export async function logAuthEvent(
  req: Request,
  action: 'login' | 'logout' | 'register' | 'password-reset' | 'token-refresh',
  userId: string | undefined,
  success: boolean,
  errorMessage?: string
): Promise<string> {
  const { ipAddress, userAgent } = getRequestInfo(req);
  
  return logAuditEvent({
    userId,
    action: `auth:${action}`,
    resourceType: 'user',
    resourceId: userId,
    details: { email: req.body?.email },
    ipAddress,
    userAgent,
    success,
    errorMessage,
  });
}

/**
 * Log a data access event
 */
export async function logDataEvent(
  req: Request,
  action: 'create' | 'read' | 'update' | 'delete',
  resourceType: string,
  resourceId: string,
  userId: string,
  success: boolean,
  errorMessage?: string
): Promise<string> {
  const { ipAddress, userAgent } = getRequestInfo(req);
  
  return logAuditEvent({
    userId,
    action: `data:${action}`,
    resourceType,
    resourceId,
    details: { path: req.path },
    ipAddress,
    userAgent,
    success,
    errorMessage,
  });
}

/**
 * Log a security event
 */
export async function logSecurityEvent(
  req: Request,
  action: 'rate-limit' | 'invalid-token' | 'permission-denied' | 'account-locked',
  userId: string | undefined,
  details: Record<string, any>,
  success: boolean = false,
  errorMessage?: string
): Promise<string> {
  const { ipAddress, userAgent } = getRequestInfo(req);
  
  return logAuditEvent({
    userId,
    action: `security:${action}`,
    resourceType: 'system',
    details,
    ipAddress,
    userAgent,
    success,
    errorMessage,
  });
}