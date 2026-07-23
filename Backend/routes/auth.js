const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateProfileUpdate, validateDetailsUpdate } = require('../middleware/profileValidator');
const {
  createAuthCookieOptions,
  createClearAuthCookieOptions,
} = require('../config/cookies');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const SEVERITY_LEVELS = ['Low', 'Medium', 'High'];

const normalizeCondition = (condition) => {
  if (typeof condition === 'string') {
    return { name: condition, severity: 'Medium' };
  }

  const name = typeof condition?.name === 'string' ? condition.name.trim() : '';
  const severity = SEVERITY_LEVELS.includes(condition?.severity) ? condition.severity : 'Medium';
  return name ? { name, severity } : null;
};

const normalizeConditions = (conditions) => {
  if (!Array.isArray(conditions)) return [];
  const byName = new Map();
  conditions.forEach((condition) => {
    const normalized = normalizeCondition(condition);
    if (normalized) byName.set(normalized.name, normalized);
  });
  return Array.from(byName.values());
};

const normalizeGoals = (goals) => {
  if (!Array.isArray(goals)) return [];
  return Array.from(new Set(
    goals
      .filter((goal) => typeof goal === 'string')
      .map((goal) => goal.trim())
      .filter(Boolean)
  ));
};

const syncMedicalConditions = async (pool, userId, conditions) => {
  const normalizedConditions = normalizeConditions(conditions);

  await pool.query('DELETE FROM user_medical_conditions WHERE user_id = $1', [userId]);

  for (const condition of normalizedConditions) {
    await pool.query(
      `INSERT INTO user_medical_conditions (user_id, condition_name, severity, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, condition_name)
       DO UPDATE SET severity = EXCLUDED.severity, updated_at = CURRENT_TIMESTAMP`,
      [userId, condition.name, condition.severity]
    );
  }

  return normalizedConditions;
};

const getMedicalConditions = async (pool, userId) => {
  const conditionsRes = await pool.query(
    `SELECT condition_name AS name, severity
     FROM user_medical_conditions
     WHERE user_id = $1
     ORDER BY condition_name ASC`,
    [userId]
  );
  return conditionsRes.rows;
};

