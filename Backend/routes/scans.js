const express = require('express');
const jwt = require('jsonwebtoken');
const { uploadImage } = require('../config/cloudinary');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Middleware to authenticate
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

router.use(authenticate);

const parseIngredientsText = (ingredients) => {
  if (!ingredients) return '';
  if (typeof ingredients !== 'string') return String(ingredients);

  try {
    const parsed = JSON.parse(ingredients);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === 'string') return item;
          return [item?.name, item?.reason].filter(Boolean).join(': ');
        })
        .filter(Boolean)
        .join(', ');
    }
    return String(parsed);
  } catch {
    return ingredients;
  }
};

const safeJsonParse = (value, fallback = null) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeProductKey = (brand, productName) => {
  const normalizedBrand = (brand || 'unknown').trim().toLowerCase();
  const normalizedProduct = (productName || '').trim().toLowerCase();
  return `${normalizedBrand}::${normalizedProduct}`;
};

const shouldShowInFoodDatabase = (productName) => {
  const normalized = (productName || '').trim().toLowerCase();
  return Boolean(normalized && !['unknown', 'unknown product', 'product'].includes(normalized));
};

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const firstNumericValue = (...values) => {
  for (const value of values) {
    const parsed = numberOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const parseServingQuantity = (productData = {}, nutriments = {}) => {
  const direct = firstNumericValue(
    productData.serving_quantity,
    productData.servingQuantity,
    nutriments.serving_quantity,
    nutriments.servingQuantity
  );
  if (direct !== null) return direct;

  const servingText = String(
    productData.serving_size
    || productData.servingSize
    || nutriments.serving_size
    || nutriments.servingSize
    || ''
  );
  const match = servingText.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml|millilitre|milliliter|millilitres|milliliters)\b/i);
  return match ? Number(match[1]) : null;
};

const getServingAmount = ({ nutriments, servingKeys, per100Keys, servingQuantity }) => {
  const servingValue = firstNumericValue(...servingKeys.map((key) => nutriments?.[key]));
  if (servingValue !== null) return servingValue;

  const per100Value = firstNumericValue(...per100Keys.map((key) => nutriments?.[key]));
  if (per100Value === null || servingQuantity === null) return null;

  return (per100Value * servingQuantity) / 100;
};

const getServingSodiumMg = (nutriments = {}, servingQuantity) => {
  const sodiumMgServing = firstNumericValue(
    nutriments.sodium_mg_serving,
    nutriments.sodiumMgServing,
    nutriments.sodium_mg,
    nutriments.sodium_mg_value
  );
  if (sodiumMgServing !== null) return sodiumMgServing;

  const sodiumServingGrams = firstNumericValue(nutriments.sodium_serving, nutriments.sodium_value);
  if (sodiumServingGrams !== null) return sodiumServingGrams * 1000;

  const sodiumMg100g = firstNumericValue(nutriments.sodium_mg_100g, nutriments.sodiumMg100g);
  if (sodiumMg100g !== null && servingQuantity !== null) return (sodiumMg100g * servingQuantity) / 100;

  const sodium100gGrams = firstNumericValue(nutriments.sodium_100g, nutriments.sodium);
  if (sodium100gGrams !== null && servingQuantity !== null) return (sodium100gGrams * servingQuantity * 1000) / 100;

  const saltServingGrams = firstNumericValue(nutriments.salt_serving);
  if (saltServingGrams !== null) return saltServingGrams * 400;

  const salt100gGrams = firstNumericValue(nutriments.salt_100g, nutriments.salt);
  if (salt100gGrams !== null && servingQuantity !== null) return (salt100gGrams * servingQuantity * 400) / 100;

  return null;
};

