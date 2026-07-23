import { safeJsonValue, getProductData, getNutriments, parseServingGrams, getServingNutrition, getNutritionChips } from './nutrition';

describe('safeJsonValue', () => {
  test('returns fallback for null/undefined/empty', () => {
    expect(safeJsonValue(null)).toBeNull();
    expect(safeJsonValue(undefined, 'x')).toBe('x');
    expect(safeJsonValue('', 0)).toBe(0);
  });
  test('parses valid JSON string', () => {
    expect(safeJsonValue('{"a":1}')).toEqual({ a: 1 });
  });
  test('returns fallback for invalid JSON', () => {
    expect(safeJsonValue('{bad', 'fb')).toBe('fb');
  });
  test('returns non-string values directly', () => {
    expect(safeJsonValue(42)).toBe(42);
    expect(safeJsonValue({ x: 1 })).toEqual({ x: 1 });
  });
});

describe('getProductData', () => {
  test('extracts from rawProductData', () => {
    expect(getProductData({ rawProductData: '{"a":1}' })).toEqual({ a: 1 });
  });
  test('returns {} for empty item', () => {
    expect(getProductData()).toEqual({});
  });
  test('skips arrays', () => {
    expect(getProductData({ rawProductData: '[1,2]', product_data: '{"b":2}' })).toEqual({ b: 2 });
  });
});

describe('getNutriments', () => {
  test('extracts from item.nutrition', () => {
    expect(getNutriments({ nutrition: { fat: 5 } })).toEqual({ fat: 5 });
  });
  test('falls through to productData.nutriments', () => {
    expect(getNutriments({ rawProductData: '{"nutriments":{"p":3}}' })).toEqual({ p: 3 });
  });
});

describe('parseServingGrams', () => {
  test('direct serving_quantity', () => {
    expect(parseServingGrams({ rawProductData: '{"serving_quantity":30}' })).toBe(30);
  });
  test('parses serving_size text', () => {
    expect(parseServingGrams({ rawProductData: '{"serving_size":"50g"}' })).toBe(50);
  });
  test('returns null when no data', () => {
    expect(parseServingGrams({})).toBeNull();
  });
});

describe('getServingNutrition', () => {
  test('computes from per-serving keys', () => {
    const item = { nutriments: { 'energy-kcal_serving': 200, proteins_serving: 10, carbohydrates_serving: 30, fat_serving: 8, sodium_mg_serving: 500 } };
    const r = getServingNutrition(item);
    expect(r.calories).toBe(200);
    expect(r.protein).toBe(10);
    expect(r.carbs).toBe(30);
    expect(r.fats).toBe(8);
    expect(r.sodium).toBe(500);
  });
  test('computes from per-100g with serving size', () => {
    const item = { rawProductData: '{"serving_quantity":50}', nutriments: { 'energy-kcal_100g': 400, proteins_100g: 20, carbohydrates_100g: 60, fat_100g: 16, sodium_100g: 0.5 } };
    const r = getServingNutrition(item);
    expect(r.calories).toBe(200);
    expect(r.protein).toBe(10);
    expect(r.fats).toBe(8);
    expect(r.sodium).toBe(250);
  });
  test('multiplier applies', () => {
    const item = { nutriments: { 'energy-kcal_serving': 100 } };
    expect(getServingNutrition(item, 2).calories).toBe(200);
  });
  test('returns nulls for empty item', () => {
    const r = getServingNutrition({});
    expect(r.calories).toBeNull();
  });
});

describe('getNutritionChips', () => {
  test('returns array of 5 chips', () => {
    const chips = getNutritionChips({});
    expect(chips).toHaveLength(5);
    expect(chips[0].key).toBe('calories');
    expect(chips[0].value).toContain('--');
  });
  test('formats values when data present', () => {
    const item = { nutriments: { 'energy-kcal_serving': 150, proteins_serving: 5.5, carbohydrates_serving: 20, fat_serving: 3.2, sodium_mg_serving: 100 } };
    const chips = getNutritionChips(item);
    expect(chips[0].value).toBe('150 kcal');
    expect(chips[1].value).toBe('5.5g');
  });
});
