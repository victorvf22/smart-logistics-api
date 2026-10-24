import { NextFunction, Request, Response } from 'express';
import { RouteCalculationError } from '../../domain/algorithms/dijkstra';
import { NetworkNotFoundError } from '../../application/services/network.service';
import { JobNotFoundError } from '../../application/services/route.service';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof NetworkNotFoundError || err instanceof JobNotFoundError) {
    res.status(404).json({
      statusCode: 404,
      error: 'Not Found',
      message: err.message
    });
    return;
  }

  if (err instanceof RouteCalculationError) {
    res.status(422).json({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: err.code,
      message: err.message
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid JSON payload format.'
    });
    return;
  }

  console.error('[ErrorHandler] Unhandled exception:', err);
  res.status(500).json({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'An unexpected server error occurred.'
  });
}
