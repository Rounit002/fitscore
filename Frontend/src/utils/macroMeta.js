import { Beef, Droplet, Flame, Shell, Wheat } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Macro / nutrient category map (DESIGN_TOKENS.md 14, round 3)        */
/* ------------------------------------------------------------------ */

/* One accent and one glyph per nutrient category, defined once. Before this,
   every macro badge on every screen was the same brand green (or a neutral
   letter), so the badge identified nothing — it was decoration standing in the
   place where information belonged.

   Colour is referenced, never restated: each entry points at the `--sem-macro-*`
   custom property, so light and dark come out of the token layer and there is no
   second copy of a hex to drift out of step with the stylesheet. That is the
   failure mode the score map already has to guard against with a mirror check.

   The glyph carries the same meaning as the colour, so the category still reads
   in greyscale and for a colour-blind user (TOKENS 11, brief 0.6 finding 8). */

export const MACRO_META = {
  calories: { key: 'calories', accent: 'var(--sem-macro-calories)', icon: Flame,   letter: 'K', labelKey: 'calories', fallback: 'Calories' },
  protein:  { key: 'protein',  accent: 'var(--sem-macro-protein)',  icon: Beef,    letter: 'P', labelKey: 'protein',  fallback: 'Protein' },
  carbs:    { key: 'carbs',    accent: 'var(--sem-macro-carbs)',    icon: Wheat,   letter: 'C', labelKey: 'carbs',    fallback: 'Carbs' },
  fats:     { key: 'fats',     accent: 'var(--sem-macro-fats)',     icon: Droplet, letter: 'F', labelKey: 'fats',     fallback: 'Fats' },
  sodium:   { key: 'sodium',   accent: 'var(--sem-macro-sodium)',   icon: Shell,   letter: 'Na', labelKey: 'sodium',  fallback: 'Sodium' },
};

/* Unknown keys fall back to the neutral outline rather than to a brand colour,
   so a nutrient nobody has classified yet reads as "uncategorised" instead of
   quietly borrowing protein's accent. */
export const macroMeta = (key) =>
  MACRO_META[key] ?? { key, accent: 'var(--ns-outline)', icon: null, letter: '?', labelKey: key, fallback: key };

/* Soft tinted badge fill, derived from the category's own accent rather than
   hand-picked, so a fill can never drift away from the colour it sits behind
   (TOKENS 14, rule 5). 12% is the single icon-badge tint from TOKENS 7. */
export const macroTint = (accent, percent = 12) =>
  `color-mix(in srgb, ${accent} ${percent}%, transparent)`;
