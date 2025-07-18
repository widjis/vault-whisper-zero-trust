import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import {
  createEntrySchema,
  updateEntrySchema,
  entryIdSchema,
  listEntriesQuerySchema,
  CreateEntryRequest,
  UpdateEntryRequest,
  EntryIdParams,
  ListEntriesQuery,
} from '../schemas/entries';
import { createApiError } from '../middleware/errorHandler';
import { logDataEvent } from '../utils/auditLogger';
import { getSessionInfoFromRequest } from '../utils/sessionManager';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all entries for authenticated user
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const query: ListEntriesQuery = listEntriesQuerySchema.parse(req.query);
    const { page, limit, search } = query;
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Log the data access event
    await logDataEvent({
      userId,
      action: 'LIST',
      resourceType: 'VAULT_ENTRY',
      resourceId: null,
      metadata: { search: search || null },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      userId,
    };

    // Add search filter if provided
    if (search) {
      whereClause.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Get entries with pagination
    const [entries, totalCount] = await Promise.all([
      prisma.vaultEntry.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          category: true,
          favorite: true,
          tags: true,
          iv: true,
          ciphertext: true,
          tag: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.vaultEntry.count({
        where: whereClause,
      }),
    ]);

    // Convert binary data to base64
    const formattedEntries = entries.map((entry: {
      id: string;
      title: string;
      category: string;
      favorite: boolean;
      tags: string[];
      iv: Buffer;
      ciphertext: Buffer;
      tag: Buffer;
      createdAt: Date;
      updatedAt: Date;
    }) => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      favorite: entry.favorite,
      tags: entry.tags || [],
      encryptedData: {
        iv: entry.iv.toString('base64'),
        ciphertext: entry.ciphertext.toString('base64'),
        tag: entry.tag.toString('base64'),
      },
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.status(200).json({
      success: true,
      data: {
        entries: formattedEntries,
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

// Get single entry by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate entry ID
    const params: EntryIdParams = entryIdSchema.parse(req.params);
    const { id } = params;
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Find entry
    const entry = await prisma.vaultEntry.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        title: true,
        category: true,
        favorite: true,
        tags: true,
        iv: true,
        ciphertext: true,
        tag: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!entry) {
      // Log failed access attempt
      await logDataEvent({
        userId,
        action: 'READ',
        resourceType: 'VAULT_ENTRY',
        resourceId: id,
        status: 'FAILED',
        metadata: { reason: 'NOT_FOUND' },
        sessionId: sessionInfo?.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });

      res.status(404).json({
        success: false,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Entry not found or access denied',
        },
      });
      return;
    }

    // Log successful access
    await logDataEvent({
      userId,
      action: 'READ',
      resourceType: 'VAULT_ENTRY',
      resourceId: id,
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Format response
    const formattedEntry = {
      id: entry.id,
      title: entry.title,
      category: entry.category,
      favorite: entry.favorite,
      tags: entry.tags || [],
      encryptedData: {
        iv: entry.iv.toString('base64'),
        ciphertext: entry.ciphertext.toString('base64'),
        tag: entry.tag.toString('base64'),
      },
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };

    res.status(200).json({
      success: true,
      data: {
        entry: formattedEntry,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Create new entry
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData: CreateEntryRequest = createEntrySchema.parse(req.body);
    const { title, category, favorite, tags, encryptedData } = validatedData;
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Convert base64 to binary
    const ivBuffer = Buffer.from(encryptedData.iv, 'base64');
    const ciphertextBuffer = Buffer.from(encryptedData.ciphertext, 'base64');
    const tagBuffer = Buffer.from(encryptedData.tag, 'base64');

    // Create entry
    const entry = await prisma.vaultEntry.create({
      data: {
        userId,
        title,
        category: category || 'OTHER',
        favorite: favorite || false,
        tags: tags || [],
        iv: ivBuffer,
        ciphertext: ciphertextBuffer,
        tag: tagBuffer,
      },
      select: {
        id: true,
        title: true,
        category: true,
        favorite: true,
        tags: true,
        iv: true,
        ciphertext: true,
        tag: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log the creation event
    await logDataEvent({
      userId,
      action: 'CREATE',
      resourceType: 'VAULT_ENTRY',
      resourceId: entry.id,
      metadata: { title: entry.title, category: entry.category },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Format response
    const formattedEntry = {
      id: entry.id,
      title: entry.title,
      category: entry.category,
      favorite: entry.favorite,
      tags: entry.tags || [],
      encryptedData: {
        iv: entry.iv.toString('base64'),
        ciphertext: entry.ciphertext.toString('base64'),
        tag: entry.tag.toString('base64'),
      },
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };

    res.status(201).json({
      success: true,
      data: {
        entry: formattedEntry,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Update entry
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate entry ID and request body
    const params: EntryIdParams = entryIdSchema.parse(req.params);
    const validatedData: UpdateEntryRequest = updateEntrySchema.parse(req.body);
    const { id } = params;
    const { title, category, favorite, tags, encryptedData } = validatedData;
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Check if entry exists and belongs to user
    const existingEntry = await prisma.vaultEntry.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingEntry) {
      // Log failed update attempt
      await logDataEvent({
        userId,
        action: 'UPDATE',
        resourceType: 'VAULT_ENTRY',
        resourceId: id,
        status: 'FAILED',
        metadata: { reason: 'NOT_FOUND' },
        sessionId: sessionInfo?.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });

      res.status(404).json({
        success: false,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Entry not found or access denied',
        },
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    
    if (title !== undefined) {
      updateData.title = title;
    }
    
    if (category !== undefined) {
      updateData.category = category;
    }
    
    if (favorite !== undefined) {
      updateData.favorite = favorite;
    }
    
    if (tags !== undefined) {
      updateData.tags = tags;
    }
    
    if (encryptedData) {
      updateData.iv = Buffer.from(encryptedData.iv, 'base64');
      updateData.ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
      updateData.tag = Buffer.from(encryptedData.tag, 'base64');
    }

    // Update entry
    const entry = await prisma.vaultEntry.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        category: true,
        favorite: true,
        tags: true,
        iv: true,
        ciphertext: true,
        tag: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log the update event
    await logDataEvent({
      userId,
      action: 'UPDATE',
      resourceType: 'VAULT_ENTRY',
      resourceId: id,
      metadata: { title: entry.title, category: entry.category },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // Format response
    const formattedEntry = {
      id: entry.id,
      title: entry.title,
      category: entry.category,
      favorite: entry.favorite,
      tags: entry.tags || [],
      encryptedData: {
        iv: entry.iv.toString('base64'),
        ciphertext: entry.ciphertext.toString('base64'),
        tag: entry.tag.toString('base64'),
      },
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };

    res.status(200).json({
      success: true,
      data: {
        entry: formattedEntry,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Delete entry
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate entry ID
    const params: EntryIdParams = entryIdSchema.parse(req.params);
    const { id } = params;
    const userId = req.user!.id;
    const sessionInfo = getSessionInfoFromRequest(req);

    // Check if entry exists and belongs to user
    const existingEntry = await prisma.vaultEntry.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        title: true,
        category: true,
      },
    });

    if (!existingEntry) {
      // Log failed delete attempt
      await logDataEvent({
        userId,
        action: 'DELETE',
        resourceType: 'VAULT_ENTRY',
        resourceId: id,
        status: 'FAILED',
        metadata: { reason: 'NOT_FOUND' },
        sessionId: sessionInfo?.sessionId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      });

      res.status(404).json({
        success: false,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Entry not found or access denied',
        },
      });
      return;
    }

    // Delete entry
    await prisma.vaultEntry.delete({
      where: { id },
    });

    // Log the deletion event
    await logDataEvent({
      userId,
      action: 'DELETE',
      resourceType: 'VAULT_ENTRY',
      resourceId: id,
      metadata: { title: existingEntry.title, category: existingEntry.category },
      sessionId: sessionInfo?.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    res.status(200).json({
      success: true,
      message: 'Entry deleted successfully',
    });
  } catch (error) {
    throw error;
  }
});

export default router;