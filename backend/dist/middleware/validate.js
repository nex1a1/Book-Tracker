import { ZodError } from 'zod';
export const validate = (schema) => (req, res, next) => {
    try {
        const validated = schema.parse(req.body);
        req.body = validated; // Replace with sanitized/validated data
        next();
    }
    catch (error) {
        if (error instanceof ZodError) {
            console.error("[Validation Error]:", error.errors);
            return res.status(400).json({
                error: "ข้อมูลไม่ถูกต้อง",
                details: error.errors.map((err) => ({
                    path: err.path.join('.'),
                    message: err.message
                }))
            });
        }
        return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง", details: [] });
    }
};