const syncHealthGoals = async (pool, userId, goals) => {
  const normalizedGoals = normalizeGoals(goals);

  await pool.query('DELETE FROM user_health_goals WHERE user_id = $1', [userId]);

  for (const goal of normalizedGoals) {
    await pool.query(
      `INSERT INTO user_health_goals (user_id, goal_name, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, goal_name)
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
      [userId, goal]
    );
  }

  return normalizedGoals;
};

const getHealthGoals = async (pool, userId) => {
  const goalsRes = await pool.query(
    `SELECT goal_name
     FROM user_health_goals
     WHERE user_id = $1
     ORDER BY goal_name ASC`,
    [userId]
  );
  return goalsRes.rows.map((row) => row.goal_name);
};

const hydrateUserMedicalProfile = async (pool, user) => {
  const conditions = await getMedicalConditions(pool, user.id);
  const goals = await getHealthGoals(pool, user.id);
  if (!conditions.length && !goals.length) return user;

  return {
    ...user,
    profile: {
      ...(user.profile || {}),
      ...(conditions.length ? { conditions } : {}),
      ...(goals.length ? { goals } : {}),
    },
  };
};

// Cookie config — centralised so it's consistent across all auth routes
const COOKIE_OPTIONS = createAuthCookieOptions();

// Middleware to authenticate — reads JWT from HttpOnly cookie
const authenticate = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper to update streak and points
async function updateStreak(pool, userId) {
  const userRes = await pool.query('SELECT points, streak, last_login_at FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
  if (lastLogin) {
    lastLogin = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newPoints = user.points || 0;
  let newStreak = user.streak || 0;

  if (!lastLogin) {
    newStreak = 1;
    newPoints += 5;
  } else if (lastLogin.getTime() === today.getTime()) {
    return { points: newPoints, streak: newStreak };
  } else if (lastLogin.getTime() === yesterday.getTime()) {
    newStreak += 1;
    newPoints += 5;
  } else {
    newPoints = Math.max(0, newPoints - 5);
    newStreak = 1;
    newPoints += 5;
  }

  await pool.query(
    'UPDATE users SET points = $1, streak = $2, last_login_at = $3 WHERE id = $4',
    [newPoints, newStreak, now, userId]
  );

  return { points: newPoints, streak: newStreak };
}

// Register
router.post('/register', authLimiter, async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const userRes = await req.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const insertRes = await req.pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, profile, is_premium, subscription_expires_at, image_scans_used, subscription_plan',
      [email, passwordHash, name]
    );
    const user = insertRes.rows[0];
    const { points, streak } = await updateStreak(req.pool, user.id);
    const hydratedUser = await hydrateUserMedicalProfile(req.pool, { ...user, isPremium: user.is_premium, subscriptionExpiresAt: user.subscription_expires_at, imageScansUsed: user.image_scans_used, subscriptionPlan: user.subscription_plan, points, streak });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    // Set JWT as an HttpOnly cookie — never exposed to frontend JavaScript
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ user: hydratedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await req.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = userRes.rows[0];
    if (!user.password_hash) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // Cancel any scheduled deletion — logging in means the user wants to keep the account
    let deletionCancelled = false;
    if (user.scheduled_deletion_at) {
      await req.pool.query('UPDATE users SET scheduled_deletion_at = NULL WHERE id = $1', [user.id]);
      console.log(`[Deletion Cancelled] User ${user.id} logged in, scheduled deletion cancelled`);
      deletionCancelled = true;
    }

    const { points, streak } = await updateStreak(req.pool, user.id);
    const hydratedUser = await hydrateUserMedicalProfile(req.pool, {
      id: user.id, email: user.email, name: user.name, points, streak,
      profile: user.profile, isPremium: user.is_premium,
      subscriptionExpiresAt: user.subscription_expires_at, imageScansUsed: user.image_scans_used,
      subscriptionPlan: user.subscription_plan
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    // Set JWT as an HttpOnly cookie — never exposed to frontend JavaScript
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ user: hydratedUser, deletionCancelled });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth
router.post('/google', authLimiter, async (req, res) => {
  const { email, name, googleId } = req.body;
  try {
    let userRes = await req.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;
    if (userRes.rows.length === 0) {
      const insertRes = await req.pool.query(
        'INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3) RETURNING id, email, name, profile, is_premium, subscription_expires_at, image_scans_used, subscription_plan',
        [email, name, googleId]
      );
      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];
      // Cancel any scheduled deletion — logging in means the user wants to keep the account
      var deletionCancelled = false;
      if (user.scheduled_deletion_at) {
        await req.pool.query('UPDATE users SET scheduled_deletion_at = NULL WHERE id = $1', [user.id]);
        console.log(`[Deletion Cancelled] User ${user.id} (Google) logged in, scheduled deletion cancelled`);
        deletionCancelled = true;
      }
    }

    const { points, streak } = await updateStreak(req.pool, user.id);
    const hydratedUser = await hydrateUserMedicalProfile(req.pool, {
      id: user.id, email: user.email, name: user.name, points, streak,
      profile: user.profile, isPremium: user.is_premium,
      subscriptionExpiresAt: user.subscription_expires_at, imageScansUsed: user.image_scans_used,
      subscriptionPlan: user.subscription_plan
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    // Set JWT as an HttpOnly cookie — never exposed to frontend JavaScript
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ user: hydratedUser, deletionCancelled: typeof deletionCancelled !== 'undefined' ? deletionCancelled : false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Google login failed' });
  }
});

// Logout — clears the HttpOnly auth cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token', createClearAuthCookieOptions());
  res.json({ success: true });
});

// Get current user (session restoration)
router.get('/me', authenticate, async (req, res) => {
  try {
    const userRes = await req.pool.query(
      'SELECT id, email, name, points, streak, profile, scheduled_deletion_at, is_premium, subscription_expires_at, image_scans_used, subscription_plan FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const row = userRes.rows[0];
    const user = await hydrateUserMedicalProfile(req.pool, row);
    // Include scheduled_deletion_at so frontend can show the countdown banner
    if (row.scheduled_deletion_at) {
      user.scheduledDeletionAt = row.scheduled_deletion_at;
    }
    user.isPremium = row.is_premium;
    user.subscriptionExpiresAt = row.subscription_expires_at;
    user.imageScansUsed = row.image_scans_used;
    user.subscriptionPlan = row.subscription_plan;
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update Profile
router.put('/profile', authenticate, validateProfileUpdate, async (req, res) => {
  const { profile } = req.validatedBody;
  try {
    const userRes = await req.pool.query(
      'SELECT profile FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentProfile = userRes.rows[0].profile || {};
    const nextProfile = { ...currentProfile, ...(profile || {}) };
    if (Object.prototype.hasOwnProperty.call(nextProfile, 'conditions')) {
      nextProfile.conditions = normalizeConditions(nextProfile.conditions);
    }
    if (Object.prototype.hasOwnProperty.call(nextProfile, 'goals')) {
      nextProfile.goals = normalizeGoals(nextProfile.goals);
    }

    await req.pool.query(
      'UPDATE users SET profile = $1 WHERE id = $2',
      [JSON.stringify(nextProfile), req.userId]
    );

    if (Object.prototype.hasOwnProperty.call(nextProfile, 'conditions')) {
      await syncMedicalConditions(req.pool, req.userId, nextProfile.conditions);
    }
    if (Object.prototype.hasOwnProperty.call(nextProfile, 'goals')) {
      await syncHealthGoals(req.pool, req.userId, nextProfile.goals);
    }

    const updatedRes = await req.pool.query(
      'SELECT id, email, name, points, streak, profile FROM users WHERE id = $1',
      [req.userId]
    );
    const updatedUser = await hydrateUserMedicalProfile(req.pool, updatedRes.rows[0]);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update personal details from profile page
router.put('/details', authenticate, validateDetailsUpdate, async (req, res) => {
  const { name, profile } = req.validatedBody;
  try {
    const userRes = await req.pool.query(
      'SELECT profile FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentProfile = userRes.rows[0].profile || {};
    const nextProfile = { ...currentProfile, ...(profile || {}) };
    if (Object.prototype.hasOwnProperty.call(profile || {}, 'conditions')) {
      nextProfile.conditions = normalizeConditions(profile.conditions);
    }
    if (Object.prototype.hasOwnProperty.call(profile || {}, 'goals')) {
      nextProfile.goals = normalizeGoals(profile.goals);
    }

    await req.pool.query(
      'UPDATE users SET name = COALESCE($1, name), profile = $2 WHERE id = $3',
      [name || null, JSON.stringify(nextProfile), req.userId]
    );

    if (Object.prototype.hasOwnProperty.call(profile || {}, 'conditions')) {
      await syncMedicalConditions(req.pool, req.userId, nextProfile.conditions);
    }
    if (Object.prototype.hasOwnProperty.call(profile || {}, 'goals')) {
      await syncHealthGoals(req.pool, req.userId, nextProfile.goals);
    }

    const updatedRes = await req.pool.query(
      'SELECT id, email, name, points, streak, profile FROM users WHERE id = $1',
      [req.userId]
    );

    const updatedUser = await hydrateUserMedicalProfile(req.pool, updatedRes.rows[0]);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update personal details' });
  }
});

// Save compressed profile picture directly in profile JSON
router.put('/profile-picture', authenticate, async (req, res) => {
  const { imageBase64 } = req.body;
  console.log('━━━ PUT /auth/profile-picture ━━━');
  console.log('  User id:', req.userId);
  console.log('  Payload:', imageBase64 ? `${typeof imageBase64} (${imageBase64.length} chars)` : 'MISSING');

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    console.error('  ✗ Profile picture upload failed: imageBase64 is missing or invalid');
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  try {
    const userRes = await req.pool.query(
      'SELECT profile FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRes.rows.length === 0) {
      console.error('  ✗ Profile picture upload failed: user not found');
      return res.status(404).json({ error: 'User not found' });
    }

    if (!imageBase64.startsWith('data:image/')) {
      console.error('  ✗ Profile picture save failed: payload is not an image data URL');
      return res.status(400).json({ error: 'Profile picture must be an image data URL' });
    }

    console.log('  → Saving compressed Base64 profile image to database...');

    const currentProfile = userRes.rows[0].profile || {};
    const nextProfile = {
      ...currentProfile,
      profileImageUrl: imageBase64,
      avatarUrl: imageBase64,
      profileImageStorage: 'database-base64',
      profileImageUpdatedAt: new Date().toISOString(),
    };

    await req.pool.query(
      'UPDATE users SET profile = $1 WHERE id = $2',
      [JSON.stringify(nextProfile), req.userId]
    );
    console.log('  ✓ Profile image saved in user profile JSON');

    const updatedRes = await req.pool.query(
      'SELECT id, email, name, points, streak, profile FROM users WHERE id = $1',
      [req.userId]
    );
    const updatedUser = await hydrateUserMedicalProfile(req.pool, updatedRes.rows[0]);
    res.json({ user: updatedUser, imageUrl: imageBase64 });
  } catch (error) {
    console.error('  ✗ Profile picture upload failed:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Get/Update Streak
router.get('/streak', authenticate, async (req, res) => {
  try {
    const { points, streak } = await updateStreak(req.pool, req.userId);
    res.json({ points, streak });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

// Get Leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const leaderboardRes = await req.pool.query(
      'SELECT name, points, streak FROM users ORDER BY points DESC, streak DESC LIMIT 50'
    );
    res.json(leaderboardRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Schedule Account Deletion — marks account for permanent removal after 7 days
router.delete('/account', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const userRes = await req.pool.query('SELECT id, scheduled_deletion_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Schedule deletion 7 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 7);

    await req.pool.query(
      'UPDATE users SET scheduled_deletion_at = $1 WHERE id = $2',
      [deletionDate, userId]
    );

    console.log(`[Account Scheduled] User ${userId} scheduled for deletion on ${deletionDate.toISOString()}`);
    res.json({
      success: true,
      message: 'Account scheduled for deletion',
      scheduledDeletionAt: deletionDate.toISOString(),
    });
  } catch (error) {
    console.error('[Account Deletion Scheduling Error]', error);
    res.status(500).json({ error: 'Failed to schedule account deletion. Please try again.' });
  }
});

// Cancel Scheduled Deletion
router.post('/cancel-deletion', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const userRes = await req.pool.query('SELECT scheduled_deletion_at FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!userRes.rows[0].scheduled_deletion_at) {
      return res.json({ success: true, message: 'No deletion was scheduled' });
    }

    await req.pool.query('UPDATE users SET scheduled_deletion_at = NULL WHERE id = $1', [userId]);

    console.log(`[Deletion Cancelled] User ${userId} cancelled scheduled deletion`);
    res.json({ success: true, message: 'Account deletion cancelled' });
  } catch (error) {
    console.error('[Cancel Deletion Error]', error);
    res.status(500).json({ error: 'Failed to cancel deletion. Please try again.' });
  }
});

module.exports = router;
