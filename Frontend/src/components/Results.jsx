import { useRef, useState } from 'react';
import { ArrowLeft, AlertTriangle, Check, CheckCircle, Info, Pencil, XCircle, Share2, Leaf, TrendingUp } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getNutritionChips } from '../utils/nutrition';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';

function HealthRingLarge({ score }) {
  const { t } = useTranslation();
  const radius = 68;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score / 10, 0), 1);
  const dash = circ * pct;
  const color = score >= 8 ? '#5BAD4E' : score >= 6 ? '#5BAD4E' : score >= 4 ? '#F59E0B' : '#EF4444';

  return (
    <div className="health-score-ring result-score-ring" aria-label={`Average score ${score} out of 10`}>
      <svg width="168" height="168" viewBox="0 0 168 168">
        <circle cx="84" cy="84" r={radius} fill="none" stroke="var(--ns-surface-high)" strokeWidth="14" />
        <circle
          cx="84"
          cy="84"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 8px ${color}55)` }}
        />
      </svg>
      <div className="result-score-copy">
        <span>{score}</span>
        <em>/10</em>
        <strong style={{ color }}>{t('health_score')}</strong>
      </div>
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

  const getVerdict = (score) => {
    if (score >= 8) return { status: t('safe_to_consume'), sub: t('safe_to_consume_sub'), icon: CheckCircle, color: '#5BAD4E', bg: 'rgba(91, 173, 78,0.08)', border: 'rgba(91, 173, 78,0.25)' };
    if (score >= 6) return { status: t('mostly_safe'), sub: t('mostly_safe_sub'), icon: CheckCircle, color: '#5BAD4E', bg: 'rgba(91, 173, 78,0.08)', border: 'rgba(91, 173, 78,0.25)' };
    if (score >= 4) return { status: t('use_caution'), sub: t('use_caution_sub'), icon: AlertTriangle, color: '#b45309', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' };
    if (score >= 2) return { status: t('high_risk'), sub: t('high_risk_sub'), icon: AlertTriangle, color: '#B45309', bg: 'rgba(245, 158, 11,0.08)', border: 'rgba(245, 158, 11,0.3)' };
    return { status: t('avoid'), sub: t('avoid_sub'), icon: XCircle, color: '#EF4444', bg: 'rgba(186,26,26,0.06)', border: 'rgba(186,26,26,0.25)' };
  };

  const verdict = getVerdict(result.score);

  const handleShare = async () => {
    if (!summaryRef.current) return;
    setIsCapturing(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const dataUrl = await toPng(summaryRef.current, { backgroundColor: '#ffffff', pixelRatio: 3 });
      const filename = `nutriscore_${result.productName.toLowerCase().replace(/[\s\W]+/g, '_')}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'NutriScore Health Audit', text: `Results for ${result.productName}` });
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
                      <Pencil size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="result-macros-grid" aria-label="Nutrition facts per serving">
              {nutritionChips.map((nutrient) => (
                <div className="result-macro-item" key={nutrient.key}>
                  <span><span aria-hidden="true">{nutrient.icon}</span>{nutrient.label}</span>
                  <strong>{nutrient.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="result-ai-label">
            <Leaf size={13} />
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
              <CheckCircle size={24} style={{ color: 'var(--ns-primary)' }} />
              <p>{t('no_side_effects')}</p>
            </div>
          ) : Array.isArray(verdictItems) ? verdictItems.map((point, idx) => {
            const isEffects = activeTab === 'effects';
            const isGood = !isEffects && point.toLowerCase().startsWith('good:');
            const isBad = !isEffects && point.toLowerCase().startsWith('bad:');
            const label = isGood ? point.replace(/^good:\s*/i, '') : isBad ? point.replace(/^bad:\s*/i, '') : point;
            const dotColor = isEffects ? '#EF4444' : isGood ? '#5BAD4E' : isBad ? '#EF4444' : 'var(--ns-outline)';
            const bg = isEffects ? 'rgba(186,26,26,0.06)' : isGood ? 'rgba(91, 173, 78,0.07)' : isBad ? 'rgba(186,26,26,0.06)' : 'var(--ns-surface-low)';

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
                  const accent = isHarmful ? '#EF4444' : isBeneficial ? '#5BAD4E' : '#6c7a71';
                  const bg = isHarmful ? 'rgba(186,26,26,0.06)' : isBeneficial ? 'rgba(91, 173, 78,0.06)' : 'rgba(108,122,113,0.06)';
                  const Icon = isHarmful ? AlertTriangle : isBeneficial ? CheckCircle : Info;

                  return (
                    <div key={idx} className="result-audit-card ns-card">
                      <div className="result-accent-bar" style={{ background: accent }} />
                      <div className="result-audit-body">
                        <div className="result-audit-title-row">
                          <span>{item.name}</span>
                          <div className="result-status-badge" style={{ background: bg, border: `1px solid ${accent}33` }}>
                            <Icon size={13} style={{ color: accent }} strokeWidth={2.5} />
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
