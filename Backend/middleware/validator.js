const { z } = require('zod');
const { stripUnsafeMarkup } = require('../validation/schemas');

const safeText = (max) => z.string().max(max).transform(stripUnsafeMarkup);
const optionalNumber = (min, max) => z.preprocess(
  (value) => (value === null || value === undefined || value === '' ? value : Number(value)),
  z.union([z.number().finite().min(min).max(max), z.null()]).optional(),
);
const condition = z.union([
  safeText(100),
  z.object({
    name: safeText(100),
    severity: z.enum(['Low', 'Medium', 'High']).optional(),
  }).strict(),
]);
const userProfile = z.object({
  age: optionalNumber(0, 130),
  gender: safeText(40).optional(),
  height: optionalNumber(0, 300),
  weight: optionalNumber(0, 500),
  activityLevel: safeText(60).optional(),
  medicalConditions: z.array(condition).max(50).optional(),
  conditions: z.array(condition).max(50).optional(),
  goals: z.array(safeText(100)).max(50).optional(),
}).strict().optional().nullable();

const locale = z.string().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/).max(35).optional();

const imageAnalysisSchema = z.object({
  imageBase64: z.string()
    .max(5_500_000, 'Image is too large')
    .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/, 'Unsupported image format'),
  userProfile,
  lang: locale,
}).strict();

const boundedProduct = z.object({
  product_name: safeText(255).optional().nullable(),
  brands: safeText(255).optional().nullable(),
  ingredients_text: safeText(100_000).optional().nullable(),
}).passthrough().refine(
  (value) => Buffer.byteLength(JSON.stringify(value), 'utf8') <= 500_000,
  'Product data is too large',
);

const textAnalysisSchema = z.object({
  productData: boundedProduct,
  userProfile,
  lang: locale,
}).strict();

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    return next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return next(error);
  }
};

module.exports = { imageAnalysisSchema, textAnalysisSchema, validateBody };
