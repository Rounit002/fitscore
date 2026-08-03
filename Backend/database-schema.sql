-- bitezsnap complete PostgreSQL schema
-- Run this script on a new/empty PostgreSQL database before starting the API.

BEGIN;

-- Used by the food-database substring/fuzzy-search indexes below.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  points INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_login_at TIMESTAMP,
  profile JSONB DEFAULT '{}'::jsonb,
  scheduled_deletion_at TIMESTAMP,
  is_premium BOOLEAN DEFAULT FALSE,
  subscription_expires_at TIMESTAMP,
  image_scans_used INTEGER DEFAULT 0,
  subscription_plan VARCHAR(50),
  scans_used INTEGER DEFAULT 0,
  scan_limit INTEGER DEFAULT 5,
  plan VARCHAR(50) DEFAULT 'free',
  plan_expires_at TIMESTAMP,
  reset_token_hash VARCHAR(255),
  reset_token_expires_at TIMESTAMP,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  last_failed_login_at TIMESTAMP,
  locked_until TIMESTAMP,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_name VARCHAR(255),
  brand VARCHAR(255),
  score INTEGER,
  ingredients TEXT,
  verdict VARCHAR(255),
  explanation TEXT,
  alternatives JSONB,
  side_effects JSONB,
  food_database_flag BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  nutriments JSONB,
  raw_product_data JSONB,
  servings REAL DEFAULT 1,
  eaten BOOLEAN,
  eaten_at TIMESTAMP,
  is_food BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  translations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  voters JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'Under Review',
  category VARCHAR(50) DEFAULT 'Feature',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_medical_conditions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition_name VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'Medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, condition_name)
);

CREATE TABLE IF NOT EXISTS user_health_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, goal_name)
);

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
);

CREATE TABLE IF NOT EXISTS webhook_events (
  provider VARCHAR(40) NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  PRIMARY KEY (provider, event_id)
);

CREATE TABLE IF NOT EXISTS payment_orders (
  order_id VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'created',
  payment_id VARCHAR(100) UNIQUE,
  -- Which plan from config/plans.js this order was created for. Nullable so
  -- rows predating the multi-plan catalogue remain valid; /verify treats NULL
  -- as the legacy monthly grant.
  plan_id VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

-- Application indexes.
CREATE UNIQUE INDEX IF NOT EXISTS product_database_product_key_idx
  ON product_database (product_key);

CREATE UNIQUE INDEX IF NOT EXISTS user_medical_conditions_user_condition_idx
  ON user_medical_conditions (user_id, condition_name);

CREATE UNIQUE INDEX IF NOT EXISTS user_health_goals_user_goal_idx
  ON user_health_goals (user_id, goal_name);

CREATE INDEX IF NOT EXISTS idx_scans_product_name_trgm
  ON scans USING gin (product_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_scans_brand_trgm
  ON scans USING gin (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_scans_ingredients_trgm
  ON scans USING gin (ingredients gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_scans_product_key_expr ON scans (
  (LOWER(COALESCE(brand, 'unknown')) || '::' ||
   LOWER(TRIM(COALESCE(product_name, ''))))
);

CREATE INDEX IF NOT EXISTS idx_scans_user_id
  ON scans (user_id);

CREATE INDEX IF NOT EXISTS idx_scans_food_db_flag
  ON scans (food_database_flag)
  WHERE food_database_flag = TRUE;

CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id
  ON feature_requests (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx
  ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_id_idx ON refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens (expires_at);
CREATE INDEX IF NOT EXISTS payment_orders_user_id_idx ON payment_orders (user_id);

COMMIT;
