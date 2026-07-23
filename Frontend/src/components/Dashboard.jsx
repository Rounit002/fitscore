import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  BarChart2,
  Camera,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Scale,
  Search,
  Sparkles,
  User,
  Utensils,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { API } from '../api/client.js';

/* ------------------------------------------------------------------ */
/*  Data helpers (logic unchanged)                                     */
/* ------------------------------------------------------------------ */

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMonthKey = (date) => toDateKey(date).slice(0, 7);

const parseScanDate = (scan) => {
  const rawDate = scan.created_at || scan.createdAt || scan.date;
  const parsed = rawDate ? new Date(rawDate) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const startOfWeek = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
};

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const monthKeyToDate = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

const safeJsonValue = (value, fallback = null) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNutrientValue = (value, decimals = 0) => {
  const parsed = numberOrNull(value);
  if (parsed === null) return '--';
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(decimals);
};

const firstNumericValue = (...values) => {
  for (const value of values) {
    const parsed = numberOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const getScanNutriments = (scan) => {
  const rawProductData = safeJsonValue(scan.raw_product_data, null) || safeJsonValue(scan.product_data, null);
  const direct = safeJsonValue(scan.nutriments, null) || safeJsonValue(scan.nutrition, null);
  return direct || rawProductData?.nutriments || rawProductData?.nutrition || rawProductData?.nutrientLevels || {};
};

const getScanProductData = (scan) => (
  safeJsonValue(scan.raw_product_data, null) || safeJsonValue(scan.product_data, null) || {}
);

const parseServingGrams = (productData, nutriments) => {
  const directServing = firstNumericValue(
    productData?.serving_quantity,
    nutriments?.serving_quantity,
    nutriments?.serving_size
  );
  if (directServing !== null) return directServing;

  const servingText = String(productData?.serving_size || nutriments?.serving_size || '');
  const match = servingText.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml|millilitre|milliliter|millilitres|milliliters)\b/i);
  return match ? Number(match[1]) : null;
};

const getServingAmount = ({ nutriments, servingKeys, per100Keys, servingGrams, multiplier = 1 }) => {
  const servingValue = firstNumericValue(...servingKeys.map((key) => nutriments?.[key]));
  if (servingValue !== null) return servingValue * multiplier;

  const per100Value = firstNumericValue(...per100Keys.map((key) => nutriments?.[key]));
  if (per100Value === null || servingGrams === null) return null;

  return (per100Value * servingGrams * multiplier) / 100;
};

const getServingSodiumMg = (nutriments, servingGrams) => {
  const sodiumMgServing = firstNumericValue(nutriments?.sodium_mg_serving, nutriments?.sodium_mg, nutriments?.sodium_mg_value);
  if (sodiumMgServing !== null) return sodiumMgServing;

  const sodiumServingGrams = firstNumericValue(nutriments?.sodium_serving, nutriments?.sodium_value);
  if (sodiumServingGrams !== null) return sodiumServingGrams * 1000;

  const sodiumMg100g = firstNumericValue(nutriments?.sodium_mg_100g);
  if (sodiumMg100g !== null && servingGrams !== null) return (sodiumMg100g * servingGrams) / 100;

  const sodium100gGrams = firstNumericValue(nutriments?.sodium_100g, nutriments?.sodium);
  if (sodium100gGrams !== null && servingGrams !== null) return (sodium100gGrams * servingGrams * 1000) / 100;

  const saltServingGrams = firstNumericValue(nutriments?.salt_serving);
  if (saltServingGrams !== null) return saltServingGrams * 400;

  const salt100gGrams = firstNumericValue(nutriments?.salt_100g, nutriments?.salt);
  if (salt100gGrams !== null && servingGrams !== null) return (salt100gGrams * servingGrams * 400) / 100;

  return null;
};

