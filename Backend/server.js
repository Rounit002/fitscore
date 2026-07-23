require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { analyzeLimiter, authLimiter } = require('./middleware/rateLimiter');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const scansRoutes = require('./routes/scans');
const analyzeRoutes = require('./routes/analyze');
const featuresRoutes = require('./routes/features');
const paymentRoutes = require('./routes/payment');
const userRoutes = require('./routes/user');
const billingRoutes = require('./routes/billing');

// Initialize Async Job Queue Worker
require('./config/worker');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Helmet to secure Express app by setting various HTTP headers
app.use(helmet());

// Setup PostgreSQL connection pool with discrete credentials
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
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
    await addColumnIfMissing('user_medical_conditions', 'severity', "VARCHAR(20) NOT NULL DEFAULT 'Medium'");
    await addColumnIfMissing('user_medical_conditions', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

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
        console.log(`[Scheduled Deletion] User ${userId} permanently purged after grace period`);
      } catch (innerErr) {
        await client.query('ROLLBACK');
        console.error(`[Scheduled Deletion] Failed to purge user ${userId}:`, innerErr);
      }
    }
  } catch (err) {
    console.error('[Scheduled Deletion] Cleanup job error:', err);
  } finally {
    client.release();
  }
};

// Allow cookies to be sent cross-origin from the Vite dev server / production domain
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // required for HttpOnly cookies
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser()); // must come before routes so req.cookies is populated

// Pass pool to routes
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

app.use('/auth', authLimiter, authRoutes);
app.use('/scans', scansRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analyze', analyzeLimiter, analyzeRoutes.router);
app.use('/features', featuresRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/billing', billingRoutes); // Billing routes - webhook does NOT require auth

app.get('/', (req, res) => {
  res.send('FitScan API is running');
});

app.use((req, res) => {
  console.error(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await initDb();
    // Refresh flags on startup is already done inside initDb() line 216
    // Just start the interval for subsequent refreshes
    setInterval(refreshFoodDatabaseFlags, 5 * 60 * 1000);
    // Run scheduled-deletion cleanup every hour
    await purgeScheduledDeletions();
    setInterval(purgeScheduledDeletions, 60 * 60 * 1000);
  } catch (error) {
    console.error('Critical failure during server startup:', error);
  }
});

module.exports = { pool };
