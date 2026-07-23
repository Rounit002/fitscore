const { z } = require('zod');

// Condition validator
const conditionSchema = z.union([
  z.object({
    name: z.string().trim().min(1, 'Condition name cannot be empty').max(100, 'Condition name is too long'),
    severity: z.enum(['Low', 'Medium', 'High'], {
      errorMap: () => ({ message: "Severity must be 'Low', 'Medium', or 'High'" }),
    }).default('Medium'),
  }),
  z.string().trim().min(1, 'Condition name cannot be empty').max(100, 'Condition name is too long').transform(name => ({
    name,
    severity: 'Medium',
  }))
]);

// Main Profile JSONB Schema
const profileSchema = z.object({
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say', '']).or(z.null()).optional(),
  weight: z.union([
    z.number().min(0, 'Weight must be non-negative').max(500, 'Weight must be less than 500kg'),
    z.string().regex(/^\d*$/, 'Weight must be a number').transform(val => val === '' ? null : Number(val)),
    z.null()
  ]).optional(),
  height: z.union([
    z.number().min(0, 'Height must be non-negative').max(300, 'Height must be less than 300cm'),
    z.string().regex(/^\d*$/, 'Height must be a number').transform(val => val === '' ? null : Number(val)),
    z.null()
  ]).optional(),
  dateOfBirth: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of Birth must be in YYYY-MM-DD format'),
    z.literal(''),
    z.null()
  ]).optional(),
  conditions: z.array(conditionSchema).optional(),
  goals: z.array(z.string().trim().min(1, 'Goal cannot be empty').max(100, 'Goal name is too long')).optional(),
}).strict(); // strict to prevent injection of unexpected keys in the DB JSONB field

// Validator middleware for PUT /auth/profile
const validateProfileUpdate = (req, res, next) => {
  const schema = z.object({
    profile: profileSchema.optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
  }

  req.validatedBody = result.data;
  next();
};

// Validator middleware for PUT /auth/details
const validateDetailsUpdate = (req, res, next) => {
  const schema = z.object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(100, 'Name is too long').optional().nullable(),
    profile: profileSchema.optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
  }

  req.validatedBody = result.data;
  next();
};

module.exports = {
  validateProfileUpdate,
  validateDetailsUpdate,
};
