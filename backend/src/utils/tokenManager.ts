/**
 * Token Manager Utility
 * 
 * This utility provides functions to manage email verification and password reset tokens
 * with enhanced security features including expiration and one-time use.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Token expiration times
const EMAIL_VERIFICATION_EXPIRES_IN_HOURS = 24;
const PASSWORD_RESET_EXPIRES_IN_HOURS = 1;

/**
 * Create an email verification token
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_EXPIRES_IN_HOURS);
  
  // Create token in database
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
  
  return token;
}

/**
 * Verify an email verification token
 */
export async function verifyEmailToken(userId: string, token: string): Promise<boolean> {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find token in database
    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    
    if (!verificationToken) {
      return false;
    }
    
    // Mark token as used
    await prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { used: true },
    });
    
    // Mark user as verified
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });
    
    return true;
  } catch (error) {
    console.error('Error verifying email token:', error);
    return false;
  }
}

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      return null;
    }
    
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSWORD_RESET_EXPIRES_IN_HOURS);
    
    // Create token in database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
    
    return token;
  } catch (error) {
    console.error('Error creating password reset token:', error);
    return null;
  }
}

/**
 * Verify a password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find token in database
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    
    if (!resetToken) {
      return null;
    }
    
    return resetToken.userId;
  } catch (error) {
    console.error('Error verifying password reset token:', error);
    return null;
  }
}

/**
 * Mark a password reset token as used
 */
export async function consumePasswordResetToken(token: string): Promise<boolean> {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find and update token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        used: false,
      },
    });
    
    if (!resetToken) {
      return false;
    }
    
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });
    
    return true;
  } catch (error) {
    console.error('Error consuming password reset token:', error);
    return false;
  }
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    // Call the database function to clean up expired tokens
    const result = await prisma.$queryRaw<{ cleanup_expired_tokens: number }>`SELECT cleanup_expired_tokens()`;
    return result[0].cleanup_expired_tokens;
  } catch (error) {
    console.error('Failed to clean up expired tokens:', error);
    return 0;
  }
}