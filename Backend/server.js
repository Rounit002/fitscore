require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const crypto = require('crypto');
const { analyzeIpLimiter, apiSlowDown, globalLimiter } = require('./middleware/rateLimiter');
const { Pool } = require('pg');
const { createCorsOptions, getAllowedOrigins } = require('./config/cors');
const { csrfProtection } = require('./middleware/csrf');
const { getJwtSecret } = require('./utils/tokens');

const authRoutes = require('./routes/auth');
const scansRoutes = require('./routes/scans');
const analyzeRoutes = require('./routes/analyze');
const featuresRoutes = require('./routes/features');
const paymentRoutes = require('./routes/payment');
const userRoutes = require('./routes/user');
const billingRoutes = require('./routes/billing');
const revenueCatRoutes = require('./routes/revenueCatSubscriptions');

// Initialize Async Job Queue Worker
require('./config/worker');

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  getJwtSecret();
}

app.use((req, res, next) => {
  req.id = req.get('x-request-id')?.slice(0, 100) || crypto.randomUUID();
  res.set('X-Request-ID', req.id);
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.status(400).json({ error: 'HTTPS is required' });
  }
  return next();
});

// Setup PostgreSQL connection pool with discrete credentials
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined,
});

const refreshFoodDatabaseFlags = async () => {
  try {
    await pool.query(`
      UPDATE scans
      SET food_database_flag = false
      WHERE
        product_name IS NULL
        OR TRIM(product_name) = ''
        OR LOWER(TRIM(product_name)) IN ('unknown', 'unknown product', 'product');
    `);

    await pool.query(`
      UPDATE scans
      SET food_database_flag = true
      WHERE
        product_name IS NOT NULL
        AND TRIM(product_name) <> ''
        AND LOWER(TRIM(product_name)) NOT IN ('unknown', 'unknown product', 'product');
    `);

    console.log('Food database scan flags refreshed');
  } catch (err) {
    console.error('Error refreshing food database flags:', err);
  }
};