const getRecentNutrientChips = (scan, servings = 1) => {
  const nutriments = getScanNutriments(scan);
  const productData = getScanProductData(scan);
  const servingGrams = parseServingGrams(productData, nutriments);
  const sodiumMg = getServingSodiumMg(nutriments, servingGrams);
  const multiplier = Number.isFinite(Number(servings)) ? Number(servings) : 1;

  return [
    {
      icon: 'Cal',
      label: 'Calories',
      value: `${formatNutrientValue((getServingAmount({
        nutriments,
        servingKeys: ['energy-kcal_serving', 'energy_kcal_serving', 'energy-kcal_value', 'energy_kcal_value', 'calories_serving', 'caloriesServing'],
        per100Keys: ['energy-kcal_100g', 'energy-kcal', 'energy_kcal_100g', 'energy_kcal', 'calories'],
        servingGrams,
      }) ?? 0) * multiplier)} kcal`,
    },
    {
      icon: 'P',
      label: 'Protein',
      value: `${formatNutrientValue(((getServingAmount({
        nutriments,
        servingKeys: ['proteins_serving', 'protein_serving', 'proteins_value', 'protein_value', 'proteinServing'],
        per100Keys: ['proteins_100g', 'protein_100g', 'protein', 'proteins'],
        servingGrams,
      }) ?? 0) * multiplier), 1)}g`,
    },
    {
      icon: 'C',
      label: 'Carbs',
      value: `${formatNutrientValue(((getServingAmount({
        nutriments,
        servingKeys: ['carbohydrates_serving', 'carbs_serving', 'carbohydrates_value', 'carbs_value', 'carbohydratesServing', 'carbsServing'],
        per100Keys: ['carbohydrates_100g', 'carbs_100g', 'carbs', 'carbohydrates'],
        servingGrams,
      }) ?? 0) * multiplier), 1)}g`,
    },
    { icon: 'Na', label: 'Sodium', value: `${formatNutrientValue((sodiumMg ?? 0) * multiplier)}mg` },
    {
      icon: 'F',
      label: 'Fats',
      value: `${formatNutrientValue(((getServingAmount({
        nutriments,
        servingKeys: ['fat_serving', 'fats_serving', 'fat_value', 'fats_value', 'fatServing', 'fatsServing'],
        per100Keys: ['fat_100g', 'fats_100g', 'fat', 'fats'],
        servingGrams,
      }) ?? 0) * multiplier), 1)}g`,
    },
  ];
};
/* ------------------------------------------------------------------ */
/*  BMI helpers                                                        */
/* ------------------------------------------------------------------ */

// Compute BMI from a user profile. Height is stored in cm, weight in kg.
// Returns a number rounded to 1 decimal, or null when data is missing/invalid.
const computeBmi = (profile) => {
  const heightCm = numberOrNull(profile?.height ?? profile?.height_cm ?? profile?.heightCm);
  const weightKg = numberOrNull(profile?.weight ?? profile?.weight_kg ?? profile?.weightKg);
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi) || bmi <= 0) return null;
  return Math.round(bmi * 10) / 10;
};

// WHO BMI categories.
const getBmiCategory = (bmi) => {
  if (bmi < 18.5) return { key: 'underweight', label: 'Underweight', color: '#3B82F6' };
  if (bmi < 25) return { key: 'normal', label: 'Normal', color: '#5BAD4E' };
  if (bmi < 30) return { key: 'overweight', label: 'Overweight', color: '#F59E0B' };
  return { key: 'obese', label: 'Obese', color: '#EF4444' };
};

/* ------------------------------------------------------------------ */
/*  Shared style tokens                                                */
/* ------------------------------------------------------------------ */

// Surface card that adapts to light / dark via CSS variables.
const CARD =
  'rounded-[20px] border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)]';

const SCORE_COLOR = (n) => (n >= 8 ? '#5BAD4E' : n >= 5 ? '#F59E0B' : '#EF4444');

/* ------------------------------------------------------------------ */
/*  Circular progress primitives                                       */
/* ------------------------------------------------------------------ */

