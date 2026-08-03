const { z } = require('zod');
const { PLAN_IDS } = require('../config/plans');

const stripUnsafeMarkup = (value) => value
  .replace(/<[^>]*>/g, '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim();

const plainText = (max) => z.string().max(max).transform(stripUnsafeMarkup);
const optionalPlainText = (max) => plainText(max).optional().nullable();
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string()
  .min(12, 'Password must be at least 12 characters long')
  .max(128, 'Password must be at most 128 characters long')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

const positiveIdParams = z.object({ id: z.coerce.number().int().positive() }).strict();
const userIdParams = z.object({ userId: z.coerce.number().int().positive() }).strict();
const emptyBody = z.object({}).strict();

const auth = {
  register: z.object({
    email,
    password,
    name: plainText(100),
    dateOfBirth: z.string().date().optional(),
  }).strict(),
  login: z.object({ email, password: z.string().min(1).max(128) }).strict(),
  google: z.object({
    credential: z.string().max(10000).optional(),
    idToken: z.string().max(10000).optional(),
    id_token: z.string().max(10000).optional(),
    accessToken: z.string().max(10000).optional(),
    access_token: z.string().max(10000).optional(),
    email: email.optional(),
    name: optionalPlainText(100),
    googleId: z.string().max(255).optional(),
  }).strict(),
  forgotPassword: z.object({ email }).strict(),
  resetPassword: z.object({ token: z.string().min(40).max(200), password }).strict(),
  accountDeletionRequest: z.object({ email }).strict(),
  confirmAccountDeletion: z.object({ token: z.string().min(40).max(200) }).strict(),
  refresh: z.object({ refreshToken: z.string().min(40).max(500).optional() }).strict(),
  profilePicture: z.object({
    imageBase64: z.string().startsWith('data:image/').max(5_500_000),
  }).strict(),
};

const scans = {
  databaseQuery: z.object({ search: plainText(120).default('') }).strict(),
  create: z.object({
    productName: optionalPlainText(255),
    brand: optionalPlainText(255),
    score: z.coerce.number().int().min(0).max(10).optional().nullable(),
    ingredients: z.union([z.string().max(100000), z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional().nullable(),
    verdict: z.union([z.string().max(20000), z.record(z.string(), z.unknown())]).optional().nullable(),
    explanation: optionalPlainText(50000),
    alternatives: z.array(z.unknown()).max(100).optional().nullable(),
    sideEffects: z.array(z.unknown()).max(100).optional().nullable(),
    productData: z.record(z.string(), z.unknown())
      .refine((value) => Buffer.byteLength(JSON.stringify(value), 'utf8') <= 500_000, 'Product data is too large')
      .optional().nullable(),
    imageUrl: z.string().max(5_500_000).optional().nullable(),
    lang: z.string().min(2).max(35).optional(),
  }).strict(),
  servings: z.object({ servings: z.coerce.number().positive().max(100) }).strict(),
  eaten: z.object({ eaten: z.boolean().nullable() }).strict(),
  idParams: positiveIdParams,
};

const features = {
  create: z.object({
    title: plainText(140).pipe(z.string().min(3)),
    description: plainText(4000).pipe(z.string().min(10)),
    category: plainText(40).optional(),
  }).strict(),
  vote: z.object({ vote: z.enum(['up', 'down', 'none']) }).strict(),
  idParams: positiveIdParams,
};

const payments = {
  // Only the plan *id* is accepted from the client. The price is looked up
  // server-side in config/plans.js, so a tampered request cannot change what is
  // charged. Kept as an enum of known ids rather than a free string so an
  // unknown plan is a 400 rather than a silent fallback to the cheapest tier.
  createOrder: z.object({
    planId: z.enum(PLAN_IDS),
  }).strict(),
  razorpayVerify: z.object({
    razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/).max(100),
    razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/).max(100),
    razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
  }).strict(),
  revenueCatSync: z.object({ appUserId: z.string().max(100).optional() }).strict(),
  legacyBillingValidate: z.object({
    id: z.string().min(1).max(200),
    transaction: z.object({ purchaseToken: z.string().min(10).max(4096) }),
  }),
};

const analyze = {
  jobParams: z.object({ jobId: z.string().regex(/^[A-Za-z0-9_-]{6,128}$/) }).strict(),
};

module.exports = {
  analyze,
  auth,
  emptyBody,
  features,
  passwordSchema: password,
  payments,
  plainText,
  positiveIdParams,
  scans,
  stripUnsafeMarkup,
  userIdParams,
};
