import { useState, useRef, useEffect, useCallback } from 'react';
import { Leaf, ArrowLeft, Venus, Mars, Transgender, Check } from 'lucide-react';
import { MedicalProfilePage, HealthGoalsPage } from './Profile';
import { API, setAuthToken } from '../api/client.js';

const TOTAL_STEPS = 6;

// 13+ policy, mirrored from the backend (Backend/utils/ageCheck.js) so the
// client cannot offer an under-age value and the server rejects any that slip
// through. The wheel starts at MINIMUM_AGE, so there is no under-13 value to
// pick in the first place.
const MINIMUM_AGE = 13;
const MAXIMUM_AGE = 100;

function clampAge(age) {
  if (!Number.isFinite(age)) return MINIMUM_AGE;
  return Math.max(MINIMUM_AGE, Math.min(MAXIMUM_AGE, age));
}

/* ─── Stepper ───
   Was seven numbered circles. At seven steps that is seven competing figures for
   one piece of information, and the number of a step is not something the user
   needs to act on — the progress is. Now a segmented bar plus one text readout,
   which also gives assistive tech a single sentence instead of seven digits. */
function StepIndicator({ current, total }) {
  return (
    <>
      <div
        className="ob-steps"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Step ${current} of ${total}`}
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`ob-step${i < current ? ' is-done' : ''}`} />
        ))}
      </div>
      <div className="ob-step-label">Step {current} of {total}</div>
    </>
  );
}

/* ─── Age Picker (scroll wheel) ─── */
function AgePicker({ value, onChange }) {
  const containerRef = useRef(null);
  const ITEM_H = 52;
  // 13-100. The list itself is the age gate: the lowest selectable value is the
  // minimum age, so an under-age answer is not reachable.
  const ages = Array.from({ length: MAXIMUM_AGE - MINIMUM_AGE + 1 }, (_, i) => i + MINIMUM_AGE);
  const idx = ages.indexOf(value);
  const [scrolling, setScrolling] = useState(false);
  const scrollTimer = useRef(null);

  useEffect(() => {
    if (containerRef.current && !scrolling) {
      const target = idx * ITEM_H;
      containerRef.current.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [value]);

  useEffect(() => () => clearTimeout(scrollTimer.current), []);

  const handleScroll = useCallback(() => {
    setScrolling(true);
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const newIdx = Math.round(scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(ages.length - 1, newIdx));
      containerRef.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
      onChange(ages[clamped]);
      setScrolling(false);
    }, 80);
  }, [ages, onChange]);

  return (
    <div className="ob-wheel">
      {/* Selected value reads as the bold-outline state, not a solid emerald
          block. The old fill forced the number to white, so the value changed
          colour as it scrolled through the highlight. */}
      <div className="ob-wheel-marker" aria-hidden="true" />
      <div className="ob-wheel-scroll" ref={containerRef} onScroll={handleScroll}>
        {ages.map((age) => {
          const dist = Math.abs(idx - ages.indexOf(age));
          const state = age === value ? ' is-selected' : dist === 1 ? ' is-near' : '';
          return (
            <button
              type="button"
              key={age}
              className={`ob-wheel-item${state}`}
              onClick={() => onChange(age)}
              aria-pressed={age === value}
            >
              {age}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Weight Picker (ruler slider) ─── */
function WeightPicker({ value, onChange, unit, onUnitChange }) {
  const rulerRef = useRef(null);
  const TICK_W = 8;
  const MIN = 1, MAX = 200;
  const ticks = MAX - MIN;
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (rulerRef.current && !dragging) {
      const target = (value - MIN) * TICK_W - rulerRef.current.clientWidth / 2;
      rulerRef.current.scrollTo({ left: target, behavior: 'smooth' });
    }
  }, [value, unit]);

  const handleScroll = useCallback(() => {
    if (!rulerRef.current) return;
    const scrollLeft = rulerRef.current.scrollLeft;
    const center = scrollLeft + rulerRef.current.clientWidth / 2;
    const newVal = Math.round(center / TICK_W) + MIN;
    const clamped = Math.max(MIN, Math.min(MAX, newVal));
    onChange(clamped);
  }, [onChange]);

  const displayValue = unit === 'lbs' ? Math.round(value * 2.205) : value;
  const displayUnit = unit === 'lbs' ? 'Lbs' : 'Kg';

  return (
    <div className="ob-body">
      <div className="ob-unit-toggle" role="group" aria-label="Weight unit">
        {['kg', 'lbs'].map((u) => (
          <button
            type="button"
            key={u}
            className={unit === u ? 'is-selected' : ''}
            onClick={() => onUnitChange(u)}
            aria-pressed={unit === u}
          >
            {u === 'kg' ? 'Kg' : 'Lbs'}
          </button>
        ))}
      </div>

      <div className="ob-readout" aria-live="polite">
        {displayValue}
        <span>{displayUnit}</span>
      </div>

      <div className="ob-ruler">
        <div className="ob-ruler-needle" aria-hidden="true" />
        <div
          className="ob-ruler-scroll"
          ref={rulerRef}
          onScroll={handleScroll}
          onTouchStart={() => setDragging(true)}
          onTouchEnd={() => setDragging(false)}
          onMouseDown={() => setDragging(true)}
          onMouseUp={() => setDragging(false)}
        >
          <div className="ob-ruler-track">
            {Array.from({ length: ticks + 1 }, (_, i) => {
              const v = MIN + i;
              const isMajor = v % 5 === 0;
              return (
                <div key={v} className={`ob-tick${isMajor ? ' is-major' : ''}`}>
                  <div className="ob-tick-mark" />
                  {isMajor && <span className="ob-tick-value">{v}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* The ruler is drag-only, so it is unusable by keyboard. A number field
          gives the same value a reachable control. */}
      <label className="ob-manual">
        <span className="ob-manual-label">Manual</span>
        <input
          type="number"
          min={MIN}
          max={MAX}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isNaN(next)) onChange(Math.max(MIN, Math.min(MAX, next)));
          }}
          aria-label="Weight in kilograms"
        />
        <span className="ob-manual-unit">kg</span>
      </label>
    </div>
  );
}

/* ─── Height Picker ─── */
function HeightPicker({ value, onChange }) {
  const heightValue = Number(value) || 170;

  return (
    <div className="ob-body">
      <div className="ob-readout" aria-live="polite">
        {heightValue}
        <span>cm</span>
      </div>

      <input
        className="ob-slider"
        type="range"
        min="100"
        max="230"
        step="1"
        value={heightValue}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Select height in centimeters"
      />

      <div className="ob-scale-row">
        <span>100 cm</span>
        <span>230 cm</span>
      </div>

      <label className="ob-manual">
        <span className="ob-manual-label">Manual</span>
        <input
          type="number"
          min="100"
          max="230"
          value={heightValue}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="Height in centimeters"
        />
        <span className="ob-manual-unit">cm</span>
      </label>
    </div>
  );
}

/* ─── Gender Picker ───
   The three options were emoji, and the bytes had additionally been mis-decoded
   on disk, so they rendered as latin1 mojibake rather than the intended glyph.
   Emoji are not an icon system regardless: they ignore colour mode, share no
   stroke weight with lucide, and render differently per platform. Replaced with
   lucide glyphs. */
const GENDERS = [
  { key: 'Female', label: 'Female', icon: Venus },
  { key: 'Male', label: 'Male', icon: Mars },
  { key: 'Other', label: 'Other', icon: Transgender },
];

function GenderPicker({ value, onChange }) {
  return (
    <div className="ob-choices">
      {GENDERS.map(({ key, label, icon: Icon }) => {
        const selected = value === key;
        return (
          <button
            type="button"
            key={key}
            className={`ob-choice${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(key)}
            aria-pressed={selected}
          >
            <span className="ob-choice-figure">
              <Icon size={20} />
            </span>
            <span className="ob-choice-label">{label}</span>
            {/* Paired with the outline so the state survives greyscale. */}
            {selected && (
              <span className="ob-choice-check" aria-hidden="true">
                <Check size={14} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const QUESTIONS = {
  1: "What's your age?",
  2: "What's your height?",
  3: "What's your current weight right now?",
  4: "What's your gender?",
};

export default function Onboarding({ onComplete, initialProfile, authToken, onBack, pendingSignUp, onLogin }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(() => ({
    // Clamped into the 13-100 range so a stale/invalid stored value can never
    // seed an under-age answer.
    age: clampAge(parseInt(initialProfile?.age, 10) || 25),
    height: parseInt(initialProfile?.height) || 170,
    // The weight step starts at a neutral mid-scale position purely so the ruler
    // has somewhere to sit; it is not a real answer until the user moves it. The
    // old hardcoded 62 was silently saved as the user's actual weight when they
    // skipped the step. `weightTouched` tracks whether it reflects a real choice.
    weight: parseInt(initialProfile?.weight) || 70,
    weightTouched: initialProfile?.weight != null,
    weightUnit: 'kg',
    gender: initialProfile?.gender || 'Female',
    conditions: initialProfile?.conditions || [],
    goals: initialProfile?.goals || [],
  }));

  const updateProfile = (fields) => setProfile(prev => ({ ...prev, ...fields }));

  const handleNext = () => {
    // Per-step gating so a user cannot advance past a step that still holds a
    // placeholder rather than a real answer.
    if (step === 3 && !profile.weightTouched) {
      setError('Please set your weight to continue.');
      return;
    }
    // Defence in depth: the wheel cannot produce an under-13 value, but the
    // 13+ policy is enforced here too rather than relying on the widget alone.
    if (step === 1 && Number(profile.age) < MINIMUM_AGE) {
      setError(`You must be at least ${MINIMUM_AGE} years old to use FitScan.`);
      return;
    }

    setError('');
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleStepBack = () => {
    if (step > 1) setStep(step - 1);
    else onBack();
  };

  const handleMedicalSaved = (updatedUser) => {
    if (updatedUser?.profile) {
      updateProfile({ conditions: updatedUser.profile.conditions });
    }
    setStep(6);
  };

  const handleGoalsSaved = async (updatedUser) => {
    const finalGoals = updatedUser?.profile?.goals || profile.goals;
    // Strip UI-only bookkeeping fields (weightTouched, weightUnit) so they are
    // never persisted into the profile JSON.
    const { weightTouched, weightUnit, ...profileToSave } = profile;
    const finalProfile = { ...profileToSave, goals: finalGoals };
    updateProfile({ goals: finalGoals });

    if (pendingSignUp) {
      try {
        const url = pendingSignUp.type === 'google'
          ? `${API}/auth/google`
          : `${API}/auth/register`;
        const body = pendingSignUp.type === 'google' 
          ? { email: pendingSignUp.email, name: pendingSignUp.name, googleId: pendingSignUp.googleId }
          : { name: pendingSignUp.name, email: pendingSignUp.email, password: pendingSignUp.password };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // server sets the HttpOnly cookie on this response
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Mobile: persist the returned JWT *before* the authenticated
        // /auth/details call below, since the WebView won't hold the cookie.
        // No-op on web (data.token is undefined there).
        setAuthToken(data.token ?? null, data.refreshToken ?? null);

        // Cookie is now set — save profile details using cookie auth
        const sanitizedProfile = {
          gender: finalProfile.gender,
          weight: Number(finalProfile.weight) || null,
          height: Number(finalProfile.height) || null,
          age: Number(finalProfile.age) || null,
          conditions: finalProfile.conditions || [],
          goals: finalProfile.goals || [],
        };

        const detailsRes = await fetch(
          `${API}/auth/details`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ profile: sanitizedProfile })
          }
        );
        const detailsData = await detailsRes.json();
        if (!detailsRes.ok) {
          throw new Error(detailsData.error || detailsData.message || 'Failed to save profile details.');
        }
        // On web the token is null (it lives in the cookie); on mobile we pass
        // the JWT from the register/google response through to be stored.
        onLogin(detailsData.user, data.token ?? null, false, data.refreshToken ?? null);
      } catch (err) {
        console.error('Registration failed:', err);
        setError(err.message || 'Registration failed');
      }
    } else {
      onComplete(finalProfile);
    }
  };

  return (
    <div className="ob-page page-transition">
      {step <= 4 && (
        <>
          <div className="ob-content">
            <div className="ob-topbar">
              <button type="button" className="ob-back" onClick={handleStepBack} aria-label="Back">
                <ArrowLeft size={20} />
              </button>
              <div className="ob-brand">
                <span className="ob-brand-a">Nutri</span>
                <span className="ob-brand-b">Score</span>
                <Leaf size={14} className="ob-brand-leaf" />
              </div>
              {/* Balances the back button so the brand stays optically centred. */}
              <div className="ob-topbar-spacer" />
            </div>

            <StepIndicator current={step} total={TOTAL_STEPS} />

            <h2 className="ob-question">{QUESTIONS[step]}</h2>

            {step === 1 && (
              <AgePicker value={profile.age} onChange={(v) => updateProfile({ age: v })} />
            )}

            {step === 2 && (
              <HeightPicker value={profile.height} onChange={(v) => updateProfile({ height: v })} />
            )}

            {step === 3 && (
              <WeightPicker
                value={profile.weight}
                onChange={(v) => updateProfile({ weight: v, weightTouched: true })}
                unit={profile.weightUnit}
                onUnitChange={(u) => updateProfile({ weightUnit: u })}
              />
            )}

            {step === 4 && (
              <GenderPicker value={profile.gender} onChange={(v) => updateProfile({ gender: v })} />
            )}

          </div>

          <div className="ob-footer">
            {error && <p className="ob-error" role="alert">{error}</p>}
            <button type="button" className="ob-next edge-highlight" onClick={handleNext}>
              Next
            </button>
          </div>
        </>
      )}

      {/* Steps 5-6 host the Medical / Health Goals screens, which already carry
          their own polish. Onboarding only strips their standalone page chrome
          (see .ob-embed) instead of repainting them. */}
      {step === 5 && (
        <div className="ob-embed">
          <MedicalProfilePage
            userProfile={profile}
            authToken={authToken}
            isOnboarding={true}
            onBack={handleStepBack}
            onDetailsSaved={handleMedicalSaved}
          />
        </div>
      )}

      {step === 6 && (
        <div className="ob-embed">
          <HealthGoalsPage
            userProfile={profile}
            authToken={authToken}
            isOnboarding={true}
            onBack={handleStepBack}
            onDetailsSaved={handleGoalsSaved}
          />
          {error && <p className="ob-error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
