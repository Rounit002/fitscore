import { Utensils } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Empty state with a mocked-up preview card                          */
/* ------------------------------------------------------------------ */

/* Every "nothing here yet" state in the app was a glyph plus two sentences,
   which states an absence without showing what the feature produces. This
   renders a skeleton of the *real* populated card instead — same thumbnail box,
   same row structure, same macro chip strip as ScanCard — so the empty state
   teaches the shape of a filled one.

   Shared rather than inlined per screen for the reason the score helper was
   extracted: two copies of "what a scan card looks like" would drift, and the
   preview would then stop resembling the thing it is previewing.

   Every part is aria-hidden and the whole block carries one text label, so a
   screen reader hears the message once and not a fake list of scans. */

/* Skeleton bar. Widths are passed in so the stack reads as text of varying
   length rather than as a set of identical grey rectangles. */
function Line({ w, h = 8 }) {
  return (
    <span
      className="block rounded-full bg-[var(--ns-border-light)]"
      style={{ width: w, height: h }}
    />
  );
}

export default function EmptyPreview({ title, hint, children }) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-[var(--edge-hairline)] bg-[var(--ns-card-bg)] px-4 py-7 text-center sm:px-6 sm:py-8"
      role="status"
    >
      {/* Preview stack. Two offset cards behind the front one imply a list
          continuing past the fold, which is what the front card alone cannot
          say. Slight rotation only — a large tilt would read as a broken
          layout rather than a stack. */}
      <div className="relative w-full max-w-[280px] select-none" aria-hidden="true">
        <span
          className="absolute inset-x-4 -top-2 h-full rounded-xl edge-hairline bg-[var(--ns-surface-low)] opacity-60"
          style={{ transform: 'scale(0.94)' }}
        />
        <span
          className="absolute inset-x-2 -top-1 h-full rounded-xl edge-hairline bg-[var(--ns-surface-low)] opacity-80"
          style={{ transform: 'scale(0.97)' }}
        />

        {/* Front card mirrors ScanCard's layout: 56px thumbnail, two text lines,
            score box on the right, five-up macro chip strip underneath. */}
        <span className="relative flex flex-col gap-3 rounded-xl edge-hairline elev-rest bg-[var(--ns-card-bg)] p-3">
          <span className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg edge-hairline bg-[var(--ns-surface-low)] text-[var(--ns-outline)]">
              <Utensils size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <Line w="72%" h={9} />
              <Line w="46%" h={7} />
            </span>
            <span className="h-11 w-11 shrink-0 self-start rounded-lg edge-hairline bg-[var(--ns-surface-low)]" />
          </span>
          <span className="grid grid-cols-5 gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-4 rounded-sm bg-[var(--ns-surface-low)]" />
            ))}
          </span>
        </span>
      </div>

      <span className="flex flex-col gap-1">
        <span className="font-bold text-[var(--ns-on-surface)]">{title}</span>
        {hint && <span className="text-sm text-[var(--ns-on-surface-var)]">{hint}</span>}
      </span>

      {children}
    </div>
  );
}
