import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  addDays,
  clampDate,
  diffInDays,
  startOfDay,
  toDateKey,
} from '../utils/calendarDates.js';

/* ------------------------------------------------------------------ */
/*  Horizontal date rail                                              */
/* ------------------------------------------------------------------ */

/* Replaces the arrow-driven 7-cell week grid. The whole range is rendered as
   one snap-scrolling rail, so days, weeks and months are reachable by swipe,
   wheel or trackpad without repeated arrow presses.

   The rail is the entire component — no header, no month label, no jump
   controls. Every cell is the same width, which is what lets the component
   centre a date from `scrollLeft` arithmetic instead of measuring several
   hundred cells. */

export default function CalendarStrip({
  selectedDate,
  onSelectDate,
  /* Map<dateKey, number>: entries per day, from real scan data. Drives the
     "this day has events" marker. */
  eventCounts,
  /* Rail bounds — the full span of dates rendered. */
  minDate,
  maxDate,
  /* Last date the user may pick. Days past it still render (so the rest of the
     current week stays visible, as in the reference) but read and behave as
     unavailable. Defaults to `maxDate`. */
  maxSelectableDate,
  locale = 'en-IN',
  className = '',
  label = 'Filter by date',
}) {
  const railRef = useRef(null);
  const cellRefs = useRef(new Map());
  /* Timestamp until which a programmatic scroll is in flight, so a snap-back
     never fights an animation that is still running. */
  const autoScrollUntil = useRef(0);
  /* Holds a date key when the selection came from the keyboard, so focus follows
     the roving tabindex — but never on a tap. */
  const focusOnRender = useRef(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const rangeStart = useMemo(() => startOfDay(minDate), [minDate]);
  const rangeEnd = useMemo(() => startOfDay(maxDate), [maxDate]);
  const selectableEnd = useMemo(
    () => startOfDay(maxSelectableDate ?? maxDate),
    [maxSelectableDate, maxDate]
  );

  const days = useMemo(() => {
    const total = Math.max(0, diffInDays(rangeStart, rangeEnd)) + 1;
    return Array.from({ length: total }, (_, index) => addDays(rangeStart, index));
  }, [rangeStart, rangeEnd]);

  const selectedKey = toDateKey(selectedDate);
  const todayKey = toDateKey(today);

  const weekdayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);
  /* Long form is the accessible name: with no month heading left on screen, the
     per-cell label is the only place the month and year are stated, so it has to
     be unambiguous on its own. */
  const fullDateFormat = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [locale]
  );

  const centerDate = useCallback((key, behavior = 'smooth') => {
    const rail = railRef.current;
    const cell = cellRefs.current.get(key);
    if (!rail || !cell) return;
    const target = cell.offsetLeft - (rail.clientWidth - cell.offsetWidth) / 2;
    const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    autoScrollUntil.current = Date.now() + (behavior === 'smooth' ? 600 : 100);
    rail.scrollTo({ left: Math.max(0, Math.min(max, target)), behavior });
  }, []);

  /* Park the selected day in view before the first paint, so there is no visible
     jump from scrollLeft 0 and no layout shift. Re-runs when the rail length
     changes, which is when the range widens as real scans arrive. */
  useLayoutEffect(() => {
    centerDate(toDateKey(selectedDate), 'auto');
    // Selection changes are handled below; this is about the rail's own length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length, centerDate]);

  useEffect(() => {
    centerDate(selectedKey);
  }, [selectedKey, centerDate]);

  /* Re-centre on resize / orientation change, so the selected day is never left
     parked off-screen after a breakpoint changes the cell width. */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      const key = railRef.current?.querySelector('[data-selected]')?.dataset.key;
      if (key) centerDate(key, 'auto');
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, [centerDate]);

  useEffect(() => {
    if (!focusOnRender.current) return;
    const cell = cellRefs.current.get(focusOnRender.current);
    focusOnRender.current = null;
    cell?.focus({ preventScroll: true });
  }, [selectedKey]);

  /* Vertical wheel / trackpad travel drives the rail horizontally, but only
     while the rail can still move that way. At either end the event is left
     alone so the page keeps scrolling and the calendar never traps the
     viewport. */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;

    const onWheel = (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const max = rail.scrollWidth - rail.clientWidth;
      if (max <= 0) return;
      const next = rail.scrollLeft + event.deltaY;
      if ((next <= 0 && rail.scrollLeft <= 0) || (next >= max && rail.scrollLeft >= max)) return;
      event.preventDefault();
      autoScrollUntil.current = 0;
      rail.scrollLeft = Math.max(0, Math.min(max, next));
    };

    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => rail.removeEventListener('wheel', onWheel);
  }, []);

  const commitDate = useCallback(
    (date, { fromKeyboard = false } = {}) => {
      const next = clampDate(startOfDay(date), rangeStart, selectableEnd);
      const nextKey = toDateKey(next);
      if (fromKeyboard) focusOnRender.current = nextKey;
      /* Re-picking the current day still recentres it — that is the "snap back"
         after a scroll that did not change the selection. */
      if (nextKey === selectedKey) {
        centerDate(selectedKey);
        return;
      }
      onSelectDate(next);
    },
    [rangeStart, selectableEnd, selectedKey, onSelectDate, centerDate]
  );

  const handleKeyDown = (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];

    if (step !== undefined) {
      event.preventDefault();
      commitDate(addDays(selectedDate, step), { fromKeyboard: true });
      return;
    }

    /* PageUp / PageDown are the only month-sized jump left now that the picker
       is gone, so keyboard users are not forced through 30 arrow presses. */
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const shifted = new Date(selectedDate);
      shifted.setMonth(shifted.getMonth() + (event.key === 'PageUp' ? -1 : 1));
      commitDate(shifted, { fromKeyboard: true });
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      commitDate(event.key === 'Home' ? rangeStart : selectableEnd, { fromKeyboard: true });
    }
  };

  return (
    <section className={`ns-cal ${className}`.trim()} aria-label={label}>
      <div className="ns-cal-track">
        <div
          ref={railRef}
          className="ns-cal-rail"
          role="group"
          aria-label="Dates"
          onKeyDown={handleKeyDown}
        >
          {days.map((date) => {
            const key = toDateKey(date);
            const isSelected = key === selectedKey;
            const isToday = key === todayKey;
            const isUnavailable = date > selectableEnd;
            const count = eventCounts?.get(key) ?? 0;

            return (
              <button
                key={key}
                type="button"
                ref={(node) => {
                  if (node) cellRefs.current.set(key, node);
                  else cellRefs.current.delete(key);
                }}
                className="ns-cal-day"
                data-key={key}
                data-selected={isSelected || undefined}
                data-today={isToday || undefined}
                data-events={count > 0 || undefined}
                aria-pressed={isSelected}
                aria-current={isToday ? 'date' : undefined}
                disabled={isUnavailable}
                tabIndex={isSelected ? 0 : -1}
                aria-label={
                  isUnavailable
                    ? `${fullDateFormat.format(date)}, unavailable`
                    : `${fullDateFormat.format(date)}, ${
                        count > 0 ? `${count} ${count === 1 ? 'scan' : 'scans'}` : 'no scans'
                      }`
                }
                onClick={() => commitDate(date)}
              >
                <span className="ns-cal-dow" aria-hidden="true">
                  {weekdayFormat.format(date)}
                </span>
                <span className="ns-cal-ring" aria-hidden="true">
                  <span className="ns-cal-num num-tabular">{date.getDate()}</span>
                </span>
                <span className="ns-cal-dot" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
