import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart2,
  Check,
  CheckCircle,
  Search,
  Utensils,
  X,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';
import { scoreColor } from '../utils/scoreColor.js';
import { safeJsonValue } from '../utils/nutrition.js';
import usePagination from '../utils/usePagination.js';
import Pagination from './Pagination.jsx';

/* ------------------------------------------------------------------ */
/*  Shared surface token                                              */
/* ------------------------------------------------------------------ */

const CARD = 'rounded-xl edge-hairline elev-rest bg-[var(--ns-card-bg)]';

const PER_PAGE = 8;

/* Verdict strings arrive in three shapes: a JSON array, a Postgres-style
   brace list, or one blob of prose. Unchanged logic, just moved out of the
   component body. */
const parseVerdict = (verdictData) => {
  if (!verdictData) return [];
  let items = verdictData;

  if (typeof items === 'string') {
    const trimmed = items.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        items = JSON.parse(trimmed.replace(/^{/, '[').replace(/}$/, ']'));
      } catch {
        items = trimmed
          .replace(/^{/, '')
          .replace(/^\[/, '')
          .replace(/}$/, '')
          .replace(/\]$/, '')
          .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          .map((s) => s.trim().replace(/^"/, '').replace(/"$/, ''));
      }
    } else {
      items = trimmed
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);
    }
  }

  return Array.isArray(items) ? items : [];
};

const getProductImage = (scan) => {
  const raw =
    safeJsonValue(scan.raw_product_data, null) || safeJsonValue(scan.product_data, null) || {};
  return (
    scan.image_url ||
    raw.image_front_small_url ||
    raw.image_front_url ||
    raw.image_small_url ||
    raw.image_url ||
    null
  );
};

/* ------------------------------------------------------------------ */
/*  Comparison column                                                 */
/* ------------------------------------------------------------------ */

/* One product, as a column in the comparison view. Typography drops from the old
   card's four weights of uppercase black tracking to the app's headline/body
   pair, matching the dashboard's cards. */
