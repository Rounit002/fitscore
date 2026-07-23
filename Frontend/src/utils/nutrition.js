export const safeJsonValue = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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

const pickObject = (...values) => {
  for (const value of values) {
    const parsed = safeJsonValue(value, null);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  }
  return {};
};

export const getProductData = (item = {}) => pickObject(
  item.rawProductData,
  item.raw_product_data,
  item.productData,
  item.product_data,
  item.product
);

export const getNutriments = (item = {}) => {
  const productData = getProductData(item);
  return pickObject(
    item.nutrition,
    item.nutriments,
    item.nutrientLevels,
    productData.nutrition,
    productData.nutriments,
    productData.nutrientLevels
  );
};

export const parseServingGrams = (item = {}) => {
  const productData = getProductData(item);
  const nutriments = getNutriments(item);
  const directServing = firstNumericValue(
    productData.serving_quantity,
    productData.servingQuantity,
    nutriments.serving_quantity,
    nutriments.servingQuantity
  );

  if (directServing !== null) return directServing;

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

const getServingAmount = ({ nutriments, servingKeys, per100Keys, servingGrams }) => {
  const servingValue = firstNumericValue(...servingKeys.map((key) => nutriments[key]));
  if (servingValue !== null) return servingValue;

  const per100Value = firstNumericValue(...per100Keys.map((key) => nutriments[key]));
  if (per100Value === null || servingGrams === null) return null;

  return (per100Value * servingGrams) / 100;
};

const getServingSodiumMg = (nutriments, servingGrams) => {
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
  if (sodiumMg100g !== null && servingGrams !== null) return (sodiumMg100g * servingGrams) / 100;

  const sodium100gGrams = firstNumericValue(nutriments.sodium_100g, nutriments.sodium);
  if (sodium100gGrams !== null && servingGrams !== null) return (sodium100gGrams * servingGrams * 1000) / 100;

  const saltServingGrams = firstNumericValue(nutriments.salt_serving);
  if (saltServingGrams !== null) return saltServingGrams * 400;

  const salt100gGrams = firstNumericValue(nutriments.salt_100g, nutriments.salt);
  if (salt100gGrams !== null && servingGrams !== null) return (salt100gGrams * servingGrams * 400) / 100;

  return null;
};

export const getServingNutrition = (item = {}, servings = 1) => {
  const nutriments = getNutriments(item);
  const servingGrams = parseServingGrams(item);
  const multiplier = Number.isFinite(Number(servings)) ? Number(servings) : 1;

  const calories = getServingAmount({
    nutriments,
    servingKeys: ['energy-kcal_serving', 'energy_kcal_serving', 'energy-kcal_value', 'energy_kcal_value', 'calories_serving', 'caloriesServing'],
    per100Keys: ['energy-kcal_100g', 'energy-kcal', 'energy_kcal_100g', 'energy_kcal', 'calories_100g', 'calories'],
    servingGrams,
  });

  const protein = getServingAmount({
    nutriments,
    servingKeys: ['proteins_serving', 'protein_serving', 'proteins_value', 'protein_value', 'proteinServing'],
    per100Keys: ['proteins_100g', 'protein_100g', 'protein', 'proteins'],
    servingGrams,
  });

  const carbs = getServingAmount({
    nutriments,
    servingKeys: ['carbohydrates_serving', 'carbs_serving', 'carbohydrates_value', 'carbs_value', 'carbohydratesServing', 'carbsServing'],
    per100Keys: ['carbohydrates_100g', 'carbs_100g', 'carbs', 'carbohydrates'],
    servingGrams,
  });

  const fats = getServingAmount({
    nutriments,
    servingKeys: ['fat_serving', 'fats_serving', 'fat_value', 'fats_value', 'fatServing', 'fatsServing'],
    per100Keys: ['fat_100g', 'fats_100g', 'fat', 'fats'],
    servingGrams,
  });

  const sodium = getServingSodiumMg(nutriments, servingGrams);

  return {
    calories: calories === null ? null : calories * multiplier,
    protein: protein === null ? null : protein * multiplier,
    carbs: carbs === null ? null : carbs * multiplier,
    sodium: sodium === null ? null : sodium * multiplier,
    fats: fats === null ? null : fats * multiplier,
  };
};

const formatNumber = (value, decimals = 0) => {
  const parsed = numberOrNull(value);
  if (parsed === null) return '--';
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(decimals);
};

export const getNutritionChips = (item = {}, servings = 1) => {
  const nutrition = getServingNutrition(item, servings);

  return [
    { key: 'calories', icon: 'ðŸ”¥', label: 'Calories', value: `${formatNumber(nutrition.calories)} kcal` },
    { key: 'protein', icon: 'ðŸ’ª', label: 'Protein', value: `${formatNumber(nutrition.protein, 1)}g` },
    { key: 'carbs', icon: 'ðŸŒ¾', label: 'Carbs', value: `${formatNumber(nutrition.carbs, 1)}g` },
    { key: 'sodium', icon: 'ðŸ§‚', label: 'Sodium', value: `${formatNumber(nutrition.sodium)}mg` },
    { key: 'fats', icon: 'ðŸ«™', label: 'Fats', value: `${formatNumber(nutrition.fats, 1)}g` },
  ];
};
