# bitezsnap: Supabase Production Security Lockdown Guide

Since you are testing locally right now, follow this guide when you deploy the application to production on **Render** (Node.js backend) and **Supabase** (PostgreSQL database). 

By default, Supabase exposes an auto-generated REST API (via PostgREST) on port 443. Because bitezsnap accesses the database strictly through **Prisma ORM** and **node-postgres (`pg`)** using direct TCP connections, **we must completely lock down the public Supabase API** to prevent unauthorized access or XSS-based data exfiltration.

---

## Step 1: Lock Down the Supabase REST API (SQL Editor)

Run the following script in the **Supabase SQL Editor** (`SQL Editor -> New Query`) in your Supabase Dashboard. 

This script:
1. Enables **Row Level Security (RLS)** on all tables. Since Prisma connects as the `postgres` superuser, it will bypass RLS. However, anonymous REST API requests (using the Supabase client) will be blocked.
2. Explicitly **revokes all permissions** on the `public` schema for default Supabase REST roles (`anon` and `authenticated`).

```sql
-- =====================================================================
-- bitezsnap Production Supabase API Lockdown Script
-- =====================================================================

-- 1. Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_health_goals ENABLE ROW LEVEL SECURITY;

-- 2. Revoke Web REST API access from Supabase default roles
-- This completely disables querying these tables via the Supabase Client SDK (PostgREST)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON SCHEMA public FROM anon, authenticated;

-- 3. Ensure the 'postgres' role (used by Prisma and pg driver) retains full permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

---

## Step 2: Enforce Secure Encrypted Connections (SSL/TLS)

To ensure that data in transit between Render and Supabase is encrypted and protected against Man-in-the-Middle (MitM) attacks, update your production environment connection strings.

### 1. Prisma Connection String (`server/.env` or Render Env Vars)
Append `sslmode=require` to your database URL to enforce SSL validation:
```env
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
```

### 2. Node-Postgres Connection String (`server/server.js`)
If you use direct credential parameters (like `pool` in `server.js`), enforce SSL programmatically in production:

```javascript
const poolConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
};

// Enforce SSL in production (when not running on localhost)
if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = {
    rejectUnauthorized: false, // Required for Supabase connection certificate validation
  };
}

const pool = new Pool(poolConfig);
```

---

## Step 3: Secure the Supabase JWT Verification Key

If you ever decide to integrate Supabase Auth alongside your custom auth in the future:
1. Ensure your `JWT_SECRET` in `server/.env` is a highly secure, randomly generated 256-bit key.
2. Do **not** use the default Supabase JWT secret (`JWT_SECRET` in Supabase settings) as your own backend secret. Keep your backend `JWT_SECRET` completely separate from the Supabase JWT secret to prevent token tampering.
