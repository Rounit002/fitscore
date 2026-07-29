import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search, X, Trash2, Utensils, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';
import { safeJsonValue } from '../utils/nutrition.js';
import ScanCard from './ScanCard.jsx';
import EmptyPreview from './EmptyPreview.jsx';
import CalendarStrip from './CalendarStrip.jsx';
import Pagination from './Pagination.jsx';
import { addDays, endOfWeek, startOfDay, toDateKey } from '../utils/calendarDates.js';
import usePagination from '../utils/usePagination.js';

/* Days per page on the timeline. Paging by day rather than by scan keeps a day's
   scans together — splitting one day across two pages would break the grouping
   the headings exist to provide. */
const DAYS_PER_PAGE = 7;

/* ------------------------------------------------------------------ */
/*  Shared surface token                                              */
/* ------------------------------------------------------------------ */

/* Same card treatment the dashboard uses: 20px radius, hairline edge, resting
   elevation. The page used to wrap everything in a 390px-wide "phone shell" with
   a 2px border and a 28px radius — a fake device frame that left a dead gutter on
   tablets and desktop and looked nothing like the dashboard it navigates from. */
const CARD = 'rounded-xl edge-hairline elev-rest bg-[var(--ns-card-bg)]';

const parseScanDate = (scan) => {
  const raw = scan.created_at || scan.createdAt || scan.date;
  const parsed = raw ? new Date(raw) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

export default function History({ onViewDetail }) {
  const { t } = useTranslation();
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  /* Date filter. `null` is the default and means "every day, newest first" — the
     full timeline the page has always shown. Picking a date on the rail narrows
     the page to that one day; clearing it returns to the timeline. The rail is
     only mounted while a date is active, so the page never shows a highlighted
     day that is not actually filtering anything. */
  const [selectedDate, setSelectedDate] = useState(null);

  /* Ids currently mid-request, so their row controls disable and can't double-fire. */
  const [pendingIds, setPendingIds] = useState(() => new Set());
  /* Id awaiting delete confirmation, so a mis-tap doesn't permanently drop a scan. */
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const markPending = (id, isPending) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleDelete = async (scanId) => {
    markPending(scanId, true);
    try {
      const res = await fetch(`${API}/scans/${scanId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete scan');
      setScans((prev) => prev.filter((scan) => scan.id !== scanId));
      setConfirmDeleteId(null);
    } catch (deleteError) {
      console.error(deleteError);
      setError(t('delete_failed', 'Could not delete this scan. Please try again.'));
    } finally {
      markPending(scanId, false);
    }
  };

  /* Toggling: tapping the active state again clears it back to undecided. */
  const handleSetEaten = async (scanId, currentEaten, target) => {
    const nextValue = currentEaten === target ? null : target;
    markPending(scanId, true);
    try {
      const res = await fetch(`${API}/scans/${scanId}/eaten`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eaten: nextValue }),
      });
      if (!res.ok) throw new Error('Failed to update eaten status');
      const updated = await res.json();
      setScans((prev) =>
        prev.map((scan) =>
          scan.id === scanId ? { ...scan, eaten: updated.eaten, eaten_at: updated.eaten_at } : scan
        )
      );
    } catch (eatenError) {
      console.error(eatenError);
      setError(t('eaten_update_failed', 'Could not update this scan. Please try again.'));
    } finally {
      markPending(scanId, false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const loadHistory = async () => {
      try {
        const response = await fetch(`${API}/scans`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Failed to load history');
        const data = await response.json();
        setScans(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (loadError.name === 'AbortError') return;
        console.error(loadError);
        setError(t('history_load_failed', 'Failed to load your scan history.'));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadHistory();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredScans = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return scans;

    return scans.filter(
      (scan) =>
        (scan.product_name || '').toLowerCase().includes(query) ||
        (scan.brand || '').toLowerCase().includes(query) ||
        String(scan.score ?? '').includes(query)
    );
  }, [scans, searchTerm]);

  /* Grouped by day, newest first. A flat list of 200 rows gives no sense of when
     anything happened; day headings turn it into a timeline and make the
     timestamps on each row meaningful. */
  const allGroups = useMemo(() => {
    const buckets = new Map();

    filteredScans.forEach((scan) => {
      const date = parseScanDate(scan);
      const key = date ? toDateKey(date) : 'unknown';
      const bucket = buckets.get(key);
      if (bucket) bucket.scans.push(scan);
      else buckets.set(key, { key, date, scans: [scan] });
    });

    return [...buckets.values()].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date - a.date;
    });
  }, [filteredScans]);

  /* Event dots on the rail count every scan for a day, ignoring the search box:
     the dots describe what exists, the list describes what matches. */
  const eventCounts = useMemo(() => {
    const counts = new Map();
    scans.forEach((scan) => {
      const date = parseScanDate(scan);
      if (!date) return;
      const key = toDateKey(date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [scans]);

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

  /* With a date active the page is one day; without it, the whole timeline. */
  const groups = useMemo(
    () => (selectedKey ? allGroups.filter((group) => group.key === selectedKey) : allGroups),
    [allGroups, selectedKey]
  );

  /* Read the clock once per mount rather than on every render, so "Today" cannot
     change identity mid-render and the labels stay stable while scrolling. */
  const { today, todayKey, yesterdayKey, thisYear } = useMemo(() => {
    const now = startOfDay(new Date());
    return {
      today: now,
      todayKey: toDateKey(now),
      yesterdayKey: toDateKey(addDays(now, -1)),
      thisYear: now.getFullYear(),
    };
  }, []);

  /* Rail bounds come from the unfiltered scans, so typing in the search box never
     shortens the range of dates you can pick. The past end reaches back to the
     oldest scan with a 120-day floor, so a new account still has somewhere to
     scroll; the future end runs to the end of this week so the rest of the week
     stays visible, but only up to today is selectable. */
  const railStart = useMemo(() => {
    let oldest = addDays(today, -120);
    scans.forEach((scan) => {
      const date = parseScanDate(scan);
      if (date && startOfDay(date) < oldest) oldest = startOfDay(date);
    });
    return oldest;
  }, [scans, today]);

  const railEnd = useMemo(() => endOfWeek(today), [today]);

  const handleScanClick = (scan) => {
    onViewDetail({
      scanId: scan.id,
      servings: scan.servings || 1,
      productName: scan.product_name || 'Product',
      brand: scan.brand || 'Unknown Brand',
      score: scan.score,
      verdict: safeJsonValue(scan.verdict, scan.verdict),
      explanation: scan.explanation,
      ingredientsAnalysis: safeJsonValue(scan.ingredients, []),
      alternatives: safeJsonValue(scan.alternatives, []),
      sideEffects: safeJsonValue(scan.side_effects, []),
      image_url: scan.image_url,
      barcode: scan.product_data?.barcode || scan.product_data?.code || '',
      recorded_at: scan.created_at,
      nutriments: scan.nutriments,
      rawProductData: scan.raw_product_data || scan.product_data,
    });
  };

  const formatDay = (date) =>
    new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      /* The year is only worth the space once the entry is not from this year. */
      year: date.getFullYear() === thisYear ? undefined : 'numeric',
    }).format(date);

  const groupLabel = (group) => {
    if (!group.date) return t('date_unavailable', 'Date unavailable');
    if (group.key === todayKey) return t('today', 'Today');
    if (group.key === yesterdayKey) return t('yesterday', 'Yesterday');
    return formatDay(group.date);
  };

  /* Paginated by day. A single date filter yields one group, so the pager hides
     itself; the full timeline is where it earns its place. Resets to page 1 when
     either filter changes, so matches on page 1 are never hidden behind a stale
     page index. */
  const {
    page,
    totalPages,
    pageItems: pagedGroups,
    setPage,
  } = usePagination(groups, DAYS_PER_PAGE, `${searchTerm.trim()}|${selectedKey ?? ''}`);

  const handlePageChange = (next) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Brand and time on one line. The date is already the group heading, so
     repeating it per row (as the old full "12 Jul 2026, 09:14 AM" stamp did) was
     the same value printed once per card. */
  const metaLabel = (scan) => {
    const date = parseScanDate(scan);
    const time = date
      ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date)
      : '';
    return [scan.brand, time].filter(Boolean).join(' · ');
  };

  return (
    /* No back button and no page title: History is a permanent bottom-nav tab and
       the shell already renders its name in the header, so both were duplicates
       of chrome that is always on screen. */
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 sm:pt-6 lg:gap-6">
      {/* Search + date filter. Sticky so both stay reachable while scrolling a
          long history — they are the only controls on this page that are always
          relevant. */}
      <div className="sticky top-0 z-10 -mx-4 bg-[var(--ns-page-bg)] px-4 pb-1 pt-1 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className={`${CARD} flex min-w-0 flex-1 items-center gap-2 px-3`}>
            <Search size={18} className="shrink-0 text-[var(--ns-outline)]" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('search_history', 'Search by product, brand or score')}
              aria-label={t('search_history', 'Search by product, brand or score')}
              className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--ns-on-surface)] outline-none placeholder:text-[var(--ns-outline)]"
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

          {/* Opens the rail on today, which is also the day it filters to — the
              highlighted cell and the list below it always agree. Pressing it
              again clears the filter and restores the full timeline. */}
          <button
            type="button"
            onClick={() => setSelectedDate((current) => (current ? null : today))}
            aria-pressed={Boolean(selectedDate)}
            aria-label={
              selectedDate
                ? t('show_all_dates', 'Show all dates')
                : t('pick_a_date', 'Pick a date')
            }
            className={`${CARD} tap-44 grid h-11 w-11 shrink-0 place-items-center transition`}
            style={
              selectedDate
                ? {
                    borderWidth: '2px',
                    borderColor: 'var(--ns-primary)',
                    color: 'var(--ns-primary-con)',
                  }
                : { color: 'var(--ns-on-surface-var)' }
            }
          >
            <CalendarDays size={18} />
          </button>
        </div>
      </div>

      {selectedDate && (
        <div className="flex flex-col gap-3">
          <CalendarStrip
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            eventCounts={eventCounts}
            minDate={railStart}
            maxDate={railEnd}
            maxSelectableDate={today}
            label={t('filter_by_date', 'Filter scans by date')}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-medium text-[var(--ns-on-surface-var)]">
              {t('showing_date', 'Showing')} {formatDay(selectedDate)}
            </p>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="shrink-0 rounded-md border-0 bg-transparent text-xs font-bold text-[var(--ns-primary-con)] underline decoration-dotted underline-offset-4"
            >
              {t('show_all_dates', 'Show all dates')}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={`${CARD} flex flex-col items-center gap-3 p-10 text-[var(--ns-on-surface-var)]`}>
          <div
            className="h-8 w-8 animate-spin rounded-full"
            style={{ border: '3px solid var(--ns-surface-high)', borderTopColor: 'var(--ns-primary)' }}
          />
          <span className="text-sm">{t('loading_history', 'Loading history...')}</span>
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
      ) : groups.length === 0 ? (
        /* Same shared preview component the dashboard uses, so both screens show
           the identical skeleton of a real scan card rather than each describing
           the absence in its own words. Copy names whichever filter is actually
           responsible for the empty list. */
        <EmptyPreview
          title={
            searchTerm
              ? t('no_results', 'No matches')
              : selectedDate
                ? t('no_scans_this_day', 'No scans on this day')
                : t('no_history', 'No history yet')
          }
          hint={
            searchTerm
              ? t('try_different_search', 'Try a different search.')
              : selectedDate
                ? t('no_scans_this_day_hint', 'Nothing was scanned on this date. Pick another day above.')
                : t('scan_first_product', 'Scan your first product to get started!')
          }
        />
      ) : (
        /* Two columns from lg up so a long history does not become one narrow
           ribbon down the middle of a desktop window. */
        <div className="flex flex-col gap-5 lg:gap-6">
          {pagedGroups.map((group) => (
            <section key={group.key} aria-label={groupLabel(group)} className="min-w-0">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="min-w-0 truncate font-[var(--font-headline)] text-sm font-bold text-[var(--ns-on-surface)]">
                  {groupLabel(group)}
                </h2>
                <span className="num-tabular shrink-0 text-xs font-medium text-[var(--ns-on-surface-var)]">
                  {group.scans.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
                {group.scans.map((scan) => {
                  const isPending = pendingIds.has(scan.id);
                  const eaten = scan.eaten;
                  return (
                    <div key={scan.id} className={`${CARD} flex flex-col gap-2 p-2`}>
                      <ScanCard
                        scan={scan}
                        meta={metaLabel(scan)}
                        showChips={false}
                        onSelect={handleScanClick}
                      />

                      {/* Row actions: mark whether it was actually eaten (this is
                          what feeds Health Progress) and delete it. */}
                      <div className="flex items-center gap-2 px-1">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSetEaten(scan.id, eaten, true)}
                          aria-pressed={eaten === true}
                          className="tap-44 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition disabled:opacity-50"
                          style={
                            eaten === true
                              ? { background: 'color-mix(in srgb, var(--sem-score-good) 16%, transparent)', color: 'var(--sem-score-good)' }
                              : { background: 'var(--ns-surface-high)', color: 'var(--ns-on-surface-var)' }
                          }
                        >
                          <Utensils size={15} />
                          {t('eaten', 'Eaten')}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSetEaten(scan.id, eaten, false)}
                          aria-pressed={eaten === false}
                          className="tap-44 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition disabled:opacity-50"
                          style={
                            eaten === false
                              ? { background: 'color-mix(in srgb, var(--ns-error) 14%, transparent)', color: 'var(--ns-error)' }
                              : { background: 'var(--ns-surface-high)', color: 'var(--ns-on-surface-var)' }
                          }
                        >
                          <Ban size={15} />
                          {t('not_eaten', 'Not eaten')}
                        </button>

                        {confirmDeleteId === scan.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDelete(scan.id)}
                              className="tap-44 rounded-lg px-2 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                              style={{ background: 'var(--ns-error)' }}
                            >
                              {t('confirm', 'Confirm')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="tap-44 rounded-lg px-2 py-2 text-xs font-semibold text-[var(--ns-on-surface-var)]"
                              style={{ background: 'var(--ns-surface-high)' }}
                            >
                              {t('cancel', 'Cancel')}
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setConfirmDeleteId(scan.id)}
                            aria-label={t('delete', 'Delete')}
                            className="tap-44 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--ns-on-surface-var)] transition hover:text-[var(--ns-error)] disabled:opacity-50"
                            style={{ background: 'var(--ns-surface-high)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={handlePageChange}
            label={t('history_pagination', 'History pages')}
          />
        </div>
      )}
    </div>
  );
}