const normalizeNutrimentsForServing = (productData = {}) => {
  const rawNutriments = safeJsonParse(productData?.nutriments, null)
    || safeJsonParse(productData?.nutrition, null)
    || safeJsonParse(productData?.nutrientLevels, null)
    || {};
  const servingQuantity = parseServingQuantity(productData, rawNutriments);
  const normalized = { ...rawNutriments };

  const setIfPresent = (key, value) => {
    const parsed = numberOrNull(value);
    if (parsed !== null) normalized[key] = parsed;
  };

  setIfPresent('energy-kcal_serving', getServingAmount({
    nutriments: rawNutriments,
    servingKeys: ['energy-kcal_serving', 'energy_kcal_serving', 'energy-kcal_value', 'energy_kcal_value', 'calories_serving', 'caloriesServing'],
    per100Keys: ['energy-kcal_100g', 'energy-kcal', 'energy_kcal_100g', 'energy_kcal', 'calories_100g', 'calories'],
    servingQuantity,
  }));
  setIfPresent('proteins_serving', getServingAmount({
    nutriments: rawNutriments,
    servingKeys: ['proteins_serving', 'protein_serving', 'proteins_value', 'protein_value', 'proteinServing'],
    per100Keys: ['proteins_100g', 'protein_100g', 'protein', 'proteins'],
    servingQuantity,
  }));
  setIfPresent('carbohydrates_serving', getServingAmount({
    nutriments: rawNutriments,
    servingKeys: ['carbohydrates_serving', 'carbs_serving', 'carbohydrates_value', 'carbs_value', 'carbohydratesServing', 'carbsServing'],
    per100Keys: ['carbohydrates_100g', 'carbs_100g', 'carbs', 'carbohydrates'],
    servingQuantity,
  }));
  setIfPresent('fat_serving', getServingAmount({
    nutriments: rawNutriments,
    servingKeys: ['fat_serving', 'fats_serving', 'fat_value', 'fats_value', 'fatServing', 'fatsServing'],
    per100Keys: ['fat_100g', 'fats_100g', 'fat', 'fats'],
    servingQuantity,
  }));
  setIfPresent('sodium_mg_serving', getServingSodiumMg(rawNutriments, servingQuantity));

  if (servingQuantity !== null) normalized.serving_quantity = servingQuantity;
  if (productData.serving_size || rawNutriments.serving_size) {
    normalized.serving_size = productData.serving_size || rawNutriments.serving_size;
  }

  return Object.keys(normalized).length ? normalized : null;
};

