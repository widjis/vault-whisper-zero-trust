import { Request, Response, NextFunction } from 'express';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `The endpoint ${req.method} ${req.originalUrl} was not found`,
      timestamp: new Date().toISOString(),
    },
  });
};