// Initialize database tables if they don't exist
const initDb = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        points INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        last_login_at TIMESTAMP,
        profile JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Scans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        product_name VARCHAR(255),
        brand VARCHAR(255),
        score INTEGER,
        ingredients TEXT,
        verdict VARCHAR(255),
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Shared Food Database: one product row can be reused by all users.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_database (
        id SERIAL PRIMARY KEY,
        product_key VARCHAR(600) UNIQUE NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        brand VARCHAR(255),
        ingredients_text TEXT,
        ingredients_analysis JSONB,
        nutriments JSONB,
        raw_product_data JSONB,
        latest_score INTEGER,
        scan_count INTEGER DEFAULT 1,
        first_scanned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        last_scanned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS product_database_product_key_idx
      ON product_database (product_key);
    `);

    // Feature Requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        voters JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Medical conditions table stores each user's selected conditions and severity.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_medical_conditions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        condition_name VARCHAR(255) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'Medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, condition_name)
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_medical_conditions_user_condition_idx
      ON user_medical_conditions (user_id, condition_name);
    `);

    // Health goals table stores each user's selected goals as queryable rows.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_health_goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, goal_name)
      );
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS user_health_goals_user_goal_idx
      ON user_health_goals (user_id, goal_name);
    `);

    // Manual migration checks using information_schema for maximum compatibility
    const addColumnIfMissing = async (tableName, columnName, dataType) => {
      const checkRes = await pool.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2",
        [tableName, columnName]
      );
      if (checkRes.rows.length === 0) {
        console.log(`Migrating: Adding column ${columnName} to ${tableName}...`);
        await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${dataType}`);
      }
    };

    await addColumnIfMissing('scans', 'score', 'INTEGER');
    await addColumnIfMissing('scans', 'alternatives', 'JSONB');
    await addColumnIfMissing('scans', 'side_effects', 'JSONB');
    await addColumnIfMissing('scans', 'food_database_flag', 'BOOLEAN DEFAULT false');
    await addColumnIfMissing('scans', 'nutriments', 'JSONB');
    await addColumnIfMissing('scans', 'raw_product_data', 'JSONB');
    await addColumnIfMissing('scans', 'servings', 'REAL DEFAULT 1');
    // Consumption log: a scan is only counted towards Health Progress once the
    // user says they actually ate it. NULL = undecided (scanned, not answered),
    // true = eaten, false = explicitly not eaten.
    await addColumnIfMissing('scans', 'eaten', 'BOOLEAN');
    await addColumnIfMissing('scans', 'eaten_at', 'TIMESTAMP');
    // Non-food items (medicine strips, tablets, cosmetics) are rejected at
    // analysis time, but the flag is stored so historic rows can be filtered.
    await addColumnIfMissing('scans', 'is_food', 'BOOLEAN DEFAULT true');
    await addColumnIfMissing('product_database', 'ingredients_analysis', 'JSONB');
    await addColumnIfMissing('product_database', 'nutriments', 'JSONB');
    await addColumnIfMissing('product_database', 'raw_product_data', 'JSONB');
    await addColumnIfMissing('product_database', 'latest_score', 'INTEGER');
    await addColumnIfMissing('product_database', 'scan_count', 'INTEGER DEFAULT 1');
    await addColumnIfMissing('product_database', 'first_scanned_by', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
    await addColumnIfMissing('product_database', 'last_scanned_by', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
    await addColumnIfMissing('product_database', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfMissing('product_database', 'translations', "JSONB DEFAULT '{}'::jsonb");
    await addColumnIfMissing('users', 'points', 'INTEGER DEFAULT 0');
    await addColumnIfMissing('users', 'streak', 'INTEGER DEFAULT 0');
    await addColumnIfMissing('users', 'last_login_at', 'TIMESTAMP');
    await addColumnIfMissing('users', 'profile', 'JSONB');
    await addColumnIfMissing('users', 'scheduled_deletion_at', 'TIMESTAMP');
    await addColumnIfMissing('users', 'is_premium', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfMissing('users', 'subscription_expires_at', 'TIMESTAMP');
    await addColumnIfMissing('users', 'image_scans_used', 'INTEGER DEFAULT 0');
    await addColumnIfMissing('users', 'subscription_plan', "VARCHAR(50)");
    await addColumnIfMissing('users', 'scans_used', 'INTEGER DEFAULT 0');
    await addColumnIfMissing('users', 'scan_limit', 'INTEGER DEFAULT 5');
    await addColumnIfMissing('users', 'plan', "VARCHAR(50) DEFAULT 'free'");
    await addColumnIfMissing('users', 'plan_expires_at', 'TIMESTAMP');
    await addColumnIfMissing('users', 'reset_token_hash', 'VARCHAR(255)');
    await addColumnIfMissing('users', 'reset_token_expires_at', 'TIMESTAMP');
    await addColumnIfMissing('users', 'failed_login_attempts', 'INTEGER NOT NULL DEFAULT 0');
    await addColumnIfMissing('users', 'last_failed_login_at', 'TIMESTAMP');
    await addColumnIfMissing('users', 'locked_until', 'TIMESTAMP');
    await addColumnIfMissing('users', 'token_version', 'INTEGER NOT NULL DEFAULT 0');
    await addColumnIfMissing('user_medical_conditions', 'severity', "VARCHAR(20) NOT NULL DEFAULT 'Medium'");
    await addColumnIfMissing('user_medical_conditions', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token_hash CHAR(64) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_id UUID NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        rotated_at TIMESTAMP,
        revoked_at TIMESTAMP,
        replaced_by_hash CHAR(64),
        ip_hash VARCHAR(64),
        user_agent_hash VARCHAR(64)
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS refresh_tokens_family_id_idx ON refresh_tokens (family_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens (expires_at)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        provider VARCHAR(40) NOT NULL,
        event_id VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL,
        received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        PRIMARY KEY (provider, event_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        order_id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL CHECK (amount > 0),
        currency VARCHAR(3) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'created',
        payment_id VARCHAR(100) UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS payment_orders_user_id_idx ON payment_orders (user_id)');

    // Normalise stored emails to lowercase so the case-insensitive unique index
    // below can be created, and so logins match regardless of typed casing.
    // Rows that would collide after lowering are left untouched and reported.
    try {
      const collisionRes = await pool.query(`
        SELECT LOWER(email) AS normalized, COUNT(*)::int AS count
        FROM users
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
      `);

      if (collisionRes.rows.length > 0) {
        console.warn(
          '[Migration] Cannot enforce unique emails yet — these addresses have duplicate accounts differing only by case:',
          collisionRes.rows.map((row) => `${row.normalized} (x${row.count})`).join(', ')
        );
      } else {
        await pool.query('UPDATE users SET email = LOWER(email) WHERE email <> LOWER(email)');
        await pool.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx ON users (LOWER(email))'
        );
      }
    } catch (emailMigrationErr) {
      console.error('[Migration] Email normalisation failed:', emailMigrationErr.message);
    }

    // Backfill products from older scans so Food Database is not empty after migration.
    await pool.query(`
      INSERT INTO product_database (
        product_key,
        product_name,
        brand,
        ingredients_text,
        latest_score,
        scan_count,
        first_scanned_by,
        last_scanned_by,
        created_at,
        updated_at
      )
      SELECT DISTINCT ON (LOWER(COALESCE(brand, '')), LOWER(product_name))
        LOWER(COALESCE(brand, 'unknown')) || '::' || LOWER(product_name) AS product_key,
        product_name,
        brand,
        ingredients,
        score,
        1,
        user_id,
        user_id,
        created_at,
        created_at
      FROM scans
      WHERE product_name IS NOT NULL AND product_name <> ''
      ON CONFLICT (product_key) DO NOTHING;
    `);

    await refreshFoodDatabaseFlags();

    // Enable pg_trgm extension for fuzzy and substring search optimizations
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    // Trigram GIN indexes for fast ILIKE '%search%' queries in shared database lookups
    await pool.query('CREATE INDEX IF NOT EXISTS idx_scans_product_name_trgm ON scans USING gin (product_name gin_trgm_ops);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_scans_brand_trgm ON scans USING gin (brand gin_trgm_ops);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_scans_ingredients_trgm ON scans USING gin (ingredients gin_trgm_ops);');

    // Expression B-Tree index for highly-optimized LEFT JOIN performance in scan history
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scans_product_key_expr ON scans (
        (LOWER(COALESCE(brand, 'unknown')) || '::' || LOWER(TRIM(COALESCE(product_name, ''))))
      );
    `);

    // B-Tree index for quick user scan history retrieval
    await pool.query('CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans (user_id);');

    // Partial index for fast retrieval of products shared in the global food database
    await pool.query('CREATE INDEX IF NOT EXISTS idx_scans_food_db_flag ON scans (food_database_flag) WHERE food_database_flag = true;');

    // B-Tree index for fast user reference lookups in feature requests
    await pool.query('CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON feature_requests (user_id);');

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
};

// Purge accounts whose 7-day grace period has expired
const purgeScheduledDeletions = async () => {
  const client = await pool.connect();
  try {
    const expiredRes = await client.query(
      `SELECT id FROM users WHERE scheduled_deletion_at IS NOT NULL AND scheduled_deletion_at <= NOW()`
    );
    if (expiredRes.rows.length === 0) return;

    for (const row of expiredRes.rows) {
      const userId = row.id;
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM user_health_goals WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM user_medical_conditions WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM feature_requests WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM scans WHERE user_id = $1', [userId]);
        await client.query('UPDATE product_database SET first_scanned_by = NULL WHERE first_scanned_by = $1', [userId]);
        await client.query('UPDATE product_database SET last_scanned_by = NULL WHERE last_scanned_by = $1', [userId]);
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        await client.query('COMMIT');
        console.log('[Scheduled Deletion] An expired account was permanently purged');
      } catch (innerErr) {
        await client.query('ROLLBACK');
        console.error('[Scheduled Deletion] Failed to purge an expired account:', innerErr.message);
      }
    }
  } catch (err) {
    console.error('[Scheduled Deletion] Cleanup job error:', err);
  } finally {
    client.release();
  }
};

// Allow credentialed browser requests only from configured frontend deployments.
// The cors middleware also answers OPTIONS preflight requests before route handlers.
const corsOptions = createCorsOptions();
app.use(cors(corsOptions));
console.log(`[CORS] Allowed origins: ${Array.from(getAllowedOrigins()).join(', ')}`);
app.use(express.json({
  limit: process.env.JSON_BODY_LIMIT || '6mb',
  verify: (req, _res, buffer) => {
    if (req.originalUrl.startsWith('/api/subscriptions/revenuecat/webhook')) {
      req.rawBody = Buffer.from(buffer);
    }
  },
}));
app.use(express.urlencoded({ limit: '1mb', extended: false }));
app.use(cookieParser()); // must come before routes so req.cookies is populated

// Pass pool to routes
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

app.use(globalLimiter);
app.use(apiSlowDown);
app.use(csrfProtection);

app.use('/auth', authRoutes);
app.use('/scans', scansRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analyze', analyzeIpLimiter, analyzeRoutes.router);
app.use('/features', featuresRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/billing', billingRoutes); // Billing routes - webhook does NOT require auth
app.use('/api/subscriptions/revenuecat', revenueCatRoutes);

app.get('/', (req, res) => {
  res.send('FitScan API is running');
});

app.use((req, res) => {
  console.error(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, req, res, _next) => {
  console.error(`[${req.id}] Unhandled request error:`, error.message);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal server error' });
});

const startServer = async () => {
  // Fail closed: do not accept traffic until required tables and security
  // migrations are available.
  await initDb();
  await purgeScheduledDeletions();
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  const databaseRefreshTimer = setInterval(refreshFoodDatabaseFlags, 5 * 60 * 1000);
  const deletionTimer = setInterval(purgeScheduledDeletions, 60 * 60 * 1000);
  server.on('close', () => {
    clearInterval(databaseRefreshTimer);
    clearInterval(deletionTimer);
  });
  return server;
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Critical failure during server startup:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, initDb, pool, startServer };
