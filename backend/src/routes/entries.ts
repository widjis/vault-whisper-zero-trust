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
      prisma.entry.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
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
      prisma.entry.count({
        where: whereClause,
      }),
    ]);

    // Convert binary data to base64
    const formattedEntries = entries.map((entry: {
      id: string;
      title: string;
      iv: Buffer;
      ciphertext: Buffer;
      tag: Buffer;
      createdAt: Date;
      updatedAt: Date;
    }) => ({
      id: entry.id,
      title: entry.title,
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

    // Find entry
    const entry = await prisma.entry.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        title: true,
        iv: true,
        ciphertext: true,
        tag: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!entry) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Entry not found or access denied',
        },
      });
      return;
    }

    // Format response
    const formattedEntry = {
      id: entry.id,
      title: entry.title,
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
    const { title, encryptedData } = validatedData;
    const userId = req.user!.id;

    // Convert base64 to binary
    const ivBuffer = Buffer.from(encryptedData.iv, 'base64');
    const ciphertextBuffer = Buffer.from(encryptedData.ciphertext, 'base64');
    const tagBuffer = Buffer.from(encryptedData.tag, 'base64');

    // Create entry
    const entry = await prisma.entry.create({
      data: {
        userId,
        title,
        iv: ivBuffer,
        ciphertext: ciphertextBuffer,
        tag: tagBuffer,
      },
      select: {
        id: true,
        title: true,
        iv: true,
        ciphertext: true,
        tag: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Format response
    const formattedEntry = {
      id: entry.id,
      title: entry.title,
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
    const { title, encryptedData } = validatedData;
    const userId = req.user!.id;

    // Check if entry exists and belongs to user
    const existingEntry = await prisma.entry.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingEntry) {
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
    
    if (encryptedData) {
      updateData.iv = Buffer.from(encryptedData.iv, 'base64');
      updateData.ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
      updateData.tag = Buffer.from(encryptedData.tag, 'base64');
    }

    // Update entry
    const entry = await prisma.entry.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        iv: true,
        ciphertext: true,
        tag: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Format response
    const formattedEntry = {
      id: entry.id,
      title: entry.title,
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

    // Check if entry exists and belongs to user
    const existingEntry = await prisma.entry.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingEntry) {
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
    await prisma.entry.delete({
      where: { id },
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