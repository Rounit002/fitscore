const { z } = require('zod');

// Schema for image analysis
const imageAnalysisSchema = z.object({
  imageBase64: z.string({
    required_error: 'imageBase64 is required',
  }).min(1, 'imageBase64 cannot be empty'),
  userProfile: z.object({
    age: z.any().optional(),
    gender: z.string().optional(),
    height: z.any().optional(),
    weight: z.any().optional(),
    activityLevel: z.string().optional(),
    medicalConditions: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
  }).optional().nullable(),
  lang: z.string().optional(),
});

// Schema for text/barcode analysis
const textAnalysisSchema = z.object({
  productData: z.object({
    product_name: z.string().optional().nullable(),
    brands: z.string().optional().nullable(),
    ingredients_text: z.string().optional().nullable(),
  }).passthrough(),
  userProfile: z.object({
    age: z.any().optional(),
    gender: z.string().optional(),
    height: z.any().optional(),
    weight: z.any().optional(),
    activityLevel: z.string().optional(),
    medicalConditions: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
  }).optional().nullable(),
  lang: z.string().optional(),
});

const validateBody = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: (err.issues || err.errors).map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    next(err);
  }
};

module.exports = {
  imageAnalysisSchema,
  textAnalysisSchema,
  validateBody,
};
