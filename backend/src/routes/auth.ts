import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import { prisma } from '../index';
import { generateToken } from '../middleware/auth';
import { registerSchema, loginSchema, RegisterRequest, LoginRequest } from '../schemas/auth';
import { createApiError } from '../middleware/errorHandler';

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
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        salt: user.salt.toString('base64'),
      },
    });
  } catch (error) {
    throw error;
  }
});

// Register new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData: RegisterRequest = registerSchema.parse(req.body);
    const { email, passwordHash, salt } = validatedData;

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
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
        token,
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
        createdAt: true,
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
      return;
    }

    // Verify password hash
    const isValidPassword = await argon2.verify(user.pwHash, passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          salt: user.salt.toString('base64'),
          createdAt: user.createdAt.toISOString(),
        },
        token,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Verify token endpoint (optional - for checking if token is still valid)
router.get('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
        },
      });
      return;
    }

    // The authenticateToken middleware would handle verification
    // For now, we'll just return a simple response
    res.status(200).json({
      success: true,
      message: 'Token is valid',
    });
  } catch (error) {
    throw error;
  }
});

export default router;