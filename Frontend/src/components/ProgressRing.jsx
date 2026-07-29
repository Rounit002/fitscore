/* ------------------------------------------------------------------ */
/*  Radial progress ring                                               */
/* ------------------------------------------------------------------ */

/* Extracted from DailyNutritionCard so any goal-based number can use the same
   arc. It was private to the calorie card, which is why the health score — also
   a value against a fixed ceiling — had no ring at all and read as a flat
   figure. Two implementations of "value against a goal" would be two chances to
   disagree about how a full ring looks.

   Drawn in a normalised 100x100 viewBox so `size` can be any CSS length
   (including a clamp()). Everything scales together, which is what lets the ring
   sit beside a macro list on a 360px phone instead of stacking above it.
   `stroke` is therefore in viewBox units, i.e. % of the diameter.

   Only apply this where the number has a real ceiling. A count with no natural
   maximum (total scans, streak length) would need an arbitrary denominator, and
   the ring would then be showing a goal the product never set. */

export default function ProgressRing({
  value,
  max,
  size = '168px',
  stroke = 8,
  trackColor = 'var(--ns-border-light)',
  color = 'var(--ns-primary)',
  glow = false,
  children,
}) {
  const pct = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  const radius = (100 - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{
            transition: 'stroke-dasharray var(--dur-figure) var(--ease-pop)',
            // Soft halo on the filled arc only, so the ring reads as "lit"
            // without needing an extra blurred element behind the card.
            filter: glow && pct > 0
              ? `drop-shadow(0 0 6px color-mix(in srgb, ${color} 60%, transparent))`
              : undefined,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
