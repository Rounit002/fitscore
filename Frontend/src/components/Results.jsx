import { useRef, useState } from 'react';
import { ArrowLeft, AlertTriangle, Check, CheckCircle, Info, Pencil, XCircle, Share2, Leaf, TrendingUp } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getNutritionChips } from '../utils/nutrition';
import { macroMeta } from '../utils/macroMeta.js';
import ProgressRing from './ProgressRing.jsx';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';
import { scoreColor, scoreVerdict } from '../utils/scoreColor.js';

/* Uses the shared ProgressRing rather than a third hand-rolled arc. This copy
   had drifted from the dashboard's: a 1.4s transition against 700ms, an 8.3%
   stroke against 8%, and a hardcoded `55` alpha suffix instead of a colour-mix,
   so the same "value out of a ceiling" idea animated and weighed differently
   depending on which screen you were on (DESIGN_TOKENS.md 8). */
function HealthRingLarge({ score }) {
  const { t } = useTranslation();
  // The local table gave >= 8 and >= 6 the same colour, collapsing two bands
  // into one, and skipped the >= 2 band entirely (DESIGN_TOKENS.md 14).
  const color = scoreColor(score);

  return (
    <div className="health-score-ring result-score-ring" aria-label={`Average score ${score} out of 10`}>
      {/* Clamped rather than fixed at 168px with a breakpoint override, so the
          ring and its centred copy shrink together on a 360px phone. */}
      <ProgressRing
        value={score}
        max={10}
        size="clamp(152px, 44vw, 168px)"
        stroke={8}
        color={color}
        trackColor="var(--ns-surface-high)"
        glow
      >
        <div className="result-score-copy">
          <span className="num-tabular">{score}</span>
          <em>/10</em>
          <strong style={{ color }}>{t('health_score')}</strong>
        </div>
      </ProgressRing>
    </div>
  );
}

