import { apiFetch, API } from './client';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('apiFetch', () => {
  test('constructs URL from API base + path', async () => {
    await apiFetch('/auth/login');
    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/auth/login`,
      expect.any(Object)
    );
  });

  test('includes credentials: include', async () => {
    await apiFetch('/test');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  test('sets Content-Type json by default', async () => {
    await apiFetch('/test');
    const opts = global.fetch.mock.calls[0][1];
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  test('allows header override', async () => {
    await apiFetch('/upload', { headers: { 'Content-Type': 'multipart/form-data' } });
    const opts = global.fetch.mock.calls[0][1];
    expect(opts.headers['Content-Type']).toBe('multipart/form-data');
  });

  test('passes through other options', async () => {
    await apiFetch('/data', { method: 'POST', body: '{}' });
    const opts = global.fetch.mock.calls[0][1];
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe('{}');
  });
});
