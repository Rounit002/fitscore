const LOCAL_FRONTEND_ORIGIN = 'http://localhost:5173';
// cordova-android serves the bundled SPA from https://localhost.
const CORDOVA_FRONTEND_ORIGIN = 'https://localhost';
// Older cordova-android builds (and file:// shells) send a null/absent Origin,
// which is already allowed by the `!origin` branch below.
const DEPLOYED_FRONTEND_ORIGIN = 'https://fitscore-6hqp.onrender.com';

const normalizeOrigin = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  try {
    return new URL(trimmedValue).origin;
  } catch (_error) {
    return trimmedValue.replace(/\/+$/, '');
  }
};

const getAllowedOrigins = (env = process.env) => {
  const configuredOrigins = [
    env.FRONTEND_URL,
    ...(env.FRONTEND_URLS || '').split(','),
  ];

  return new Set(
    [
      ...(env.NODE_ENV === 'production' ? [] : [LOCAL_FRONTEND_ORIGIN]),
      CORDOVA_FRONTEND_ORIGIN,
      DEPLOYED_FRONTEND_ORIGIN,
      ...configuredOrigins,
    ]
      .map(normalizeOrigin)
      .filter(Boolean)
  );
};

const createCorsOptions = (env = process.env) => {
  const allowedOrigins = getAllowedOrigins(env);

  return {
    origin(origin, callback) {
      // Requests without Origin are server-to-server calls, health checks, or CLI requests.
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      console.warn(`[CORS] Blocked request from unapproved origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    // Authorization + X-Client are sent by the Cordova build (Bearer auth).
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Client', 'X-CSRF-Token', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'Retry-After'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };
};

module.exports = {
  createCorsOptions,
  getAllowedOrigins,
  normalizeOrigin,
};
