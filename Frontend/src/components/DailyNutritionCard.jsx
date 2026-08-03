import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getServingNutrition } from '../utils/nutrition.js';
import { MACRO_META, macroTint } from '../utils/macroMeta.js';
import ProgressRing from './ProgressRing.jsx';

/* ------------------------------------------------------------------ */
/*  Daily nutrition summary card                                       */
/* ------------------------------------------------------------------ */

/* Extracted from Dashboard so History can show the same totals for the day it
   has selected. Two copies of a calorie ring would be two chances to disagree
   about what a day adds up to. */

const CARD = 'rounded-xl edge-hairline elev-rest bg-[var(--ns-card-bg)]';

/* ProgressRing moved to ProgressRing.jsx so the health score — also a value
   against a fixed ceiling — can use the same arc instead of a second one. */

/* One macro row: category badge, name + amount on one line, track underneath.
   The badge is a soft tint of the category's own accent with the category's own
   glyph (MACRO_META), so it identifies *which* nutrient at a glance. It was a
   neutral circle holding a letter while all three tracks were the same brand
   green, which meant neither the badge nor the fill distinguished protein from
   carbs — the badges were decoration in the place information belonged.

   Sizes stay fluid rather than breakpoint-switched because this row has to hold
   its shape inside a ~160px column on small phones. */
function MacroBar({ label, value, unit, max, meta }) {
  const percent = value > 0 ? Math.max(6, Math.min((value / max) * 100, 100)) : 0;
  const { accent, icon: Icon, letter } = meta;
  return (
    <div className="flex items-center" style={{ gap: 'clamp(8px, 2.2vw, 16px)' }}>
      <span
        aria-hidden="true"
        className="grid shrink-0 place-items-center rounded-full font-semibold"
        style={{
          width: 'clamp(30px, 8.5vw, 48px)',
          height: 'clamp(30px, 8.5vw, 48px)',
          fontSize: 'clamp(12px, 3.2vw, 16px)',
          background: macroTint(accent),
          color: accent,
        }}
      >
        {/* Glyph, not just colour, so the category survives greyscale and
            colour-blindness (TOKENS 11). Icon scales with the badge. */}
        {Icon ? <Icon size={18} strokeWidth={2} /> : letter}
      </span>
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'clamp(5px, 1.4vw, 8px)' }}>
        <div
          className="flex items-baseline justify-between gap-2"
          style={{ fontSize: 'clamp(12px, 3.4vw, 15px)' }}
        >
          <span className="truncate font-medium text-[var(--ns-on-surface)]">{label}</span>
          <span className="num-tabular shrink-0 font-semibold text-[var(--ns-on-surface)]">
            {value}
            <span className="ml-0.5 font-normal text-[var(--ns-on-surface-var)]">{unit}</span>
          </span>
        </div>
        <div
          className="w-full overflow-hidden rounded-full bg-[var(--ns-border-light)]"
          style={{ height: 'clamp(6px, 1.6vw, 8px)' }}
        >
          <span
            className="block h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%`, background: accent }}
          />
        </div>
      </div>
    </div>
  );
}

/* `title` is not rendered as a heading — the card shows only the ring and the
   macro bars. It still names the card for assistive tech, which is the one place
   the selected date is otherwise lost. */
export default function DailyNutritionCard({ scans, title }) {
  const { t } = useTranslation();

  /* Totals come from the shared nutrition util's numeric output, not from
     parsing the formatted display strings back into numbers. */
  const totals = useMemo(() => {
    const sum = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    (scans || []).forEach((scan) => {
      const nutrition = getServingNutrition(scan, scan.servings || 1);
      sum.calories += nutrition.calories ?? 0;
      sum.protein += nutrition.protein ?? 0;
      sum.carbs += nutrition.carbs ?? 0;
      sum.fats += nutrition.fats ?? 0;
    });
    return sum;
  }, [scans]);

  const calGoal = 2000;

  return (
    <section
      className={`${CARD} p-4 sm:p-5`}
      aria-label={title || t('daily_nutrition', "Today's Nutrition")}
    >
      {/* Ring left, macro list right — on every width, including phones. The two
          halves are sized with clamp() rather than a breakpoint switch so they
          shrink together instead of the list wrapping under the ring. */}
      <div className="flex flex-row items-center" style={{ gap: 'clamp(10px, 3vw, 28px)' }}>
        {/* The ring stays on the brand accent rather than taking the calories
            category colour: it is the card's headline figure, not one of the
            three peer rows beside it, and the category accents exist to tell
            those peers apart. */}
        <ProgressRing
          value={totals.calories}
          max={calGoal}
          size="clamp(118px, 33vw, 184px)"
          stroke={8}
          trackColor="var(--ns-border-light)"
          color="var(--ns-primary)"
        >
          <div className="flex flex-col items-center leading-none">
            <span
              className="num-tabular font-[var(--font-headline)] font-bold leading-none tracking-[-0.02em] text-[var(--ns-on-surface)]"
              style={{ fontSize: 'clamp(28px, 8.4vw, 48px)' }}
            >
              {Math.round(totals.calories)}
            </span>
            <span
              className="font-normal leading-none text-[var(--ns-on-surface-var)]"
              style={{ fontSize: 'clamp(11px, 2.9vw, 16px)', marginTop: 'clamp(4px, 1.2vw, 8px)' }}
            >
              kcal
            </span>
            <span
              className="num-tabular leading-none text-[var(--ns-outline)]"
              style={{ fontSize: 'clamp(10px, 2.7vw, 15px)', marginTop: 'clamp(3px, 1vw, 6px)' }}
            >
              / {calGoal}
            </span>
          </div>
        </ProgressRing>

        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'clamp(12px, 3.4vw, 24px)' }}>
          {/* One accent per category, from the shared macro map. Categorical, not
              a judgement — so these stay clear of the score palette, and protein
              is no longer the score green (which implied "protein = good"). */}
          <MacroBar label={t('protein', 'Protein')} value={Math.round(totals.protein)} unit="g" max={150} meta={MACRO_META.protein} />
          <MacroBar label={t('carbs', 'Carbs')} value={Math.round(totals.carbs)} unit="g" max={300} meta={MACRO_META.carbs} />
          <MacroBar label={t('fats', 'Fats')} value={Math.round(totals.fats)} unit="g" max={80} meta={MACRO_META.fats} />
        </div>
      </div>
    </section>
  );
}
