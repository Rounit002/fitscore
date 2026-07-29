import { Utensils } from 'lucide-react';
import { scoreColor } from '../utils/scoreColor.js';
import { getProductData, getServingNutrition } from '../utils/nutrition.js';
import { MACRO_META, macroTint } from '../utils/macroMeta.js';

/* ------------------------------------------------------------------ */
/*  Scan entry card                                                    */
/* ------------------------------------------------------------------ */

/* One scan, as a tappable row. Extracted from Dashboard so the dashboard's
   selected-day list and the History list are the same component instead of two
   drifting copies — they previously disagreed on thumbnail size, on whether the
   score was a badge or a bare number, and on which fields were shown at all.

   Nutrient figures come from the shared nutrition util, so a card cannot show a
   different calorie count from the rest of the app. */

const CARD = 'rounded-xl edge-hairline elev-rest bg-[var(--ns-card-bg)]';

const format = (value, decimals = 0) => {
  if (value === null || !Number.isFinite(value)) return '--';
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals);
};

/* Labels and accents both come from the shared macro map, so a chip here and a
   macro bar on the dashboard identify the same nutrient the same way. */
const buildChips = (scan, servings) => {
  const n = getServingNutrition(scan, servings);
  return [
    { meta: MACRO_META.calories, label: 'Cal', value: `${format(n.calories)}` },
    { meta: MACRO_META.protein, label: MACRO_META.protein.letter, value: `${format(n.protein, 1)}g` },
    { meta: MACRO_META.carbs, label: MACRO_META.carbs.letter, value: `${format(n.carbs, 1)}g` },
    { meta: MACRO_META.sodium, label: MACRO_META.sodium.letter, value: `${format(n.sodium)}mg` },
    { meta: MACRO_META.fats, label: MACRO_META.fats.letter, value: `${format(n.fats, 1)}g` },
  ];
};

export default function ScanCard({
  scan,
  onSelect,
  /* Secondary line under the product name. Defaults to the brand; History passes
     a timestamp instead, because in a long list "when" identifies a row and the
     brand does not. */
  meta,
  /* Macro chips are useful when the list is short (one day's scans) and become
     noise in a full history, so the caller decides. */
  showChips = true,
}) {
  const score = Number(scan.score ?? 0);
  const hasScore = Number.isFinite(score) && scan.score !== null && scan.score !== undefined;
  const color = scoreColor(score);
  const productData = getProductData(scan);
  const imageUrl =
    scan.image_url || productData?.image_front_small_url || productData?.image_front_url;
  const name = scan.product_name || 'Product';
  const secondary = meta ?? scan.brand ?? '';

  return (
    <button
      type="button"
      onClick={() => onSelect(scan)}
      className={`${CARD} flex w-full flex-col gap-3 p-3 text-left transition hover:border-[color-mix(in_srgb,var(--ns-primary)_40%,transparent)] active:scale-[0.99] sm:p-4`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-lg edge-hairline object-cover"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          /* Fallback mark is a tint of the score colour, so a card with no photo
             still carries the same signal as one with a photo. */
          <span
            aria-hidden="true"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-lg edge-hairline"
            style={{
              background: `color-mix(in srgb, ${color} 14%, transparent)`,
              color,
            }}
          >
            <Utensils size={20} />
          </span>
        )}

        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="truncate text-sm font-bold text-[var(--ns-on-surface)]">{name}</strong>
          {secondary ? (
            <span className="truncate text-xs text-[var(--ns-on-surface-var)]">{secondary}</span>
          ) : null}
        </span>

        <span
          className="num-tabular flex h-11 w-11 shrink-0 flex-col items-center justify-center self-start rounded-lg edge-hairline font-[var(--font-headline)] text-sm font-bold leading-none"
          style={{
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            color,
          }}
        >
          {hasScore ? score : '--'}
          <span className="text-[9px] font-semibold opacity-80">/10</span>
        </span>
      </div>

      {showChips && (
        <span className="grid grid-cols-5 gap-1">
          {buildChips(scan, scan.servings || 1).map((chip) => (
            /* The category tint sits on the chip and the accent colours only the
               identifier; the figure itself stays on the neutral text colour so
               a 10px number is never asked to carry contrast on a tinted fill. */
            <span
              key={chip.meta.key}
              className="num-tabular truncate rounded-sm edge-hairline px-1 py-1 text-center text-[10px] font-semibold text-[var(--ns-on-surface)]"
              style={{ background: macroTint(chip.meta.accent, 10) }}
            >
              <span style={{ color: chip.meta.accent }}>{chip.label}</span> {chip.value}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
