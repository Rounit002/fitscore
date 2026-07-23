import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, History as HistoryIcon, Search, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';

const parseJsonField = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export default function History({ authToken, onBack, onViewDetail }) {
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    const controller = new AbortController();

    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${API}/scans`,
          { credentials: 'include', signal: controller.signal }
        );
        if (!response.ok) throw new Error('Failed to load history');
        const data = await response.json();
        setScans(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (loadError.name === 'AbortError') return;
        console.error(loadError);
        setError('Failed to load your scan history.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadHistory();

    return () => controller.abort();
  }, []);

  const filteredScans = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return scans;

    return scans.filter((scan) => (
      (scan.product_name || '').toLowerCase().includes(query)
      || (scan.brand || '').toLowerCase().includes(query)
      || String(scan.score || '').includes(query)
    ));
  }, [scans, searchTerm]);

  const handleScanClick = (scan) => {
    onViewDetail({
      scanId: scan.id,
      servings: scan.servings || 1,
      productName: scan.product_name || 'Product',
      brand: scan.brand || 'Unknown Brand',
      score: scan.score,
      verdict: parseJsonField(scan.verdict, scan.verdict),
      explanation: scan.explanation,
      ingredientsAnalysis: parseJsonField(scan.ingredients, []),
      alternatives: parseJsonField(scan.alternatives, []),
      sideEffects: parseJsonField(scan.side_effects, []),
      image_url: scan.image_url,
      barcode: scan.product_data?.barcode || scan.product_data?.code || '',
      recorded_at: scan.created_at,
      nutriments: scan.nutriments,
      rawProductData: scan.raw_product_data || scan.product_data
    });
  };

  const scoreColor = (score) => {
    if (score >= 8) return '#5BAD4E';
    if (score >= 5) return '#F59E0B';
    return '#ba1a1a';
  };

  return (
    <div className="history-page">
      <section className="history-phone-shell" aria-label="History">
        <header className="history-topbar">
          <button type="button" onClick={onBack} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <h1>{t('history')}</h1>
          <span />
        </header>

        <div className="history-search-bar">
          <Search size={18} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t('search')}
            aria-label="Search history"
          />
        </div>

        {isLoading ? (
          <div className="history-state">
            <div className="history-spinner" />
            <span>{t('loading_history')}</span>
          </div>
        ) : error ? (
          <div className="history-state is-error">
            <HistoryIcon size={24} />
            <span>{error}</span>
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="history-state">
            <HistoryIcon size={28} />
            <strong>{t('no_history')}</strong>
            <span>{searchTerm ? t('try_different_search') : t('scan_first_product')}</span>
          </div>
        ) : (
          <div className="history-list" aria-label="History entries">
            {filteredScans.map((scan) => {
              const recordedAt = scan.created_at ? new Date(scan.created_at) : null;
              const dateLabel = recordedAt && !Number.isNaN(recordedAt.getTime())
                ? recordedAt.toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : t('date_unavailable');
              const color = scoreColor(scan.score);

              return (
                <button
                  className="history-entry-card"
                  type="button"
                  key={scan.id}
                  onClick={() => handleScanClick(scan)}
                >
                  {scan.image_url ? (
                    <span className="history-entry-thumb">
                      <img
                        src={scan.image_url}
                        alt={scan.product_name || 'Product'}
                        onError={(e) => { e.currentTarget.parentElement.innerHTML = `<span class="history-entry-indicator" style="background:${color}"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg></span>`; }}
                      />
                    </span>
                  ) : (
                    <span className="history-entry-indicator" style={{ background: color }}>
                      <Scale size={17} />
                    </span>
                  )}
                  <span className="history-entry-copy">
                    <strong>{scan.product_name || 'current Weight'}</strong>
                    <small>{dateLabel}</small>
                  </span>
                  <span className="history-entry-value">{scan.score || '--'}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