function ProgressRing({ value, max, size = 168, stroke = 14, trackColor, color, children }) {
  const pct = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

function MacroBar({ label, value, unit, max, color, icon }) {
  const percent = value > 0 ? Math.max(6, Math.min((value / max) * 100, 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-[var(--ns-on-surface-var)]">
          <span aria-hidden="true">{icon}</span>
          {label}
        </span>
        <span className="font-bold text-[var(--ns-on-surface)]">
          {value}
          <span className="ml-0.5 text-xs font-medium text-[var(--ns-outline)]">{unit}</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--ns-border-light)]">
        <span
          className="block h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Week selector                                                      */
/* ------------------------------------------------------------------ */

function WeekSelector({
  selectedDate,
  selectedMonth,
  selectedDayCount,
  selectedMonthCount,
  weekStart,
  onChangeMonth,
  onSelectDate,
  onShiftWeek,
}) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());
  const selectedMonthName = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(monthKeyToDate(selectedMonth));

  return (
    <section className={`${CARD} p-4 sm:p-5`} aria-label="Filter scans by date">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <strong className="truncate font-[var(--font-headline)] text-base font-bold text-[var(--ns-on-surface)]">
            {selectedMonthName}
          </strong>
          <label className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl text-ns-primary transition-colors hover:bg-[var(--ns-surface-low)] hover:text-ns-primary-con">
            <CalendarDays size={18} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => onChangeMonth(event.target.value)}
              aria-label="Select month"
              className="absolute inset-0 h-full w-full cursor-pointer overflow-hidden border-0 p-0 opacity-0"
            />
          </label>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--ns-surface-low)] px-3 py-1 text-xs font-semibold text-ns-primary">
          {selectedMonthCount} scans
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <button
          type="button"
          onClick={() => onShiftWeek(-1)}
          aria-label="Previous week"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] text-[var(--ns-on-surface-var)] transition hover:border-ns-primary hover:text-ns-primary"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="grid min-w-0 flex-1 grid-cols-7 gap-1" role="list" aria-label="Week days">
          {days.map((date) => {
            const dayKey = toDateKey(date);
            const isSelected = dayKey === selectedKey;
            const isToday = dayKey === todayKey;
            const isOutsideMonth = toMonthKey(date) !== selectedMonth;

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => onSelectDate(date)}
                aria-pressed={isSelected}
                className={[
                  'flex min-w-0 min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-transparent px-0.5 py-2 transition',
                  isSelected
                    ? 'bg-ns-primary text-white shadow-[0_8px_18px_-6px_rgba(16,185,129,0.35)] hover:bg-ns-primary-con'
                    : 'text-[var(--ns-on-surface-var)] hover:border-[color-mix(in_srgb,var(--ns-primary)_24%,transparent)] hover:bg-[var(--ns-surface-low)]',
                  isOutsideMonth && !isSelected ? 'opacity-40' : '',
                ].join(' ')}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date).slice(0, 2)}
                </span>
                <strong className="text-sm font-bold">{date.getDate()}</strong>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isToday ? (isSelected ? 'bg-white' : 'bg-ns-primary') : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onShiftWeek(1)}
          aria-label="Next week"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] text-[var(--ns-on-surface-var)] transition hover:border-ns-primary hover:text-ns-primary"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <p className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--ns-border-light)] pt-3 text-sm font-medium text-[var(--ns-on-surface-var)]">
        <span className="min-w-0 truncate">
          {new Intl.DateTimeFormat('en-IN', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          }).format(selectedDate)}
        </span>
        <span className="shrink-0 font-bold text-[var(--ns-on-surface)]">{selectedDayCount} scans</span>
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Daily nutrition summary card                                       */
/* ------------------------------------------------------------------ */

