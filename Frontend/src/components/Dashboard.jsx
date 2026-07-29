import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart2,
  Flame,
  Scale,
  Search,
} from 'lucide-react';
import CalendarStrip from './CalendarStrip';
import ScanCard from './ScanCard.jsx';
import DailyNutritionCard from './DailyNutritionCard.jsx';
import EmptyPreview from './EmptyPreview.jsx';
import { API } from '../api/client.js';
import { addDays, endOfWeek, startOfDay, toDateKey } from '../utils/calendarDates.js';

/* ------------------------------------------------------------------ */
/*  Data helpers (logic unchanged)                                     */
/* ------------------------------------------------------------------ */

const parseScanDate = (scan) => {
  const rawDate = scan.created_at || scan.createdAt || scan.date;
  const parsed = rawDate ? new Date(rawDate) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
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

// WHO BMI categories. Colours come from the semantic map so the band shown here
// matches the band colour used anywhere else BMI appears, and so dark mode can
// lighten them without this file knowing (DESIGN_TOKENS.md 14).
const getBmiCategory = (bmi) => {
  if (bmi < 18.5) return { key: 'underweight', label: 'Underweight', color: 'var(--sem-bmi-under)' };
  if (bmi < 25) return { key: 'normal', label: 'Normal', color: 'var(--sem-bmi-normal)' };
  if (bmi < 30) return { key: 'overweight', label: 'Overweight', color: 'var(--sem-bmi-over)' };
  return { key: 'obese', label: 'Obese', color: 'var(--sem-bmi-obese)' };
};

/* ------------------------------------------------------------------ */
/*  Shared style tokens                                                */
/* ------------------------------------------------------------------ */

// Surface card that adapts to light / dark via CSS variables.
// rounded-xl = 20px radius token; edge-hairline + elev-rest are the standard
// "distinct surface that is not the focus of attention" treatment.
const CARD = 'rounded-xl edge-hairline elev-rest bg-[var(--ns-card-bg)]';

/* Stable identity for "no scans on this day", so a day with no activity does not
   hand a fresh [] to the memoised nutrition totals on every render. */
const EMPTY_SCANS = [];

/* Score-band colour now lives entirely inside ScanCard, which is the only thing
   on this screen that renders a score. The local alias here was the last
   reference. */

/* ProgressRing, MacroBar and DailyNutritionCard moved to DailyNutritionCard.jsx
   so the History page can show the same totals for the day it has selected. */

/* The per-scan row now lives in ScanCard.jsx, shared with History. The local
   copy here and the one on the History page had drifted apart (different
   thumbnail sizes, badge vs. bare number for the score), which is exactly the
   duplication the score-colour helper was extracted to stop. */

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
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--ns-primary)_12%,transparent)] text-ns-primary-con">
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
              className="tap-44 min-h-11 shrink-0 rounded-lg edge-hairline elev-rest bg-ns-primary px-3 text-xs font-bold text-white transition hover:bg-ns-primary-con active:scale-[0.98]"
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
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--ns-primary)_12%,transparent)] text-ns-primary-con">
            <Scale size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="font-[var(--font-headline)] text-base font-bold text-[var(--ns-on-surface)]">
              {t('bmi_title', 'Body Mass Index')}
            </h2>
            <p className="num-tabular truncate text-xs text-[var(--ns-on-surface-var)]">
              {heightCm} {t('cm', 'cm')} · {weightKg} {t('kg', 'kg')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="num-tabular font-[var(--font-headline)] text-3xl font-bold leading-none text-[var(--ns-on-surface)]">
            {bmi.toFixed(1)}
          </span>
          <span
            className="mt-1.5 rounded-full edge-hairline px-2.5 py-0.5 text-[11px] font-bold text-white"
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
            className="num-tabular absolute text-[10px] font-semibold text-[var(--ns-outline)]"
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
}) {
  const { t } = useTranslation();

  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date navigation. The calendar owns scrolling; this is only the selection.
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

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

  /* Scans bucketed by local date key. One pass over the list feeds both the
     calendar's event markers and the selected-day list, so switching dates does
     no filtering work and fires no extra request. */
  const scansByDay = useMemo(() => {
    const buckets = new Map();
    scans.forEach((scan) => {
      const date = parseScanDate(scan);
      if (!date) return;
      const key = toDateKey(date);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(scan);
      else buckets.set(key, [scan]);
    });
    return buckets;
  }, [scans]);

  const eventCounts = useMemo(() => {
    const counts = new Map();
    scansByDay.forEach((dayScans, key) => counts.set(key, dayScans.length));
    return counts;
  }, [scansByDay]);

  const scansForSelectedDay = useMemo(
    () => scansByDay.get(toDateKey(selectedDate)) ?? EMPTY_SCANS,
    [scansByDay, selectedDate]
  );

  const today = useMemo(() => startOfDay(new Date()), []);
  const isSelectedDateToday = toDateKey(selectedDate) === toDateKey(today);

  /* Rail bounds. The past end reaches back to the oldest scan, with a 120-day
     floor so there is always somewhere to scroll on a new account — every cell
     is a real DOM button, so the span is tied to real data rather than being an
     arbitrarily long fixed window. Every day that has scans is inside it by
     construction, so nothing in the history is unreachable. The future end runs
     to the end of the current week: the rest of this week stays visible (as in
     the reference) but is not selectable. */
  const { railStart, railEnd } = useMemo(() => {
    let oldest = addDays(today, -120);
    scansByDay.forEach((_, key) => {
      const date = startOfDay(new Date(`${key}T00:00:00`));
      if (date < oldest) oldest = date;
    });
    return { railStart: oldest, railEnd: endOfWeek(today) };
  }, [scansByDay, today]);

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

  return (
    <div className="fitscan-dashboard-root relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 sm:pt-6 lg:gap-6">
      {/* Greeting header */}
      <div className={`${CARD} flex items-center justify-between gap-3 p-4 sm:p-6`}>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ns-primary-con">
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
          {/* Streak chip: a chip is its own container, so the flame gets no
              circular backdrop (DESIGN_TOKENS.md 7). Hairline + rest elevation
              so it reads as a surface instead of a floating colour patch. */}
          {/* Streak is engagement, not a score, so the flame takes --sem-streak
              rather than the brand green (which reads as "good") or the amber
              score band (which reads as "caution"). */}
          {streak > 0 && (
            <div className="tap-44 flex min-h-11 items-center gap-2 rounded-lg edge-hairline elev-rest bg-[var(--ns-surface-low)] px-3">
              <Flame
                size={16}
                className="translate-y-[0.5px]"
                style={{ color: 'var(--sem-streak)' }}
              />
              <span className="num-tabular text-sm font-bold text-[var(--ns-on-surface)]">
                {streak}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Responsive body: single column on mobile, two columns on desktop */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* Left column */}
      <div className="flex flex-col gap-5 lg:gap-6">
      {/* Date rail. Standalone: it is the filter for the whole screen, not a
          container for one section's results, so it owns no content of its own. */}
      <CalendarStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        eventCounts={eventCounts}
        minDate={railStart}
        maxDate={railEnd}
        maxSelectableDate={today}
        label={t('filter_by_date', 'Filter scans by date')}
      />

      {/* Daily nutrition totals for the selected day. Always rendered — an
          all-zero ring still communicates the day's goal, and hiding the card on
          empty days made the dashboard layout jump between dates. */}
      <DailyNutritionCard
        scans={scansForSelectedDay}
        title={isSelectedDateToday
          ? t('daily_nutrition', "Today's Nutrition")
          : `${new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(selectedDate)} ${t('nutrition', 'Nutrition')}`}
      />
      </div>
      {/* End left column */}

      {/* Right column */}
      <div className="flex flex-col gap-5 lg:gap-6">
      {/* Scans for the selected day only. This list is deliberately NOT a
          "recent scans" fallback: showing the 5 latest scans on a day with no
          activity made it look like those scans happened on the selected date. */}
      <section className={`${CARD} p-4 sm:p-5`} aria-label="Scans for the selected day">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate font-[var(--font-headline)] text-base font-bold text-[var(--ns-on-surface)]">
            {t('scans_for_day', 'Scans for this day')}
            {scansForSelectedDay.length > 0 && (
              <span className="num-tabular ml-1.5 font-medium text-[var(--ns-on-surface-var)]">
                ({scansForSelectedDay.length})
              </span>
            )}
          </h2>
          {/* Text button next to a heading: exempt from the edge system, but the
              hit area still has to reach 44px. Uses primary-con because #10B981
              on a light surface is only ~2.3:1 against white. */}
          <button
            type="button"
            className="tap-44 -mr-2 inline-flex min-h-11 shrink-0 items-center rounded-md border-0 px-2 text-xs font-bold text-ns-primary-con transition hover:bg-[var(--ns-surface-low)]"
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
          <div
            className="rounded-xl p-4 text-center text-sm font-semibold"
            style={{
              border: '1px solid color-mix(in srgb, var(--ns-error) 30%, transparent)',
              background: 'color-mix(in srgb, var(--ns-error) 8%, transparent)',
              color: 'var(--ns-error)',
            }}
            role="alert"
          >
            {error}
          </div>
        ) : scansForSelectedDay.length === 0 ? (
          /* Empty state shows a skeleton of the real scan card rather than a
             glyph and a sentence, so it demonstrates what the feature produces
             instead of only stating an absence. Copy is scoped to the selected
             day. No CTA — the bottom nav's scan button is always on screen. */
          <EmptyPreview
            title={t('no_scans_this_day', 'No scans on this day')}
            hint={
              isSelectedDateToday
                ? t('scan_first_product', 'Scan your first product to get started!')
                : t('no_scans_this_day_hint', 'Nothing was scanned on this date. Pick another day above.')
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {scansForSelectedDay.map((scan) => (
              <ScanCard key={scan.id} scan={scan} onSelect={handleViewDetail} />
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
        {/* Two tiles now, so the desktop track count drops from 4 to 2 rather
            than leaving half the row empty. */}
        <div className="grid grid-cols-2 gap-3">
          {[
            /* Trends and Profile were removed from this row: both are permanent
               bottom-nav tabs, so a second entry point here added no reach and
               no speed. Compare and Food DB stay because this is their only
               route. */
            /* One accent per destination, so the two tiles are distinguishable
               at a glance instead of being two identical green squares. They
               keep the same size, radius and hairline, because they are still
               peers — only the accent differs. */
            { view: 'compare', icon: BarChart2, label: t('compare', 'Compare'), accent: 'var(--sem-area-account)' },
            { view: 'foodDatabase', icon: Search, label: t('food_db_title', 'Food DB'), accent: 'var(--sem-area-support)' },
          ].map(({ view, icon: Icon, label, accent }) => (
            /* Both are peers and both are the sole route to their screen, so
               they take the same hairline. */
            <button
              key={view}
              type="button"
              className={`${CARD} flex min-h-26 flex-col items-center justify-center gap-2 p-4 transition hover:border-[color-mix(in_srgb,var(--ns-primary)_40%,transparent)] active:scale-[0.98]`}
              onClick={() => onNavigate(view)}
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-lg"
                style={{
                  background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                  color: accent,
                }}
              >
                <Icon size={20} />
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
