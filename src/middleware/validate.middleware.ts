import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Express middleware factory that validates request data against a Zod schema.
 * On success, replaces req[target] with the parsed (and defaulted) data.
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, 400, 'VALIDATION_ERROR', errors);
      return;
    }

    // Replace with parsed data (includes defaults and coercions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issues = (error as any).issues || (error as any).errors || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return issues.map((e: any) => {
    const field = e.path ? e.path.join('.') : '';
    return field ? `${field}: ${e.message}` : e.message;
  }).join('; ');
}
