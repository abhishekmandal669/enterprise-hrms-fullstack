import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.name
    });
  }

  // Handle SyntaxError or Body Parsing Error
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload format in request body'
    });
  }

  console.error('[NEXUS_GLOBAL_ERROR]', err);
  return res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};
