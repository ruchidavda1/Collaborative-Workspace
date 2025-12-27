import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal } from '../utils/metrics';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Capture the original end function
  const originalEnd = res.end.bind(res);

  // Override res.end to capture metrics
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );

    httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode,
    });

    // Call the original end function
    return originalEnd(chunk, encoding, callback);
  };

  next();
};

