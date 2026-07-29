const { validateBody, imageAnalysisSchema, textAnalysisSchema } = require('./validator');

describe('validateBody middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe('imageAnalysisSchema', () => {
    const middleware = validateBody(imageAnalysisSchema);

    it('calls next for valid body', () => {
      req.body = { imageBase64: 'data:image/png;base64,abc123' };
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('returns 400 when imageBase64 missing', () => {
      req.body = {};
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation failed' }));
    });

    it('returns 400 when imageBase64 empty', () => {
      req.body = { imageBase64: '' };
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('accepts optional userProfile', () => {
      req.body = { imageBase64: 'data:image/jpeg;base64,abc123', userProfile: { gender: 'Male', goals: ['lose weight'] } };
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('accepts null userProfile', () => {
      req.body = { imageBase64: 'data:image/webp;base64,abc123', userProfile: null };
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('textAnalysisSchema', () => {
    const middleware = validateBody(textAnalysisSchema);

    it('calls next for valid productData', () => {
      req.body = { productData: { product_name: 'Test' } };
      middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('returns 400 when productData missing', () => {
      req.body = {};
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('accepts passthrough fields in productData', () => {
      req.body = { productData: { product_name: 'X', extra_field: 'ok' } };
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  it('forwards non-Zod errors to next', () => {
    const err = new Error('unexpected');
    const badSchema = { parse: () => { throw err; } };
    const middleware = validateBody(badSchema);
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