export default function Results({ result, onBack, authToken, onServingsChanged }) {
  const summaryRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeTab, setActiveTab] = useState('truth');
  const [servings, setServings] = useState(() => result?.servings || 1);
  const [servingsDraft, setServingsDraft] = useState(() => String(result?.servings || 1));
  const [isEditingServings, setIsEditingServings] = useState(false);
  const [toast, setToast] = useState(null);
  const { t } = useTranslation();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (!result) return null;

  // Verdict text, icon and colour all come from the shared helper, so the ring
  // above and the banner below cannot disagree about which band a score is in.
  const verdict = scoreVerdict(result.score, t, { CheckCircle, AlertTriangle, XCircle });

  const handleShare = async () => {
    if (!summaryRef.current) return;
    setIsCapturing(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const dataUrl = await toPng(summaryRef.current, { backgroundColor: '#ffffff', pixelRatio: 3 });
      const filename = `bitezsnap_${result.productName.toLowerCase().replace(/[\s\W]+/g, '_')}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'bitezsnap Health Audit', text: `Results for ${result.productName}` });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(t('result_downloaded'), 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(t('sharing_failed'), 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const parseVerdict = (items) => {
    if (typeof items === 'string') {
      const t = items.trim();
      if (t.startsWith('[') || t.startsWith('{')) {
        try {
          return JSON.parse(t.replace(/^\{/, '[').replace(/\}$/, ']'));
        } catch {
          return t
            .replace(/^\{/, '')
            .replace(/^\[/, '')
            .replace(/\}$/, '')
            .replace(/\]$/, '')
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map(s => s.trim().replace(/^"/, '').replace(/"$/, ''));
        }
      }
    }
    return items;
  };

  const verdictItems = parseVerdict(activeTab === 'truth' ? result.verdict : (result.sideEffects || []));
  const nutritionChips = getNutritionChips(result, servings);

  const startEditingServings = () => {
    setServingsDraft(String(servings));
    setIsEditingServings(true);
  };

  const saveServings = async () => {
    const parsed = Number(servingsDraft);
    if (Number.isFinite(parsed) && parsed > 0) {
      const newServings = Math.round(parsed * 100) / 100;
      setServings(newServings);
      setServingsDraft(String(newServings));
      setIsEditingServings(false);

      // Persist to backend if we have a scan ID
      if (result.scanId) {
        try {
          const response = await fetch(
            `${API}/scans/${result.scanId}/servings`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ servings: newServings }),
            }
          );
          if (!response.ok) throw new Error('Failed to save servings');
          onServingsChanged?.(result.scanId, newServings);
        } catch (err) {
          console.error('Failed to persist servings:', err);
        }
      } else {
        onServingsChanged?.(result.scanId, newServings);
      }
    }
  };

  return (
    <div className="result-page animate-fade-in-up">
      {toast && (
        <div className="scan-toast" style={{ background: toast.type === 'error' ? 'var(--ns-error)' : 'var(--ns-success)' }}>
          <span>{toast.message}</span>
        </div>
      )}
      <header className="result-header">
        <button onClick={onBack} className="result-back-button" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h1>{t('nutrition_analysis')}</h1>
        <div className="result-header-spacer" />
      </header>

      <main className="result-content">
        <div 
          ref={summaryRef} 
          id="summary-card" 
          className={`result-summary-card ns-card ${result.image_url ? 'has-bg-image' : ''}`}
          style={result.image_url ? { '--bg-img': `url(${result.image_url})` } : undefined}
        >

          <div className="result-product-copy">
            <p>{result.brand || t('unknown_brand')}</p>
            <h2>{result.productName}</h2>
          </div>

          <HealthRingLarge score={result.score} />

          <div className="result-verdict-banner" style={{ background: verdict.bg, border: `1.5px solid ${verdict.border}` }}>
            <div>
              <verdict.icon size={20} style={{ color: verdict.color }} strokeWidth={2.5} />
              <span style={{ color: verdict.color }}>{verdict.status}</span>
            </div>
            <p>{verdict.sub}</p>
          </div>

          <div className="result-nutrition-editor">
            <div className="servings-control">
              <label htmlFor="servings-input">{t('servings')}</label>
              <div className="servings-edit-box">
                {isEditingServings ? (
                  <>
                    <input
                      id="servings-input"
                      type="text"
                      inputMode="decimal"
                      value={servingsDraft}
                      onChange={(e) => setServingsDraft(e.target.value.replace(/[^\d.]/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveServings();
                      }}
                      autoFocus
                      aria-label="Enter servings"
                    />
                    <button type="button" onClick={saveServings} aria-label="Save servings">
                      <Check size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <strong>{servings}</strong>
                    <button type="button" onClick={startEditingServings} aria-label="Edit servings">
                      <Pencil size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="result-macros-grid" aria-label="Nutrition facts per serving">
              {nutritionChips.map((nutrient) => {
                /* One accent + one glyph per nutrient category, from the shared
                   macro map. These were emoji, which do not respond to colour
                   mode, do not share a stroke weight with any other icon in the
                   app, and render differently on every platform. */
                const meta = macroMeta(nutrient.key);
                const Icon = meta.icon;
                return (
                  <div className="result-macro-item" key={nutrient.key} data-macro={meta.key}>
                    <span>
                      {Icon && (
                        <Icon size={14} strokeWidth={2} aria-hidden="true" style={{ color: meta.accent }} />
                      )}
                      {nutrient.label}
                    </span>
                    <strong className="num-tabular">{nutrient.value}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="result-ai-label">
            <Leaf size={14} />
            <span>{t('scanned_with_ai')}</span>
          </div>
        </div>

        <button onClick={handleShare} disabled={isCapturing} className="result-primary-button btn-primary" style={{ opacity: isCapturing ? 0.6 : 1 }}>
          {isCapturing ? (
            <><span className="result-button-spinner" /> {t('generating')}</>
          ) : (
            <><Share2 size={18} /> {t('share_result')}</>
          )}
        </button>

        <div className="result-tabs">
          <button
            onClick={() => setActiveTab('truth')}
            className={activeTab === 'truth' ? 'is-active' : ''}
            style={{ color: activeTab === 'truth' ? 'var(--ns-primary)' : 'var(--ns-outline)' }}
          >
            {t('full_truth')}
          </button>
          <button
            onClick={() => setActiveTab('effects')}
            className={activeTab === 'effects' ? 'is-active is-danger' : ''}
            style={{ color: activeTab === 'effects' ? 'var(--ns-error)' : 'var(--ns-outline)' }}
          >
            {t('side_effects')}
          </button>
        </div>

        <div className="result-facts-card ns-card">
          {activeTab === 'effects' && (!verdictItems || verdictItems.length === 0) ? (
            <div className="result-empty-facts">
              <CheckCircle size={32} style={{ color: 'var(--ns-primary)' }} />
              <p>{t('no_side_effects')}</p>
            </div>
          ) : Array.isArray(verdictItems) ? verdictItems.map((point, idx) => {
            const isEffects = activeTab === 'effects';
            const isGood = !isEffects && point.toLowerCase().startsWith('good:');
            const isBad = !isEffects && point.toLowerCase().startsWith('bad:');
            const label = isGood ? point.replace(/^good:\s*/i, '') : isBad ? point.replace(/^bad:\s*/i, '') : point;
            // Good/bad is the same judgement the score bands express, so it
            // reads from the semantic map instead of its own hexes, and the
            // fill is derived from that colour so the two cannot drift.
            const dotColor = isEffects || isBad
              ? 'var(--sem-impact-harmful)'
              : isGood
                ? 'var(--sem-impact-beneficial)'
                : 'var(--ns-outline)';
            const bg = isEffects || isGood || isBad
              ? `color-mix(in srgb, ${dotColor} 7%, transparent)`
              : 'var(--ns-surface-low)';

            return (
              <div key={idx} className="result-fact-item" style={{ background: bg }}>
                {isEffects ? <AlertTriangle size={16} style={{ color: dotColor }} />
                  : isGood ? <CheckCircle size={16} style={{ color: dotColor }} />
                    : isBad ? <XCircle size={16} style={{ color: dotColor }} />
                      : <div className="result-dot" style={{ background: dotColor }} />}
                <span>{label}</span>
              </div>
            );
          }) : (
            <div className="result-fact-item">
              <div className="result-dot" style={{ background: 'var(--ns-outline)' }} />
              <p>{result.verdict || ''}</p>
            </div>
          )}
        </div>

        {result.alternatives && result.alternatives.length > 0 && (
          <section className="result-section">
            <div className="result-section-heading is-alternative">
              <TrendingUp size={16} />
              <h3>{t('healthier_alternatives')}</h3>
            </div>
            <div className="result-section-list">
              {result.alternatives.map((alt, idx) => (
                <div key={idx} className="result-audit-card ns-card">
                  <div className="result-accent-bar is-alternative" />
                  <div className="result-audit-body">
                    <p className="result-alt-name">{alt.name}</p>
                    <p>{alt.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {result.ingredientsAnalysis && result.ingredientsAnalysis.length > 0 && (
          <section className="result-section">
            <div className="result-section-heading">
              <Info size={16} />
              <h3>{t('ingredient_audit')}</h3>
            </div>
            <div className="result-section-list">
              {result.ingredientsAnalysis
                .sort((a, b) => ({ beneficial: 0, harmful: 1, neutral: 2 }[a.impact?.toLowerCase() ?? ''] ?? 3) - ({ beneficial: 0, harmful: 1, neutral: 2 }[b.impact?.toLowerCase() ?? ''] ?? 3))
                .map((item, idx) => {
                  const isHarmful = item.impact?.toLowerCase() === 'harmful';
                  const isBeneficial = item.impact?.toLowerCase() === 'beneficial';
                  const accent = isHarmful
                    ? 'var(--sem-impact-harmful)'
                    : isBeneficial
                      ? 'var(--sem-impact-beneficial)'
                      : 'var(--sem-impact-neutral)';
                  const bg = `color-mix(in srgb, ${accent} 6%, transparent)`;
                  const Icon = isHarmful ? AlertTriangle : isBeneficial ? CheckCircle : Info;

                  return (
                    <div key={idx} className="result-audit-card ns-card">
                      <div className="result-accent-bar" style={{ background: accent }} />
                      <div className="result-audit-body">
                        <div className="result-audit-title-row">
                          <span>{item.name}</span>
                          <div className="result-status-badge" style={{ background: bg, border: `1px solid ${accent}33` }}>
                            <Icon size={14} style={{ color: accent }} strokeWidth={2.5} />
                            <span style={{ color: accent }}>{item.impact}</span>
                          </div>
                        </div>
                        <p>{item.reason}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        <button onClick={onBack} className="result-primary-button result-bottom-button btn-primary">
          {t('scan_another')}
        </button>
      </main>
    </div>
  );
}
