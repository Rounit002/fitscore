import { useState, useEffect } from 'react';
import { ArrowLeft, BarChart2, ChevronRight, Zap, CheckCircle, CheckCircle2, XCircle, ShieldCheck, Activity, Search, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';

export default function Compare({ authToken, onBack }) {
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedScans, setSelectedScans] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { t } = useTranslation();

  useEffect(() => {
    const controller = new AbortController();

    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `${API}/scans`,
          { credentials: 'include', signal: controller.signal }
        );
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        setScans(data);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        setError('Failed to load your scan history.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => controller.abort();
  }, []);

  const toggleSelection = (scan) => {
    setSelectedScans(prev => {
      const isSelected = prev.find(s => s.id === scan.id);
      if (isSelected) {
        return prev.filter(s => s.id !== scan.id);
      }
      return [...prev, scan];
    });
  };

  const isSelected = (scan) => !!selectedScans.find(s => s.id === scan.id);

  const parseVerdict = (verdictData) => {
    if (!verdictData) return [];
    let verdictItems = verdictData;

    if (typeof verdictItems === 'string') {
      const trimmed = verdictItems.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          verdictItems = JSON.parse(trimmed.replace(/^{/, '[').replace(/}$/, ']'));
        } catch {
          verdictItems = trimmed
            .replace(/^{/, '')
            .replace(/^\[/, '')
            .replace(/}$/, '')
            .replace(/\]$/, '')
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map(s => s.trim().replace(/^"/, '').replace(/"$/, ''));
        }
      } else {
        verdictItems = trimmed.split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 5);
      }
    }

    if (!Array.isArray(verdictItems)) return [];
    return verdictItems;
  };

  const parseJsonField = (value, fallback = null) => {
    if (!value) return fallback;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const getProductImage = (scan) => {
    const rawProductData = parseJsonField(scan.raw_product_data, null) || parseJsonField(scan.product_data, null) || {};
    return scan.image_url
      || rawProductData.image_front_small_url
      || rawProductData.image_front_url
      || rawProductData.image_small_url
      || rawProductData.image_url
      || null;
  };

  const filteredScans = scans.filter(scan => {
    const query = searchTerm.toLowerCase();
    return (
      (scan.product_name?.toLowerCase() || '').includes(query) ||
      (scan.brand?.toLowerCase() || '').includes(query)
    );
  });

  const totalPages = Math.ceil(filteredScans.length / itemsPerPage);
  const paginatedScans = filteredScans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const visibleIsLoading = isLoading;
  const visibleError = error;

  return (
    <div className="compare-page animate-fade-in-up">
      <div className="compare-shell">
        <div className="compare-header">
          <button
            onClick={showComparison ? () => setShowComparison(false) : onBack}
            className="compare-back-button"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1>{t('compare_title')}</h1>
          <div className="compare-header-spacer" aria-hidden="true" />
        </div>

        {visibleIsLoading ? (
          <div className="compare-state">
            <div className="compare-spinner" />
            <p>{t('analyzing_choices')}</p>
          </div>
        ) : visibleError ? (
          <div className="compare-error">
            <p>{t('error')}</p>
            <span>{visibleError}</span>
          </div>
        ) : scans.length < 2 ? (
          <div className="compare-empty">
            <div>
              <BarChart2 size={44} />
            </div>
            <h2>{t('need_more_scans')}</h2>
            <p>{t('need_more_scans_desc')}</p>
          </div>
        ) : (
          <div className="compare-content">
            {!showComparison ? (
              <div className="compare-picker">
                <div className="compare-hero-copy">
                  <h2>{t('pick_rivals')}</h2>
                  <p>{t('select_to_compare')}</p>
                </div>

                <div className="compare-search">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder={t('search_products')}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <div className="compare-product-list">
                  {paginatedScans.length > 0 ? paginatedScans.map((scan) => {
                    const selected = isSelected(scan);
                    const scoreColor = scan.score >= 8 ? '#5BAD4E' : scan.score >= 5 ? '#F59E0B' : '#EF4444';
                    const productImage = getProductImage(scan);

                    return (
                      <div
                        key={scan.id}
                        onClick={() => toggleSelection(scan)}
                        className={`compare-product-card ${selected ? 'is-selected' : ''}`}
                        style={{ '--score-color': scoreColor }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleSelection(scan);
                          }
                        }}
                      >
                        <div className="compare-product-check">
                          {selected && <CheckCircle2 size={15} color="white" />}
                        </div>

                        <div className="compare-product-image" aria-hidden="true">
                          {productImage ? (
                            <img src={productImage} alt="" loading="lazy" />
                          ) : (
                            <BarChart2 size={18} />
                          )}
                        </div>

                        <div className="compare-product-info">
                          <h3>{scan.product_name || 'Product'}</h3>
                          <p>{scan.brand || 'Unknown Brand'}</p>
                        </div>

                        <div className="compare-score-badge">
                          <span>{scan.score}</span>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="compare-no-results">
                      <p>{t('no_products_found')}</p>
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="compare-pagination">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>{t('page_of', { current: currentPage, total: totalPages })}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}

                {selectedScans.length > 0 && (
                  <div className="compare-action-bar animate-streak-pop">
                    <button
                      onClick={() => setShowComparison(true)}
                      disabled={selectedScans.length < 2}
                    >
                      <BarChart2 size={24} />
                      {selectedScans.length < 2 ? t('select_more', { count: 2 - selectedScans.length }) : t('compare_choices', { count: selectedScans.length })}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div className="flex gap-4 overflow-x-auto pb-10 snap-x snap-mandatory px-2 no-scrollbar">
                  {selectedScans.map((scan) => {
                    const scoreColor = scan.score >= 8 ? '#5BAD4E' : scan.score >= 5 ? '#F59E0B' : '#EF4444';
                    const verdictItems = parseVerdict(scan.verdict);
                    const productImage = getProductImage(scan);

                    return (
                      <div key={`compare-${scan.id}`} className="min-w-[280px] w-[280px] ns-card !p-6 flex flex-col gap-6 relative overflow-hidden snap-center group border-2 border-transparent">
                        <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: scoreColor }}></div>

                        <div className="text-center space-y-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80" style={{ color: 'var(--ns-secondary-con)' }}>{scan.brand || 'Unknown Brand'}</p>
                            <h3 className="font-black text-lg leading-tight uppercase tracking-tight line-clamp-2 h-12" style={{ fontFamily: 'var(--font-headline)', color: 'var(--ns-on-surface)' }}>{scan.product_name || 'Unknown'}</h3>
                          </div>

                          <div className="compare-result-image" aria-label={`Product image for ${scan.product_name || 'product'}`}>
                            {productImage ? (
                              <img src={productImage} alt={scan.product_name || 'Product'} loading="lazy" />
                            ) : (
                              <BarChart2 size={28} />
                            )}
                          </div>

                          <div className="relative inline-block">
                            <div className="absolute inset-0 blur-xl opacity-15 rounded-full animate-pulse" style={{ background: scoreColor }}></div>
                            <div className="w-20 h-20 rounded-[24px] border-2 flex flex-col items-center justify-center relative z-10 shadow-sm"
                              style={{ borderColor: scoreColor + '44', background: scoreColor + '11' }}>
                              <span className="text-4xl font-black leading-none" style={{ color: scoreColor }}>{scan.score}</span>
                              <span className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-80" style={{ color: scoreColor }}>{t('health_score')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 px-1">
                            <Zap size={14} style={{ color: 'var(--ns-primary)' }} fill="currentColor" />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-on-surface-var)' }}>{t('key_insights')}</span>
                          </div>

                          <div className="flex flex-col gap-2">
                            {verdictItems.length > 0 ? verdictItems.map((point, pIdx) => {
                              const isGood = point.toLowerCase().startsWith('good:');
                              const isBad = point.toLowerCase().startsWith('bad:');
                              const label = isGood ? point.replace(/^good:\s*/i, '') : isBad ? point.replace(/^bad:\s*/i, '') : point;
                              const dotColor = isGood ? '#5BAD4E' : isBad ? '#EF4444' : (scan.score >= 8 ? '#5BAD4E' : scan.score >= 5 ? '#F59E0B' : '#EF4444');
                              const textColor = 'var(--ns-on-surface)';
                              const bgColor = isGood ? 'rgba(91, 173, 78,0.08)' : isBad ? 'rgba(186,26,26,0.06)' : 'var(--ns-surface-low)';

                              return (
                                <div
                                  key={pIdx}
                                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                                  style={{ background: bgColor, borderColor: isGood ? 'rgba(91, 173, 78,0.1)' : isBad ? 'rgba(186,26,26,0.1)' : 'var(--ns-outline-var)' }}
                                >
                                  {isGood ? (
                                    <CheckCircle size={15} style={{ color: dotColor, flexShrink: 0 }} />
                                  ) : isBad ? (
                                    <XCircle size={15} style={{ color: dotColor, flexShrink: 0 }} />
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }}></div>
                                  )}
                                  <span className="text-[11px] font-bold leading-snug" style={{ color: textColor }}>{label}</span>
                                </div>
                              );
                            }) : (
                              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'var(--ns-surface-low)', border: '1px solid var(--ns-outline-var)' }}>
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--ns-outline)' }}></div>
                                <span className="text-[11px] font-bold leading-snug" style={{ color: 'var(--ns-outline)' }}>{t('no_data_available')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--ns-outline-var)' }}>
                          <div className="flex items-center gap-2">
                            <Activity size={14} style={{ color: 'var(--ns-outline)' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-outline)' }}>NutriScore</span>
                          </div>
                          {scan.score >= 8 ? (
                            <div className="flex items-center gap-1.5" style={{ color: '#5BAD4E' }}>
                              <ShieldCheck size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t('safe')}</span>
                            </div>
                          ) : scan.score < 5 ? (
                            <div className="flex items-center gap-1.5" style={{ color: '#EF4444' }}>
                              <XCircle size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t('risky')}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-3 opacity-60 animate-pulse mt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'var(--ns-outline)' }}>
                    &larr; {t('swipe_to_compare')} &rarr;
                  </p>
                  <div className="flex gap-1">
                    {selectedScans.map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ns-outline-var)' }}></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
