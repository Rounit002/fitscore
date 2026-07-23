import React, { useState, useEffect } from 'react';
import { Search, BrainCircuit, Activity, Sparkles, CheckCircle, Leaf, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Step thresholds in seconds: step advances when elapsed crosses these values
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
  // Fallback internal timer when used without props (e.g. tests / standalone)
  const [internalElapsed, setInternalElapsed] = useState(0);
  const elapsed = elapsedSeconds !== undefined ? elapsedSeconds : internalElapsed;

  useEffect(() => {
    if (elapsedSeconds !== undefined) return; // driven externally
    const timer = setInterval(() => setInternalElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [elapsedSeconds]);

  const steps = [
    { text: t('ocr_extraction'),     icon: Search,      color: 'var(--ns-tertiary)' },
    { text: t('profile_matching'),   icon: Activity,    color: 'var(--ns-secondary-con)' },
    { text: t('health_impact'),      icon: BrainCircuit,color: 'var(--ns-primary)' },
    { text: t('verdict_generation'), icon: Sparkles,    color: 'var(--ns-primary)' },
  ];

  const step = stepFromElapsed(elapsed);
  const CurrentIcon = steps[step].icon;
  const showCancel = onCancel && elapsed >= 10;

  // Contextual hint copy that changes with elapsed time
  const hint =
    elapsed < 8  ? t('ai_processing') :
    elapsed < 22 ? t('health_impact') :
    elapsed < 40 ? t('high_demand') :
                   t('almost_done', 'Almost done, hang tight…');

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6 py-12 animate-fade-in-up gap-8"
      style={{ background: 'var(--ns-surface)', fontFamily: 'var(--font-main)' }}
    >
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'rgba(16, 185, 129, 0.07)' }} />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'rgba(35, 172, 241, 0.06)' }} />

      {/* Animated icon */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: 'rgba(16, 185, 129,0.12)', filter: 'blur(40px)', transform: 'scale(1.5)' }} />
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center relative z-10 animate-float"
          style={{ background: '#10B981', boxShadow: '0 16px 48px rgba(16, 185, 129,0.3)' }}
        >
          <CurrentIcon size={52} color="white" />
        </div>
        <div
          className="absolute -bottom-3 -right-3 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: '#ffffff', boxShadow: 'var(--shadow-md)', border: '1px solid var(--ns-outline-var)' }}
        >
          <div className="w-5 h-5 rounded-full animate-spin"
            style={{ border: '2.5px solid var(--ns-surface-high)', borderTopColor: 'var(--ns-primary)' }} />
        </div>
      </div>

      {/* Title + elapsed timer */}
      <div className="text-center space-y-1.5">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-headline)', color: 'var(--ns-on-surface)', letterSpacing: '-0.01em' }}
        >
          {t('analyzing')}
        </h2>
        <div className="flex items-center justify-center gap-1.5">
          <Leaf size={13} style={{ color: 'var(--ns-primary)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--ns-outline)' }}>{hint}</p>
        </div>
        {/* Elapsed time badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-1"
          style={{ background: 'var(--ns-surface-high)', border: '1px solid var(--ns-outline-var)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--ns-outline)' }}>
            {formatElapsed(elapsed)}
          </span>
        </div>
      </div>

      {/* Step list */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {steps.map((s, idx) => {
          const isActive = idx === step;
          const isDone = idx < step;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 transition-all duration-500"
              style={{
                opacity: isActive || isDone ? 1 : 0.35,
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
                transformOrigin: 'left',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: isDone ? 'rgba(16, 185, 129,0.12)' : isActive ? s.color + '18' : 'var(--ns-surface-con)',
                  border: `1.5px solid ${isDone ? 'rgba(16, 185, 129,0.3)' : isActive ? s.color + '55' : 'var(--ns-outline-var)'}`,
                }}
              >
                {isDone
                  ? <CheckCircle size={18} style={{ color: '#5BAD4E' }} />
                  : <s.icon size={18} style={{ color: isActive ? s.color : 'var(--ns-outline)' }} className={isActive ? 'animate-pulse' : ''} />}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span
                  className="text-sm font-semibold"
                  style={{ color: isActive ? 'var(--ns-on-surface)' : 'var(--ns-outline)', fontFamily: 'var(--font-main)' }}
                >
                  {s.text}
                </span>
                {isActive && (
                  <div className="h-1 w-full rounded-full mt-1 overflow-hidden" style={{ background: 'var(--ns-surface-high)' }}>
                    <div className="h-full rounded-full" style={{ background: s.color, animation: 'ns-loading 2.2s ease-in-out infinite' }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel button — appears after 10s */}
      {showCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all animate-fade-in-up"
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
          <X size={15} />
          Cancel scan
        </button>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ns-loading {
          0%   { width: 0%;  margin-left: 0; }
          50%  { width: 70%; margin-left: 15%; }
          100% { width: 0%;  margin-left: 100%; }
        }
      ` }} />
    </div>
  );
}