const upsertProductDatabase = async (pool, userId, scan) => {
  const {
    productName,
    brand,
    score,
    ingredients,
    productData,
    verdict,
    alternatives,
    sideEffects,
    lang = 'en',
  } = scan;

  if (!productName) return;

  const ingredientsAnalysis = safeJsonParse(ingredients, Array.isArray(ingredients) ? ingredients : null);
  const productBrand = productData?.brands || brand || 'Unknown Brand';
  const productIngredientsText = productData?.ingredients_text || parseIngredientsText(ingredients);
  const productKey = normalizeProductKey(productBrand, productName);
  const nutriments = normalizeNutrimentsForServing(productData);

  // Parse active target language
  const targetLang = String(lang).trim().toLowerCase();

  // Load existing translations to ensure we do not overwrite other languages
  let currentTranslations = {};
  try {
    const existingRes = await pool.query('SELECT translations FROM product_database WHERE product_key = $1', [productKey]);
    if (existingRes.rows.length > 0) {
      currentTranslations = existingRes.rows[0].translations || {};
    }
  } catch (err) {
    console.warn('[upsertProductDatabase] Failed to read current translations:', err.message);
  }

  // Populate or merge translation details for this non-English locale
  if (targetLang !== 'en') {
    currentTranslations[targetLang] = {
      brand: productBrand,
      productName: productName,
      score: score,
      nutrition: nutriments || {},
      verdict: safeJsonParse(verdict, Array.isArray(verdict) ? verdict : []),
      sideEffects: safeJsonParse(sideEffects, Array.isArray(sideEffects) ? sideEffects : []),
      ingredientsAnalysis: ingredientsAnalysis || [],
      alternatives: safeJsonParse(alternatives, Array.isArray(alternatives) ? alternatives : []),
    };
  }

  await pool.query(
    `
      INSERT INTO product_database (
        product_key,
        product_name,
        brand,
        ingredients_text,
        ingredients_analysis,
        nutriments,
        raw_product_data,
        latest_score,
        scan_count,
        first_scanned_by,
        last_scanned_by,
        translations,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (product_key)
      DO UPDATE SET
        product_name = EXCLUDED.product_name,
        brand = COALESCE(EXCLUDED.brand, product_database.brand),
        ingredients_text = COALESCE(NULLIF(EXCLUDED.ingredients_text, ''), product_database.ingredients_text),
        ingredients_analysis = COALESCE(EXCLUDED.ingredients_analysis, product_database.ingredients_analysis),
        nutriments = COALESCE(EXCLUDED.nutriments, product_database.nutriments),
        raw_product_data = COALESCE(EXCLUDED.raw_product_data, product_database.raw_product_data),
        latest_score = EXCLUDED.latest_score,
        scan_count = product_database.scan_count + 1,
        last_scanned_by = EXCLUDED.last_scanned_by,
        translations = EXCLUDED.translations,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      productKey,
      productName,
      productBrand,
      productIngredientsText,
      ingredientsAnalysis ? JSON.stringify(ingredientsAnalysis) : null,
      nutriments ? JSON.stringify(nutriments) : null,
      productData ? JSON.stringify(productData) : null,
      score,
      userId,
      JSON.stringify(currentTranslations),
    ]
  );
};

const mapOpenFoodFactsProduct = (product) => {
  const productName = product.product_name || product.product_name_en || product.generic_name || product.generic_name_en || '';
  const brands = product.brands || product.brands_tags?.join(', ') || 'Unknown Brand';
  const code = product.code || product._id || '';

  if (!productName.trim()) return null;

  return {
    id: `off-${code || normalizeProductKey(brands, productName)}`,
    code,
    product_name: productName,
    brands,
    ingredients_text: product.ingredients_text || product.ingredients_text_en || '',
    ingredientsAnalysis: [],
    nutriments: product.nutriments || {},
    rawProductData: product,
    image_url: product.image_front_small_url || product.image_front_url || product.image_small_url || product.image_url || null,
    latest_score: null,
    scan_count: 0,
    source: 'open_food_facts',
    created_at: null,
    updated_at: null,
  };
};

const searchOpenFoodFacts = async (search) => {
  if (!search) return [];

  const params = new URLSearchParams({
    search_terms: search,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '40',
    fields: [
      'code',
      'product_name',
      'product_name_en',
      'generic_name',
      'generic_name_en',
      'brands',
      'brands_tags',
      'ingredients_text',
      'ingredients_text_en',
      'nutriments',
      'serving_size',
      'serving_quantity',
      'image_url',
      'image_small_url',
      'image_front_url',
      'image_front_small_url',
    ].join(','),
  });

  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
    headers: {
      'User-Agent': 'FitScan/1.0 (food database search)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) throw new Error(`Open Food Facts search failed: ${response.status}`);

  const data = await response.json();
  return (Array.isArray(data.products) ? data.products : [])
    .map(mapOpenFoodFactsProduct)
    .filter(Boolean);
};

// Shared product database: products scanned by everyone on the platform.
router.get('/database', async (req, res) => {
  const search = (req.query.search || '').trim();

  try {
    const values = [];
    let whereClause = "WHERE food_database_flag = true AND product_name IS NOT NULL AND product_name <> ''";

    if (search) {
      values.push(`%${search}%`);
      whereClause += ` AND (product_name ILIKE $${values.length} OR brand ILIKE $${values.length} OR ingredients ILIKE $${values.length})`;
    }

    const productsRes = await req.pool.query(
      `
        SELECT DISTINCT ON (LOWER(COALESCE(brand, '')), LOWER(product_name))
          id,
          product_name,
          brand,
          ingredients,
          image_url,
          nutriments,
          raw_product_data,
          score,
          created_at
        FROM scans
        ${whereClause}
        ORDER BY LOWER(COALESCE(brand, '')), LOWER(product_name), created_at DESC
        LIMIT 100
      `,
      values
    );

    const localProducts = productsRes.rows
      .map((scan) => ({
        id: scan.id,
        product_name: scan.product_name,
        brands: scan.brand || 'Unknown Brand',
        ingredients_text: parseIngredientsText(scan.ingredients),
        ingredientsAnalysis: safeJsonParse(scan.ingredients, []),
        nutriments: safeJsonParse(scan.nutriments, {}),
        rawProductData: safeJsonParse(scan.raw_product_data, null),
        image_url: scan.image_url,
        latest_score: scan.score,
        scan_count: 1,
        created_at: scan.created_at,
        updated_at: scan.created_at,
        source: 'local_scans',
      }))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    let onlineProducts = [];
    if (search) {
      try {
        onlineProducts = await searchOpenFoodFacts(search);
      } catch (openFoodError) {
        console.error('[Food database] Open Food Facts search failed:', openFoodError.message);
      }
    }

    const seen = new Set();
    const mergedProducts = [...localProducts, ...onlineProducts].filter((product) => {
      const key = product.code
        ? `code:${product.code}`
        : normalizeProductKey(product.brands, product.product_name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json(mergedProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product database' });
  }
});

// Get user's scan history
router.get('/', async (req, res) => {
  try {
    const scansRes = await req.pool.query(
      `
        SELECT
          s.*,
          COALESCE(s.nutriments, pd.nutriments) AS nutriments,
          COALESCE(s.raw_product_data, pd.raw_product_data) AS raw_product_data
        FROM scans s
        LEFT JOIN product_database pd
          ON pd.product_key = LOWER(COALESCE(s.brand, 'unknown')) || '::' || LOWER(TRIM(COALESCE(s.product_name, '')))
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
      `,
      [req.userId]
    );
    res.json(scansRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Save a new scan
router.post('/', async (req, res) => {
  const { productName, brand, score, ingredients, verdict, explanation, alternatives, sideEffects, productData, imageUrl } = req.body;
  const productNutriments = normalizeNutrimentsForServing(productData);

  // ── Debug logging ──
  console.log('━━━ POST /scans ━━━');
  console.log('  Product:', productName);
  console.log('  Brand:', brand);
  console.log('  Score:', score);
  console.log('  imageUrl received:', imageUrl ? `${typeof imageUrl} (${imageUrl.length} chars, starts with: ${imageUrl.substring(0, 50)}...)` : 'NULL / undefined');

  let finalImageUrl = imageUrl;

  try {
    // If the image is a base64 string, upload it to Cloudinary
    if (imageUrl && imageUrl.startsWith('data:image')) {
      console.log('  → Uploading to Cloudinary...');
      try {
        finalImageUrl = await uploadImage(imageUrl);
        console.log('  ✓ Cloudinary URL:', finalImageUrl);
      } catch (uploadErr) {
        console.error('  ✗ Cloudinary upload failed, falling back to original:', uploadErr.message);
        // Fallback to original if upload fails (though Cloudinary is preferred)
        finalImageUrl = imageUrl;
      }
    }

    const insertRes = await req.pool.query(
      'INSERT INTO scans (user_id, product_name, brand, score, ingredients, verdict, explanation, alternatives, side_effects, food_database_flag, image_url, nutriments, raw_product_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [
        req.userId,
        productName,
        brand,
        score,
        ingredients,
        verdict,
        explanation,
        JSON.stringify(alternatives),
        JSON.stringify(sideEffects || []),
        shouldShowInFoodDatabase(productName),
        finalImageUrl || null,
        productNutriments ? JSON.stringify(productNutriments) : null,
        productData ? JSON.stringify(productData) : null,
      ]
    );

    console.log('  ✓ Scan saved — id:', insertRes.rows[0].id, '| image_url in DB:', insertRes.rows[0].image_url ? 'SET' : 'NULL');

    await upsertProductDatabase(req.pool, req.userId, {
      productName,
      brand,
      score,
      ingredients,
      productData,
      verdict,
      alternatives,
      sideEffects,
      lang: req.headers['accept-language'] || req.body.lang || 'en',
    });

    // Reward points for scanning
    await req.pool.query('UPDATE users SET points = points + 5 WHERE id = $1', [req.userId]);

    res.json(insertRes.rows[0]);
  } catch (error) {
    console.error('  ✗ Scan save FAILED:', error);
    res.status(500).json({ error: 'Failed to save scan' });
  }
});

// Update servings count for a scan
router.patch('/:id/servings', async (req, res) => {
  const scanId = req.params.id;
  const { servings } = req.body;

  if (!Number.isFinite(Number(servings)) || Number(servings) <= 0) {
    return res.status(400).json({ error: 'Servings must be a positive number' });
  }

  try {
    const scanRes = await req.pool.query('SELECT user_id FROM scans WHERE id = $1', [scanId]);
    if (scanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const scan = scanRes.rows[0];
    const { requireOwnership } = require('../utils/ownershipCheck');
    requireOwnership(scan.user_id, req.userId);

    const result = await req.pool.query(
      'UPDATE scans SET servings = $1 WHERE id = $2 RETURNING *',
      [Number(servings), scanId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update servings:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update servings' });
  }
});

// GET a single scan by ID (with ownership check)
router.get('/:id', async (req, res) => {
  const scanId = req.params.id;
  try {
    const scanRes = await req.pool.query(
      `
        SELECT
          s.*,
          COALESCE(s.nutriments, pd.nutriments) AS nutriments,
          COALESCE(s.raw_product_data, pd.raw_product_data) AS raw_product_data
        FROM scans s
        LEFT JOIN product_database pd
          ON pd.product_key = LOWER(COALESCE(s.brand, 'unknown')) || '::' || LOWER(TRIM(COALESCE(s.product_name, '')))
        WHERE s.id = $1
      `,
      [scanId]
    );

    if (scanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const scan = scanRes.rows[0];
    const { requireOwnership } = require('../utils/ownershipCheck');
    requireOwnership(scan.user_id, req.userId);

    res.json(scan);
  } catch (error) {
    console.error('Failed to get scan:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch scan' });
  }
});

// DELETE a scan by ID (with ownership check)
router.delete('/:id', async (req, res) => {
  const scanId = req.params.id;
  try {
    const scanRes = await req.pool.query('SELECT user_id FROM scans WHERE id = $1', [scanId]);
    if (scanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const scan = scanRes.rows[0];
    const { requireOwnership } = require('../utils/ownershipCheck');
    requireOwnership(scan.user_id, req.userId);

    await req.pool.query('DELETE FROM scans WHERE id = $1', [scanId]);
    res.json({ message: 'Scan successfully deleted' });
  } catch (error) {
    console.error('Failed to delete scan:', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to delete scan' });
  }
});

module.exports = router;
