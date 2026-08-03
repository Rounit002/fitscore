const { z } = require('zod');
const { MINIMUM_AGE, MAXIMUM_AGE, isOldEnough } = require('../utils/ageCheck');
const { stripUnsafeMarkup } = require('../validation/schemas');

const safeText = (max) => z.string().trim().max(max).transform(stripUnsafeMarkup);

// Condition validator
const conditionSchema = z.union([
  z.object({
    name: safeText(100).pipe(z.string().min(1, 'Condition name cannot be empty')),
    severity: z.enum(['Low', 'Medium', 'High'], {
      errorMap: () => ({ message: "Severity must be 'Low', 'Medium', or 'High'" }),
    }).default('Medium'),
  }),
  safeText(100).pipe(z.string().min(1, 'Condition name cannot be empty')).transform(name => ({
    name,
    severity: 'Medium',
  }))
]);

// Main Profile JSONB Schema
const profileSchema = z.object({
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say', '']).or(z.null()).optional(),
  // Age is the field onboarding collects (date of birth is no longer asked).
  // The 13+ gate lives here so it applies to PUT /auth/profile and
  // PUT /auth/details alike and cannot be bypassed by editing the profile after
  // registration.
  age: z.union([
    z.number().int('Age must be a whole number')
      .min(MINIMUM_AGE, `You must be at least ${MINIMUM_AGE} years old to use bitezsnap`)
      .max(MAXIMUM_AGE, `Age must be ${MAXIMUM_AGE} or less`),
    z.string().regex(/^\d*$/, 'Age must be a number').transform(val => val === '' ? null : Number(val))
      .refine(val => val === null || (val >= MINIMUM_AGE && val <= MAXIMUM_AGE), {
        message: `You must be at least ${MINIMUM_AGE} years old to use bitezsnap`,
      }),
    z.null()
  ]).optional(),
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
    z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of Birth must be in YYYY-MM-DD format')
      // The 13+ age gate. Applied here so it covers PUT /auth/profile and
      // PUT /auth/details alike and cannot be skipped by editing the profile
      // after registration.
      .refine((value) => isOldEnough(value), {
        message: `You must be at least ${MINIMUM_AGE} years old to use bitezsnap`,
      }),
    z.literal(''),
    z.null()
  ]).optional(),
  conditions: z.array(conditionSchema).max(50).optional(),
  goals: z.array(safeText(100).pipe(z.string().min(1, 'Goal cannot be empty'))).max(50).optional(),
}).strict(); // strict to prevent injection of unexpected keys in the DB JSONB field

// Validator middleware for PUT /auth/profile
const validateProfileUpdate = (req, res, next) => {
  const schema = z.object({
    profile: profileSchema.optional(),
  }).strict();

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
    name: safeText(100).pipe(z.string().min(1, 'Name cannot be empty')).optional().nullable(),
    profile: profileSchema.optional(),
  }).strict();

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
