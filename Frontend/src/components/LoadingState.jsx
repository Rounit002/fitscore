import React, { useState, useEffect } from 'react';
import { Search, BrainCircuit, Sparkles, CheckCircle, Leaf, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/* ------------------------------------------------------------------ */
/*  Image Analyzing screen                                            */
/* ------------------------------------------------------------------ */

/* Redesigned for a calmer, more legible wait. The previous version stacked a
   112px floating hero tile, two blurred background blobs, an elapsed-time badge
   and a four-row step list with per-row progress bars — a lot of motion for a
   screen whose only job is to say "hang on". This version keeps a single focal
   ring with the live step icon at its centre, one horizontal progress track that
   fills as the steps advance, and a compact three-dot step indicator. */

// Step thresholds in seconds: step advances when elapsed crosses these values.
const STEP_THRESHOLDS = [0, 12, 28, 44];

function stepFromElapsed(elapsed) {
  let step = 0;
  for (let i = STEP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (elapsed >= STEP_THRESHOLDS[i]) { step = i; break; }
  }
  return step;
}

function formatElapsed(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function LoadingState({ elapsedSeconds, onCancel }) {
  const { t } = useTranslation();
  // Fallback internal timer when used without props (e.g. tests / standalone).
  const [internalElapsed, setInternalElapsed] = useState(0);
  const elapsed = elapsedSeconds !== undefined ? elapsedSeconds : internalElapsed;

  useEffect(() => {
    if (elapsedSeconds !== undefined) return; // driven externally
    const timer = setInterval(() => setInternalElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [elapsedSeconds]);

  const steps = [
    { text: t('ocr_extraction'), icon: Search },
    { text: t('profile_matching'), icon: Leaf },
    { text: t('health_impact'), icon: BrainCircuit },
    { text: t('verdict_generation'), icon: Sparkles },
  ];

  const step = stepFromElapsed(elapsed);
  const CurrentIcon = steps[step].icon;
  const showCancel = onCancel && elapsed >= 10;
  // Progress across the whole run, so the single track fills smoothly rather
  // than resetting per step.
  const progressPercent = Math.round(((step + 1) / steps.length) * 100);

  const hint =
    elapsed < 8 ? t('ai_processing') :
    elapsed < 22 ? t('health_impact') :
    elapsed < 40 ? t('high_demand') :
    t('almost_done', 'Almost done, hang tight…');

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-8 px-6 py-12 animate-fade-in-up"
      style={{ background: 'var(--ns-surface)', fontFamily: 'var(--font-main)' }}
    >
      {/* Focal ring: a single rotating accent arc around the current step icon.
          One piece of motion instead of the old tile + blobs + spinner chip. */}
      <div className="relative grid place-items-center" style={{ width: 132, height: 132 }}>
        <svg
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: '2.4s' }}
          width="132"
          height="132"
          viewBox="0 0 132 132"
          aria-hidden="true"
        >
          <circle cx="66" cy="66" r="60" fill="none" stroke="var(--ns-surface-high)" strokeWidth="4" />
          <circle
            cx="66"
            cy="66"
            r="60"
            fill="none"
            stroke="var(--ns-primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="94 283"
          />
        </svg>
        <div
          className="grid h-24 w-24 place-items-center rounded-full"
          style={{ background: 'color-mix(in srgb, var(--ns-primary) 12%, transparent)' }}
        >
          <CurrentIcon size={40} style={{ color: 'var(--ns-primary)' }} className="animate-pulse" />
        </div>
      </div>

      {/* Title, live hint and elapsed time. */}
      <div className="space-y-2 text-center">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-headline)', color: 'var(--ns-on-surface)', letterSpacing: '-0.01em' }}
        >
          {t('analyzing')}
        </h2>
        <p className="text-sm font-medium" style={{ color: 'var(--ns-outline)' }}>{hint}</p>
      </div>

      {/* Single progress track + elapsed time. */}
      <div className="flex w-full max-w-xs flex-col gap-2">
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--ns-surface-high)' }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%`, background: 'var(--ns-primary)' }}
          />
        </div>
        <div className="flex items-center justify-end text-xs font-semibold" style={{ color: 'var(--ns-outline)' }}>
          <span className="tabular-nums">{formatElapsed(elapsed)}</span>
        </div>
      </div>

      {/* Step list. Compact single-line rows: a leading marker (tick when done,
          filled dot when active, hollow otherwise) and the label. The active row
          carries full contrast; the rest recede. All four stay on screen so the
          user can see what is coming, not just where they are. */}
      <ul className="flex w-full max-w-xs flex-col gap-2.5">
        {steps.map((s, idx) => {
          const isDone = idx < step;
          const isActive = idx === step;
          return (
            <li key={idx} className="flex items-center gap-2.5" style={{ opacity: isDone || isActive ? 1 : 0.4 }}>
              <span
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full transition-all"
                style={{
                  background: isDone || isActive ? 'var(--ns-primary)' : 'transparent',
                  border: isDone || isActive ? 'none' : '1.5px solid var(--ns-outline-var)',
                }}
              >
                {isDone ? (
                  <CheckCircle size={12} style={{ color: 'var(--ns-on-primary)' }} />
                ) : isActive ? (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: 'var(--ns-on-primary)' }} />
                ) : null}
              </span>
              <span
                className="text-sm"
                style={{
                  color: isActive ? 'var(--ns-on-surface)' : 'var(--ns-outline)',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {s.text}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Cancel appears after 10s so a genuinely stuck scan has an exit. */}
      {showCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 transition-all animate-fade-in-up"
          style={{
            border: '1.5px solid var(--ns-outline-var)',
            background: 'transparent',
            color: 'var(--ns-outline)',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'var(--font-main)',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
          Cancel scan
        </button>
      )}
    </div>
  );
}
