import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = schema.parse(req.body);
    req.body = validated; // Replace with sanitized/validated data
    next();
  } catch (error: any) {
    console.error("[Validation Error]:", error.errors);
    return res.status(400).json({
      error: "ข้อมูลไม่ถูกต้อง",
      details: error.errors?.map((err: any) => ({
        path: err.path.join('.'),
        message: err.message
      })) || []
    });
  }
};
