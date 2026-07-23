import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Leaf, ArrowLeft } from 'lucide-react';
import { MedicalProfilePage, HealthGoalsPage } from './Profile';
import { API } from '../api/client.js';

/* â”€â”€â”€ Stepper â”€â”€â”€ */
function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step <= current;
        return (
          <React.Fragment key={step}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: done ? '#10B981' : '#e8e8e8',
              color: done ? '#fff' : '#bbb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
              transition: 'all 0.3s',
            }}>{step}</div>
            {step < total && (
              <div style={{
                flex: 1, height: 2, minWidth: 20,
                background: step < current ? '#10B981' : '#e0e0e0',
                borderStyle: step < current ? 'solid' : 'dashed',
                borderWidth: 0, transition: 'all 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* â”€â”€â”€ Age Picker (scroll wheel) â”€â”€â”€ */
function AgePicker({ value, onChange }) {
  const containerRef = useRef(null);
  const ITEM_H = 64;
  const ages = Array.from({ length: 80 }, (_, i) => i + 10); // 10-89
  const idx = ages.indexOf(value);
  const [scrolling, setScrolling] = useState(false);
  const scrollTimer = useRef(null);

  useEffect(() => {
    if (containerRef.current && !scrolling) {
      const target = idx * ITEM_H;
      containerRef.current.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [value]);

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
    <div style={{ position: 'relative', height: ITEM_H * 5, overflow: 'hidden', width: '100%', maxWidth: 220, margin: '0 auto' }}>
      {/* Selection highlight */}
      <div style={{
        position: 'absolute', top: ITEM_H * 2, left: '50%', transform: 'translateX(-50%)',
        width: 80, height: ITEM_H, borderRadius: 16, background: '#10B981',
        zIndex: 0, transition: 'all 0.2s',
      }} />
      {/* Scrollable list */}
      <div ref={containerRef} onScroll={handleScroll}
        style={{ height: '100%', overflowY: 'auto', scrollSnapType: 'y mandatory', paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2, scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', position: 'relative', zIndex: 1 }}>
        <style>{`.nf-age-scroll::-webkit-scrollbar { display: none; }`}</style>
        <div className="nf-age-scroll" style={{ display: 'contents' }}>
          {ages.map((age, i) => {
            const isSelected = age === value;
            const dist = Math.abs(ages.indexOf(value) - i);
            return (
              <div key={age} onClick={() => onChange(age)}
                style={{
                  height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  scrollSnapAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  fontSize: isSelected ? '2.2rem' : dist === 1 ? '1.5rem' : '1.2rem',
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? '#fff' : dist <= 1 ? '#999' : '#ccc',
                  opacity: isSelected ? 1 : dist <= 1 ? 0.8 : 0.4,
                }}>
                {age}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Weight Picker (ruler slider) â”€â”€â”€ */
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
    <div style={{ textAlign: 'center', width: '100%' }}>
      {/* Unit toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 28, borderRadius: 50, overflow: 'hidden', border: '2px solid #e0e0e0', width: 'fit-content', margin: '0 auto 28px' }}>
        {['kg', 'lbs'].map(u => (
          <button key={u} onClick={() => onUnitChange(u)}
            style={{
              padding: '10px 32px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
              background: unit === u ? '#10B981' : 'transparent',
              color: unit === u ? '#fff' : '#10B981', transition: 'all 0.2s',
            }}>
            {u === 'kg' ? 'Kg' : 'Lbs'}
          </button>
        ))}
      </div>
      {/* Display */}
      <div style={{ fontSize: '3rem', fontWeight: 800, color: '#1a1a1a', marginBottom: 24 }}>
        {displayValue} <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#888' }}>{displayUnit}</span>
      </div>
      {/* Ruler */}
      <div style={{ position: 'relative', width: '100%', height: 70, overflow: 'hidden' }}>
        {/* Center indicator */}
        <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 3, height: 45, background: '#10B981', borderRadius: 2, zIndex: 2 }} />
        <div ref={rulerRef} onScroll={handleScroll}
          onTouchStart={() => setDragging(true)} onTouchEnd={() => setDragging(false)}
          onMouseDown={() => setDragging(true)} onMouseUp={() => setDragging(false)}
          style={{ overflowX: 'auto', height: '100%', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', whiteSpace: 'nowrap', paddingTop: 4 }}>
          <div style={{ display: 'inline-flex', alignItems: 'flex-end', paddingLeft: '50%', paddingRight: '50%', height: 50 }}>
            {Array.from({ length: ticks + 1 }, (_, i) => {
              const v = MIN + i;
              const isMajor = v % 5 === 0;
              return (
                <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: TICK_W }}>
                  <div style={{
                    width: isMajor ? 2 : 1, height: isMajor ? 36 : 20,
                    background: isMajor ? '#666' : '#ccc', borderRadius: 1,
                  }} />
                  {isMajor && <span style={{ fontSize: '0.6rem', color: '#999', marginTop: 3, fontWeight: 600 }}>{v}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Gender Picker â”€â”€â”€ */
function HeightPicker({ value, onChange }) {
  const heightValue = Number(value) || 170;

  return (
    <div style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
      <div style={{
        width: 132,
        height: 132,
        margin: '0 auto 26px',
        borderRadius: '50%',
        background: '#ECFDF5',
        border: '2px solid #4CAF50',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 14px 34px rgba(76, 175, 80, 0.14)',
      }}>
        <strong style={{ fontSize: '2.65rem', lineHeight: 1, color: '#1a1a1a', fontWeight: 800 }}>
          {heightValue}
        </strong>
        <span style={{ marginTop: 6, color: '#10B981', fontSize: '0.95rem', fontWeight: 700 }}>cm</span>
      </div>

      <input
        type="range"
        min="100"
        max="230"
        step="1"
        value={heightValue}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Select height in centimeters"
        style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: '#999', fontSize: '0.78rem', fontWeight: 700 }}>
        <span>100 cm</span>
        <span>230 cm</span>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, padding: '14px 16px', borderRadius: 16, border: '2px solid #e8e8e8', background: '#fff' }}>
        <span style={{ color: '#888', fontSize: '0.9rem', fontWeight: 700 }}>Manual</span>
        <input
          type="number"
          min="100"
          max="230"
          value={heightValue}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, textAlign: 'right', fontSize: '1rem', fontWeight: 800, color: '#1a1a1a', background: 'transparent' }}
        />
        <span style={{ color: '#10B981', fontSize: '0.9rem', fontWeight: 800 }}>cm</span>
      </label>
    </div>
  );
}

function GenderPicker({ value, onChange }) {
  const genders = [
    { key: 'Female', emoji: 'ðŸ‘©', label: 'Female' },
    { key: 'Male', emoji: 'ðŸ‘¨', label: 'Male' },
    { key: 'Other', emoji: 'ðŸ§‘', label: 'Other' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 340 }}>
      {genders.map(g => {
        const sel = value === g.key;
        return (
          <button key={g.key} onClick={() => onChange(g.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 20px', borderRadius: 16,
              border: sel ? '2px solid #4CAF50' : '2px solid #e8e8e8',
              background: sel ? '#ECFDF5' : '#fff',
              cursor: 'pointer', transition: 'all 0.2s', width: '100%',
            }}>
            <span style={{ fontSize: '1.6rem', width: 44, height: 44, borderRadius: 12, background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{g.emoji}</span>
            <span style={{ flex: 1, fontSize: '1.05rem', fontWeight: 600, color: '#1a1a1a', textAlign: 'left' }}>{g.label}</span>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: sel ? '7px solid #4CAF50' : '2px solid #ccc',
              background: '#fff', transition: 'all 0.2s', flexShrink: 0,
            }} />
          </button>
        );
      })}
    </div>
  );
}

/* â”€â”€â”€ Main Onboarding Component â”€â”€â”€ */
function DateOfBirthPicker({ value, onChange }) {
  return (
    <div style={{ width: '100%', maxWidth: 340 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px', borderRadius: 18, border: '2px solid #e8e8e8', background: '#fff', boxShadow: '0 10px 26px rgba(0,0,0,0.04)' }}>
        <span style={{ color: '#888', fontSize: '0.85rem', fontWeight: 700 }}>Date of Birth</span>
        <input
          type="date"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          max={new Date().toISOString().split('T')[0]}
          style={{ width: '100%', border: 0, outline: 0, background: 'transparent', color: '#1a1a1a', fontSize: '1.05rem', fontWeight: 800, fontFamily: 'inherit' }}
        />
      </label>
      <p style={{ margin: '14px 6px 0', color: '#999', fontSize: '0.82rem', lineHeight: 1.45, fontWeight: 600, textAlign: 'center' }}>
        This helps NutriScore personalize nutrition feedback more accurately.
      </p>
    </div>
  );
}

export default function Onboarding({ onComplete, initialProfile, authToken, onBack, pendingSignUp, onLogin }) {
  const TOTAL_STEPS = 7;
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(() => ({
    age: parseInt(initialProfile?.age) || 25,
    height: parseInt(initialProfile?.height) || 170,
    weight: parseInt(initialProfile?.weight) || 62,
    weightUnit: 'kg',
    dateOfBirth: initialProfile?.dateOfBirth || initialProfile?.dob || '',
    gender: initialProfile?.gender || 'Female',
    conditions: initialProfile?.conditions || [],
    goals: initialProfile?.goals || [],
  }));

  const updateProfile = (fields) => setProfile(prev => ({ ...prev, ...fields }));

  const handleNext = () => {
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
    setStep(7);
  };

  const handleGoalsSaved = async (updatedUser) => {
    const finalGoals = updatedUser?.profile?.goals || profile.goals;
    const finalProfile = { ...profile, goals: finalGoals };
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

        // Cookie is now set â€” save profile details using cookie auth
        const sanitizedProfile = {
          gender: finalProfile.gender,
          weight: Number(finalProfile.weight) || null,
          height: Number(finalProfile.height) || null,
          dateOfBirth: finalProfile.dateOfBirth || '',
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
        onLogin(detailsData.user, null); // token is null â€” it lives in the cookie
      } catch (err) {
        console.error('Registration failed:', err);
        setError(err.message || 'Registration failed');
      }
    } else {
      onComplete(finalProfile);
    }
  };

  return (
    <div className="nf-onboarding">
      <style>{`
        .nf-onboarding {
          min-height: 100vh; background: #ffffff !important; font-family: var(--font-main, 'Inter', sans-serif);
          display: flex; flex-direction: column;
        }
        .nf-ob-content {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          padding: 50px 28px 24px; box-sizing: border-box;
        }
        .nf-ob-brand { display: flex; align-items: center; gap: 4px; align-self: flex-start; margin-bottom: 16px; }
        .nf-ob-brand-nutri { font-family: 'Georgia', serif; font-style: italic; color: #bbb; font-size: 1.25rem; }
        .nf-ob-brand-scan { font-family: 'Georgia', serif; font-weight: 700; color: #10B981; font-size: 1.25rem; }
        .nf-ob-brand-leaf { color: #10B981; margin-left: -2px; }
        .nf-ob-question { font-size: 1.6rem; font-weight: 700; color: #1a1a1a; text-align: center; margin: 24px 0 32px; letter-spacing: -0.01em; }
        .nf-ob-footer { padding: 20px 28px 36px; }
        .nf-ob-next-btn {
          width: 100%; padding: 16px; border-radius: 50px; border: none;
          background: #4CAF50; color: #fff; font-size: 1.05rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; letter-spacing: 0.01em;
          box-shadow: 0 4px 16px rgba(76, 175, 80, 0.25);
        }
        .nf-ob-next-btn:hover { background: #43A047; transform: translateY(-1px); }
        .nf-ob-next-btn:active { transform: translateY(0); }
        .nf-ob-skip-btn {
          display: block; margin: 16px auto 0; background: none; border: none;
          color: #888; font-size: 0.95rem; font-weight: 600; cursor: pointer;
        }
        .nf-ob-skip-btn:hover { color: #555; }
        /* Override styles for medical/goals pages embedded in onboarding */
        .medical-profile-page, .health-goals-page { background: #fff !important; color: #1a1a1a !important; }
        .medical-profile-shell, .health-goals-shell { border: none !important; background: transparent !important; box-shadow: none !important; padding-top: 20px !important; }
        .medical-profile-header h1, .health-goals-header h1 { color: #1a1a1a !important; font-weight: 700 !important; }
        .medical-save-button, .health-goals-save-button {
          height: 56px !important; border-radius: 50px !important;
          background: #4CAF50 !important; box-shadow: 0 4px 16px rgba(76,175,80,0.25) !important;
          font-size: 1rem !important; font-weight: 600 !important; color: white !important;
        }
        .medical-issue-item.is-selected, .health-goals-list button.is-selected {
          border-color: #4CAF50 !important; background: #F0FFF0 !important; color: #4CAF50 !important;
        }
        .medical-selected-strip button, .health-goals-selected-strip button {
          background: #F0FFF0 !important; color: #4CAF50 !important; border: 1px solid #4CAF50 !important;
        }
      `}</style>

      {step <= 5 && (
        <>
          <div className="nf-ob-content">
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <button type="button" onClick={handleStepBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a1a', display: 'flex', alignItems: 'center', padding: 0 }} aria-label="Back">
                <ArrowLeft size={24} />
              </button>
              {/* Brand */}
              <div className="nf-ob-brand" style={{ marginBottom: 0 }}>
                <span className="nf-ob-brand-nutri">Nutri</span>
                <span className="nf-ob-brand-scan">Score</span>
                <Leaf size={14} className="nf-ob-brand-leaf" />
              </div>
              <div style={{ width: 24 }} /> {/* Spacer to center the brand */}
            </div>
            {/* Stepper */}
            <StepIndicator current={step} total={TOTAL_STEPS} />

            {/* Step 1: Age */}
            {step === 1 && (
              <>
                <h2 className="nf-ob-question">What's your Age?</h2>
                <AgePicker value={profile.age} onChange={(v) => updateProfile({ age: v })} />
              </>
            )}

            {/* Step 2: Height */}
            {step === 2 && (
              <>
                <h2 className="nf-ob-question">What's your height?</h2>
                <HeightPicker value={profile.height} onChange={(v) => updateProfile({ height: v })} />
              </>
            )}

            {/* Step 3: Weight */}
            {step === 3 && (
              <>
                <h2 className="nf-ob-question">What's your current weight right now?</h2>
                <WeightPicker value={profile.weight} onChange={(v) => updateProfile({ weight: v })}
                  unit={profile.weightUnit} onUnitChange={(u) => updateProfile({ weightUnit: u })} />
              </>
            )}

            {/* Step 4: Gender */}
            {step === 4 && (
              <>
                <h2 className="nf-ob-question">What's your gender?</h2>
                <GenderPicker value={profile.gender} onChange={(v) => updateProfile({ gender: v })} />
              </>
            )}

            {/* Step 5: Date of Birth */}
            {step === 5 && (
              <>
                <h2 className="nf-ob-question">What's your date of birth?</h2>
                <DateOfBirthPicker value={profile.dateOfBirth} onChange={(v) => updateProfile({ dateOfBirth: v })} />
              </>
            )}
          </div>

          <div className="nf-ob-footer">
            <button className="nf-ob-next-btn" onClick={handleNext}>Next</button>
          </div>
        </>
      )}

      {step === 6 && (
        <MedicalProfilePage
          userProfile={profile}
          authToken={authToken}
          isOnboarding={true}
          onBack={handleStepBack}
          onDetailsSaved={handleMedicalSaved}
        />
      )}

      {step === 7 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%' }}>
          <HealthGoalsPage
            userProfile={profile}
            authToken={authToken}
            isOnboarding={true}
            onBack={handleStepBack}
            onDetailsSaved={handleGoalsSaved}
          />
          {error && <p style={{ color: 'red', textAlign: 'center', margin: '16px' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
