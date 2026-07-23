const { validateProfileUpdate, validateDetailsUpdate } = require('./profileValidator');

describe('profileValidator middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  describe('validateProfileUpdate', () => {
    it('calls next for valid profile', () => {
      req.body = { profile: { gender: 'Male', weight: 70, height: 175 } };
      validateProfileUpdate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.validatedBody).toBeDefined();
    });

    it('calls next with empty body', () => {
      req.body = {};
      validateProfileUpdate(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 400 for invalid gender', () => {
      req.body = { profile: { gender: 'Invalid' } };
      validateProfileUpdate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation failed' }));
    });

    it('returns 400 for weight > 500', () => {
      req.body = { profile: { weight: 600 } };
      validateProfileUpdate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for height > 300', () => {
      req.body = { profile: { height: 400 } };
      validateProfileUpdate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid dateOfBirth format', () => {
      req.body = { profile: { dateOfBirth: '25-06-2000' } };
      validateProfileUpdate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('accepts valid conditions array', () => {
      req.body = { profile: { conditions: [{ name: 'Diabetes', severity: 'High' }] } };
      validateProfileUpdate(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('accepts string conditions (transformed)', () => {
      req.body = { profile: { conditions: ['Diabetes'] } };
      validateProfileUpdate(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects unexpected keys (strict)', () => {
      req.body = { profile: { unknownField: 'hack' } };
      validateProfileUpdate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateDetailsUpdate', () => {
    it('calls next for valid name + profile', () => {
      req.body = { name: 'John', profile: { gender: 'Male' } };
      validateDetailsUpdate(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.validatedBody.name).toBe('John');
    });

    it('returns 400 for empty name', () => {
      req.body = { name: '   ' };
      validateDetailsUpdate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for name too long', () => {
      req.body = { name: 'a'.repeat(101) };
      validateDetailsUpdate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('accepts null name', () => {
      req.body = { name: null };
      validateDetailsUpdate(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