function CompareColumn({ scan, onRemove }) {
  const { t } = useTranslation();
  const color = scoreColor(scan.score);
  const insights = parseVerdict(scan.verdict);
  const image = getProductImage(scan);

  return (
    <li
      className={`${CARD} relative flex w-[264px] shrink-0 snap-center flex-col gap-4 p-4 sm:w-[280px] lg:w-auto`}
    >
      {/* Removing a product from the comparison without going back to the picker
          is the action people reach for most here, and it did not exist. */}
      <button
        type="button"
        onClick={() => onRemove(scan)}
        aria-label={t('remove_from_comparison', 'Remove from comparison')}
        className="tap-44 absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md border-0 bg-transparent text-[var(--ns-outline)] transition hover:bg-[var(--ns-surface-low)] hover:text-[var(--ns-on-surface)]"
      >
        <X size={16} />
      </button>

      <div className="flex flex-col items-center gap-3 text-center">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-20 w-20 rounded-lg edge-hairline object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-20 w-20 place-items-center rounded-lg edge-hairline bg-[var(--ns-surface-low)] text-[var(--ns-outline)]"
          >
            <Utensils size={32} />
          </span>
        )}

        <div className="min-w-0 px-4">
          <p className="truncate text-xs text-[var(--ns-on-surface-var)]">
            {scan.brand || t('unknown_brand')}
          </p>
          <h3 className="line-clamp-2 font-[var(--font-headline)] text-sm font-bold leading-snug text-[var(--ns-on-surface)]">
            {scan.product_name || t('unknown_product')}
          </h3>
        </div>

        {/* Score badge uses the band colour as a tint plus a matching border —
            the same treatment ScanCard uses, rather than a second glow-and-blur
            style unique to this page. */}
        <div
          className="num-tabular flex h-16 w-16 flex-col items-center justify-center rounded-xl font-[var(--font-headline)] leading-none"
          style={{
            border: `2px solid color-mix(in srgb, ${color} 40%, transparent)`,
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            color,
          }}
        >
          <span className="text-2xl font-bold">{scan.score ?? '--'}</span>
          <span className="mt-0.5 text-[9px] font-semibold opacity-80">/10</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 border-t border-[var(--ns-border-light)] pt-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ns-outline)]">
          {t('key_insights')}
        </span>

        {insights.length > 0 ? (
          <ul className="flex list-none flex-col gap-1.5 p-0">
            {insights.map((point, index) => {
              const isGood = point.toLowerCase().startsWith('good:');
              const isBad = point.toLowerCase().startsWith('bad:');
              const label = point.replace(/^(good|bad):\s*/i, '');
              /* Good / bad come from the impact tokens; a neutral point falls
                 back to the product's own band rather than a third scale. */
              const tone = isGood
                ? 'var(--sem-impact-beneficial)'
                : isBad
                  ? 'var(--sem-impact-harmful)'
                  : 'var(--ns-outline)';

              return (
                <li
                  key={index}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5"
                  style={{
                    background:
                      isGood || isBad
                        ? `color-mix(in srgb, ${tone} 8%, transparent)`
                        : 'var(--ns-surface-low)',
                  }}
                >
                  {isGood ? (
                    <CheckCircle size={14} style={{ color: tone }} className="mt-0.5 shrink-0" />
                  ) : isBad ? (
                    <XCircle size={14} style={{ color: tone }} className="mt-0.5 shrink-0" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: tone }}
                    />
                  )}
                  <span className="text-xs leading-snug text-[var(--ns-on-surface)]">{label}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-[var(--ns-outline)]">{t('no_data_available')}</p>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Compare page                                                      */
/* ------------------------------------------------------------------ */

/* No onBack prop: Compare is reached from the dashboard's Explore row and the
   shell's chrome handles leaving the page. The only "back" this page needs is
   comparison -> picker, which is its own internal step. */
export default function Compare() {
  const { t } = useTranslation();
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API}/scans`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        setScans(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        setError(t('could_not_load'));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Selection is held as ids, not as copies of the scan objects. The old version
     stored whole rows, so a selected product kept whatever data it had at click
     time even if the list refreshed underneath it. */
  const selectedScans = useMemo(
    () => selectedIds.map((id) => scans.find((scan) => scan.id === id)).filter(Boolean),
    [selectedIds, scans]
  );

  const filteredScans = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return scans;
    return scans.filter(
      (scan) =>
        (scan.product_name || '').toLowerCase().includes(query) ||
        (scan.brand || '').toLowerCase().includes(query)
    );
  }, [scans, searchTerm]);

  const { page, totalPages, pageItems, setPage, from, to, total } = usePagination(
    filteredScans,
    PER_PAGE,
    searchTerm.trim()
  );

  const toggleSelection = (scan) => {
    setSelectedIds((prev) =>
      prev.includes(scan.id) ? prev.filter((id) => id !== scan.id) : [...prev, scan.id]
    );
  };

  const removeFromComparison = (scan) => {
    const next = selectedIds.filter((id) => id !== scan.id);
    setSelectedIds(next);
    /* Dropping below two products means there is nothing left to compare, so the
       view returns to the picker instead of showing a lone column. */
    if (next.length < 2) setShowComparison(false);
  };

  const handlePageChange = (next) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canCompare = selectedScans.length >= 2;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 sm:pt-6 lg:gap-6">
      {/* Back only appears in the comparison view, where it means "return to the
          picker" — a real step in this page's own flow. The shell's chrome covers
          leaving the page. */}
      {showComparison && (
        <button
          type="button"
          onClick={() => setShowComparison(false)}
          className="tap-44 -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md border-0 bg-transparent px-2 text-sm font-bold text-ns-primary-con transition hover:bg-[var(--ns-surface-low)]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          {t('edit_selection', 'Edit selection')}
        </button>
      )}

      {isLoading ? (
        <div className={`${CARD} flex flex-col items-center gap-3 p-10 text-[var(--ns-on-surface-var)]`}>
          <div
            className="h-8 w-8 animate-spin rounded-full"
            style={{ border: '3px solid var(--ns-surface-high)', borderTopColor: 'var(--ns-primary)' }}
          />
          <span className="text-sm">{t('analyzing_choices')}</span>
        </div>
      ) : error ? (
        <div
          className="rounded-xl p-4 text-center text-sm font-semibold"
          style={{
            border: '1px solid color-mix(in srgb, var(--ns-error) 30%, transparent)',
            background: 'color-mix(in srgb, var(--ns-error) 8%, transparent)',
            color: 'var(--ns-error)',
          }}
          role="alert"
        >
          {error}
        </div>
      ) : scans.length < 2 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--edge-hairline)] bg-[var(--ns-card-bg)] px-4 py-10 text-center">
          <BarChart2 size={32} className="text-[var(--ns-outline)]" aria-hidden="true" />
          <p className="font-bold text-[var(--ns-on-surface)]">{t('need_more_scans')}</p>
          <p className="max-w-xs text-sm text-[var(--ns-on-surface-var)]">
            {t('need_more_scans_desc')}
          </p>
        </div>
      ) : showComparison ? (
        /* Comparison: a horizontal snap rail on phones, a grid once there is room
           for the columns to sit side by side without scrolling. */
        <ul
          className="-mx-4 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 xl:grid-cols-4"
          style={{ scrollbarWidth: 'none' }}
          aria-label={t('comparison', 'Comparison')}
        >
          {selectedScans.map((scan) => (
            <CompareColumn key={`compare-${scan.id}`} scan={scan} onRemove={removeFromComparison} />
          ))}
        </ul>
      ) : (
        <>
          <div className="min-w-0">
            <h2 className="font-[var(--font-headline)] text-base font-bold text-[var(--ns-on-surface)]">
              {t('pick_rivals')}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--ns-on-surface-var)]">
              {t('select_to_compare')}
            </p>
          </div>

          <div className={`${CARD} flex items-center gap-2 px-3`}>
            <Search size={18} className="shrink-0 text-[var(--ns-outline)]" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('search_products')}
              aria-label={t('search_products')}
              className="min-h-12 min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--ns-on-surface)] outline-none placeholder:text-[var(--ns-outline)]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label={t('clear_search', 'Clear search')}
                className="tap-44 grid h-8 w-8 shrink-0 place-items-center rounded-md border-0 bg-transparent text-[var(--ns-outline)] transition hover:text-[var(--ns-on-surface)]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {pageItems.length > 0 ? (
            <>
              {totalPages > 1 && (
                <p className="num-tabular -mb-1 text-xs font-medium text-[var(--ns-on-surface-var)]">
                  {t('showing_range', 'Showing {{from}}-{{to}} of {{total}}', { from, to, total })}
                </p>
              )}

              <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:gap-4">
                {pageItems.map((scan) => {
                  const selected = selectedIds.includes(scan.id);
                  const color = scoreColor(scan.score);
                  const image = getProductImage(scan);

                  return (
                    <li key={scan.id} className="min-w-0">
                      {/* A real button with aria-pressed, not a div with a
                          role and a hand-rolled key handler. */}
                      <button
                        type="button"
                        onClick={() => toggleSelection(scan)}
                        aria-pressed={selected}
                        data-selected={selected || undefined}
                        className="ns-compare-pick flex w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left"
                      >
                        <span
                          aria-hidden="true"
                          className="ns-compare-check grid h-5 w-5 shrink-0 place-items-center rounded-sm"
                        >
                          {selected && <Check size={14} strokeWidth={3} />}
                        </span>

                        {image ? (
                          <img
                            src={image}
                            alt=""
                            loading="lazy"
                            className="h-11 w-11 shrink-0 rounded-lg edge-hairline object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg edge-hairline bg-[var(--ns-surface-low)] text-[var(--ns-outline)]"
                          >
                            <Utensils size={16} />
                          </span>
                        )}

                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <strong className="truncate text-sm font-bold text-[var(--ns-on-surface)]">
                            {scan.product_name || t('unknown_product')}
                          </strong>
                          <span className="truncate text-xs text-[var(--ns-on-surface-var)]">
                            {scan.brand || t('unknown_brand')}
                          </span>
                        </span>

                        <span
                          className="num-tabular grid h-9 min-w-9 shrink-0 place-items-center rounded-lg px-1.5 font-[var(--font-headline)] text-sm font-bold"
                          style={{
                            border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                            background: `color-mix(in srgb, ${color} 12%, transparent)`,
                            color,
                          }}
                        >
                          {scan.score ?? '--'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={handlePageChange}
                label={t('product_pagination', 'Product pages')}
              />
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--edge-hairline)] bg-[var(--ns-card-bg)] px-4 py-10 text-center">
              <Search size={32} className="text-[var(--ns-outline)]" aria-hidden="true" />
              <p className="font-bold text-[var(--ns-on-surface)]">{t('no_products_found')}</p>
              <p className="max-w-xs text-sm text-[var(--ns-on-surface-var)]">
                {t('try_another_search')}
              </p>
            </div>
          )}
        </>
      )}

      {/* Sticky action bar. Sits above the bottom nav rather than under it, which
          is what the old fixed bar did on phones. Only while picking. */}
      {!showComparison && selectedIds.length > 0 && (
        <div className="ns-compare-bar">
          <div className={`${CARD} flex items-center gap-3 p-2 pl-4`}>
            <span className="num-tabular min-w-0 flex-1 truncate text-sm font-medium text-[var(--ns-on-surface-var)]">
              {t('selected_count', '{{count}} selected', { count: selectedIds.length })}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="tap-44 shrink-0 rounded-md border-0 bg-transparent px-2 text-xs font-bold text-[var(--ns-outline)] transition hover:text-[var(--ns-on-surface)]"
            >
              {t('clear', 'Clear')}
            </button>
            <button
              type="button"
              onClick={() => setShowComparison(true)}
              disabled={!canCompare}
              className="min-h-11 shrink-0 rounded-lg edge-hairline bg-ns-primary px-4 text-sm font-bold text-white transition hover:bg-ns-primary-con disabled:opacity-50"
            >
              {canCompare
                ? t('compare_choices', { count: selectedScans.length })
                : t('select_more', { count: 2 - selectedScans.length })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