function DailyNutritionCard({ scans }) {
  const { t } = useTranslation();

  const totals = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fats = 0;
    scans.forEach((scan) => {
      const chips = getRecentNutrientChips(scan, scan.servings || 1);
      const cal = parseFloat(chips[0]?.value) || 0;
      const pro = parseFloat(chips[1]?.value) || 0;
      const carb = parseFloat(chips[2]?.value) || 0;
      const fat = parseFloat(chips[4]?.value) || 0;
      calories += cal;
      protein += pro;
      carbs += carb;
      fats += fat;
    });
    return { calories, protein, carbs, fats };
  }, [scans]);

  const calGoal = 2000;

  return (
    <section className={`${CARD} p-4 sm:p-5`} aria-label="Daily nutrition summary">
      <h2 className="mb-4 font-[var(--font-headline)] text-base font-bold text-[var(--ns-on-surface)]">
        {t('daily_nutrition', "Today's Nutrition")}
      </h2>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <ProgressRing
          value={totals.calories}
          max={calGoal}
          size={148}
          stroke={12}
          trackColor="var(--ns-border-light)"
          color="#10B981"
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums text-[var(--ns-on-surface)]">
              {Math.round(totals.calories)}
            </span>
            <span className="text-xs font-semibold text-[var(--ns-on-surface-var)]">kcal</span>
            <span className="text-[10px] text-[var(--ns-outline)]">/ {calGoal}</span>
          </div>
        </ProgressRing>

        <div className="flex flex-1 flex-col gap-3 w-full">
          <MacroBar label={t('protein', 'Protein')} value={Math.round(totals.protein)} unit="g" max={150} color="#5BAD4E" icon="P" />
          <MacroBar label={t('carbs', 'Carbs')} value={Math.round(totals.carbs)} unit="g" max={300} color="#047857" icon="C" />
          <MacroBar label={t('fats', 'Fats')} value={Math.round(totals.fats)} unit="g" max={80} color="#10B981" icon="F" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent scan card                                                   */
/* ------------------------------------------------------------------ */

function RecentScanCard({ scan, onViewDetail }) {
  const chips = getRecentNutrientChips(scan, scan.servings || 1);
  const score = Number(scan.score ?? 0);
  const color = SCORE_COLOR(score);
  const productData = getScanProductData(scan);
  const imageUrl = scan.image_url || productData?.image_front_small_url || productData?.image_front_url;

  return (
    <button
      type="button"
      className={`${CARD} flex w-full flex-col gap-3 p-4 text-left`}
      onClick={() => onViewDetail(scan)}
    >
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={scan.product_name || 'Product'}
            className="h-14 w-14 rounded-2xl object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white text-xl"
            style={{ background: `${color}22` }}
            aria-hidden="true"
          >

          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate font-bold text-[var(--ns-on-surface)] text-sm">
            {scan.product_name || 'Product'}
          </p>
          <p className="truncate text-xs text-[var(--ns-on-surface-var)]">{scan.brand || ''}</p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 flex-col items-center justify-center self-start rounded-2xl font-bold text-sm"
          style={{ background: `${color}22`, color }}
        >
          {score}
          <span className="text-[9px] font-semibold opacity-80">/10</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="truncate rounded-lg bg-[var(--ns-surface-low)] px-1.5 py-1 text-center text-[10px] font-semibold text-[var(--ns-on-surface-var)]"
          >
            {chip.icon} {chip.value}
          </span>
        ))}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  BMI card                                                           */
/* ------------------------------------------------------------------ */

function BmiCard({ profile, onNavigate }) {
  const { t } = useTranslation();
  const bmi = useMemo(() => computeBmi(profile), [profile]);
  const heightCm = numberOrNull(profile?.height ?? profile?.height_cm ?? profile?.heightCm);
  const weightKg = numberOrNull(profile?.weight ?? profile?.weight_kg ?? profile?.weightKg);

  // No height/weight on file — prompt the user to complete their profile.
  if (bmi === null) {
    return (
      <section className={`${CARD} p-4 sm:p-5`} aria-label="Body Mass Index">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--ns-primary)_12%,transparent)] text-ns-primary">
            <Scale size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-[var(--font-headline)] text-base font-bold text-[var(--ns-on-surface)]">
              {t('bmi_title', 'Body Mass Index')}
            </h2>
            <p className="text-sm text-[var(--ns-on-surface-var)]">
              {t('bmi_missing', 'Add your height and weight in your profile to see your BMI.')}
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="shrink-0 rounded-xl bg-ns-primary px-3 py-2 text-xs font-bold text-white transition active:scale-95"
            >
              {t('update_profile', 'Update')}
            </button>
          )}
        </div>
      </section>
    );
  }

  const category = getBmiCategory(bmi);

  // Marker position on a 15–40 BMI scale.
  const MIN = 15;
  const MAX = 40;
  const markerPct = Math.max(0, Math.min(100, ((bmi - MIN) / (MAX - MIN)) * 100));

  // Tick labels at category boundaries, positioned by their true % on the scale.
  const ticks = [
    { v: '15', p: 0 },
    { v: '18.5', p: ((18.5 - MIN) / (MAX - MIN)) * 100 },
    { v: '25', p: ((25 - MIN) / (MAX - MIN)) * 100 },
    { v: '30', p: ((30 - MIN) / (MAX - MIN)) * 100 },
    { v: '40', p: 100 },
  ];

  return (
    <section className={`${CARD} p-4 sm:p-5`} aria-label="Body Mass Index">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--ns-primary)_12%,transparent)] text-ns-primary">
            <Scale size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="font-[var(--font-headline)] text-base font-bold text-[var(--ns-on-surface)]">
              {t('bmi_title', 'Body Mass Index')}
            </h2>
            <p className="truncate text-xs text-[var(--ns-on-surface-var)]">
              {heightCm} {t('cm', 'cm')} · {weightKg} {t('kg', 'kg')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="font-[var(--font-headline)] text-3xl font-bold leading-none tabular-nums text-[var(--ns-on-surface)]">
            {bmi.toFixed(1)}
          </span>
          <span
            className="mt-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
            style={{ background: category.color }}
          >
            {t(`bmi_${category.key}`, category.label)}
          </span>
        </div>
      </div>

      {/* Color-coded BMI scale with a marker at the user's value */}
      <div className="relative">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full" aria-hidden="true">
          <span className="h-full w-[14%] bg-blue-500" />
          <span className="h-full w-[26%] bg-emerald-500" />
          <span className="h-full w-[20%] bg-amber-500" />
          <span className="h-full w-[40%] bg-red-500" />
        </div>
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-md"
          style={{ left: `${markerPct}%`, background: category.color }}
          aria-hidden="true"
        />
      </div>
      <div className="relative mt-2 h-4">
        {ticks.map(({ v, p }, i) => (
          <span
            key={v}
            className="absolute text-[10px] font-semibold text-[var(--ns-outline)]"
            style={{
              left: `${p}%`,
              transform:
                i === 0 ? 'none' : i === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {v}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard component                                           */
/* ------------------------------------------------------------------ */

export default function Dashboard({
  userAuth,
  userProfile,
  onNavigate,
  onViewDetail,
  isDark,
  toggleTheme,
}) {
  const { t } = useTranslation();

  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date / week navigation
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthKey(new Date()));

  // Fetch all scans once on mount
  useEffect(() => {
    const controller = new AbortController();

    const loadScans = async () => {
      try {
        const response = await fetch(`${API}/scans`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to load scans');
        const data = await response.json();
        setScans(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        setError('Failed to load scans.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadScans();
    return () => controller.abort();
  }, []);

  // Filter scans for selected day and selected month
  const scansForSelectedDay = useMemo(
    () =>
      scans.filter((scan) => {
        const date = parseScanDate(scan);
        return date && toDateKey(date) === toDateKey(selectedDate);
      }),
    [scans, selectedDate]
  );

  const scansForSelectedMonth = useMemo(
    () =>
      scans.filter((scan) => {
        const date = parseScanDate(scan);
        return date && toMonthKey(date) === selectedMonth;
      }),
    [scans, selectedMonth]
  );

  const handleShiftWeek = (direction) => {
    const newStart = addDays(weekStart, direction * 7);
    setWeekStart(newStart);
    const newSelected = addDays(selectedDate, direction * 7);
    setSelectedDate(newSelected);
    setSelectedMonth(toMonthKey(newSelected));
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedMonth(toMonthKey(date));
    setWeekStart(startOfWeek(date));
  };

  const handleChangeMonth = (monthValue) => {
    setSelectedMonth(monthValue);
    const newDate = monthKeyToDate(monthValue);
    setSelectedDate(newDate);
    setWeekStart(startOfWeek(newDate));
  };

  const handleViewDetail = (scan) => {
    onViewDetail({
      scanId: scan.id,
      servings: scan.servings || 1,
      productName: scan.product_name || 'Product',
      brand: scan.brand || '',
      score: scan.score,
      verdict: safeJsonValue(scan.verdict, scan.verdict),
      explanation: scan.explanation,
      ingredientsAnalysis: safeJsonValue(scan.ingredients, []),
      alternatives: safeJsonValue(scan.alternatives, []),
      sideEffects: safeJsonValue(scan.side_effects, []),
      image_url: scan.image_url,
      barcode: scan.product_data?.barcode || scan.product_data?.code || '',
      recorded_at: scan.created_at,
      nutriments: scan.nutriments,
      rawProductData: scan.raw_product_data || scan.product_data,
    });
  };

  const displayName = userAuth?.name || userProfile?.name || 'Friend';
  const streak = userAuth?.streak ?? 0;
  const recentScans = scans.slice(0, 5);

  return (
    <div className="fitscan-dashboard-root relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 sm:pt-6 lg:gap-6">
      {/* Greeting header */}
      <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] p-4 sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-ns-primary">
            {t('welcome_back', 'Welcome back')}
          </p>
          <h1 className="mt-1 truncate font-[var(--font-headline)] text-2xl font-bold leading-tight text-[var(--ns-on-surface)] sm:text-3xl">
            {displayName}
          </h1>
          <p className="mt-2 hidden max-w-lg text-sm text-[var(--ns-on-surface-var)] sm:block">
            {t('dashboard_subtitle', 'Your nutrition workspace is ready for today.')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--ns-border-light)] bg-[var(--ns-surface-low)] px-3 py-1.5 shadow-sm">
              <Flame size={16} className="text-ns-primary" />
              <span className="text-sm font-bold text-[var(--ns-on-surface)]">{streak}</span>
            </div>
          )}
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
      </div>

      {/* Responsive body: single column on mobile, two columns on desktop */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* Left column */}
      <div className="flex flex-col gap-5 lg:gap-6">
      {/* Quick action buttons */}
      <div className="grid grid-cols-2 items-stretch gap-3">
        <button
          type="button"
          className="relative flex min-h-[78px] items-center gap-3 overflow-hidden rounded-[20px] bg-ns-primary p-4 text-left text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.3)] hover:bg-ns-primary-con"
          onClick={() => onNavigate('home')}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20">
            <Camera size={22} />
          </span>
          <span className="min-w-0 truncate text-sm font-bold">{t('scan_food', 'Scan Food')}</span>
        </button>
        <button
          type="button"
          className="flex min-h-[78px] items-center gap-3 rounded-[20px] border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] p-4 text-left text-[var(--ns-on-surface)]"
          onClick={() => onNavigate('history')}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--ns-primary)_12%,transparent)] text-ns-primary">
            <Activity size={22} />
          </span>
          <span className="min-w-0 truncate text-sm font-bold">{t('view_history', 'View History')}</span>
        </button>
        <div
          className="col-span-2 flex items-center gap-3 rounded-[20px] border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] p-4"
          aria-label="Dashboard summary"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--ns-tertiary)_12%,transparent)] text-ns-tertiary">
            <Sparkles size={18} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[var(--ns-outline)]">
              {t('this_month', 'This month')}
            </span>
            <span className="truncate text-sm text-[var(--ns-on-surface-var)]">{t('scans', 'scans')}</span>
          </div>
          <strong className="font-[var(--font-headline)] text-2xl leading-none tabular-nums text-[var(--ns-on-surface)]">
            {scansForSelectedMonth.length}
          </strong>
        </div>
      </div>

      {/* Week selector */}
      <WeekSelector
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        selectedDayCount={scansForSelectedDay.length}
        selectedMonthCount={scansForSelectedMonth.length}
        weekStart={weekStart}
        onChangeMonth={handleChangeMonth}
        onSelectDate={handleSelectDate}
        onShiftWeek={handleShiftWeek}
      />

      {/* Daily nutrition totals for the selected day */}
      {scansForSelectedDay.length > 0 && (
        <DailyNutritionCard scans={scansForSelectedDay} />
      )}
      </div>
      {/* End left column */}

      {/* Right column */}
      <div className="flex flex-col gap-5 lg:gap-6">
      {/* Recent scans */}
      <section className={`${CARD} p-4 sm:p-5`} aria-label="Recent scans">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[var(--font-headline)] text-base font-bold text-[var(--ns-on-surface)]">
            {scansForSelectedDay.length > 0
              ? t('scans_for_day', 'Scans for this day')
              : t('recent_scans', 'Recent Scans')}
          </h2>
          <button
            type="button"
            className="-mr-2 inline-flex min-h-[36px] items-center rounded-lg px-2 text-xs font-semibold text-ns-primary transition hover:bg-[var(--ns-surface-low)]"
            onClick={() => onNavigate('history')}
          >
            {t('see_all', 'See all')}
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-10 text-[var(--ns-on-surface-var)]">
            <div
              className="h-8 w-8 animate-spin rounded-full"
              style={{ border: '3px solid var(--ns-surface-high)', borderTopColor: 'var(--ns-primary)' }}
            />
            <span className="text-sm">{t('loading', 'Loading...')}</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
            {error}
          </div>
        ) : (scansForSelectedDay.length > 0 ? scansForSelectedDay : recentScans).length === 0 ? (
          <div className={`${CARD} flex flex-col items-center gap-3 p-8 text-center`}>
            <Utensils size={32} className="text-[var(--ns-outline)]" />
            <p className="font-bold text-[var(--ns-on-surface)]">{t('no_scans_yet', 'No scans yet')}</p>
            <p className="text-sm text-[var(--ns-on-surface-var)]">
              {t('scan_first_product', 'Scan your first product to get started!')}
            </p>
            <button
              type="button"
              className="mt-1 rounded-2xl bg-ns-primary px-5 py-2.5 text-sm font-bold text-white"
              onClick={() => onNavigate('home')}
            >
              {t('scan_now', 'Scan Now')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(scansForSelectedDay.length > 0 ? scansForSelectedDay : recentScans).map((scan) => (
              <RecentScanCard key={scan.id} scan={scan} onViewDetail={handleViewDetail} />
            ))}
          </div>
        )}
      </section>

      </div>
      {/* End right column */}
      </div>
      {/* End responsive body */}

      {/* Quick nav to other sections — full width below the two-column body */}
      <section aria-label="Quick navigation">
        <h2 className="mb-3 font-[var(--font-headline)] text-base font-bold text-[var(--ns-on-surface)]">
          {t('explore', 'Explore')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { view: 'compare', icon: BarChart2, label: t('compare', 'Compare') },
            { view: 'foodDatabase', icon: Search, label: t('food_db_title', 'Food DB') },
            { view: 'trends', icon: Activity, label: t('health_progress', 'Trends') },
            { view: 'profile', icon: User, label: t('profile', 'Profile') },
          ].map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              type="button"
              className={`${CARD} flex min-h-[102px] flex-col items-center justify-center gap-2 p-4`}
              onClick={() => onNavigate(view)}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--ns-primary)_11%,transparent)] text-ns-primary">
                <Icon size={22} />
              </span>
              <span className="text-xs font-semibold text-[var(--ns-on-surface)]">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Body Mass Index — computed from the user's saved height & weight */}
      <BmiCard profile={userProfile} onNavigate={onNavigate} />
    </div>
  );
}
