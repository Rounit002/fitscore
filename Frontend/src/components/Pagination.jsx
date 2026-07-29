import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/* ------------------------------------------------------------------ */
/*  Pagination                                                        */
/* ------------------------------------------------------------------ */

/* Shared pager for any long list. Numbered pages with a sliding window, so on a
   phone the control stays a fixed width no matter how many pages exist rather
   than wrapping onto a second row.

   Every control is 44px minimum, and the current page is announced through
   aria-current rather than by colour alone. */

const DOTS = 'dots';

/* Window of page numbers around the current page, with first/last always
   present and ellipses standing in for the gaps. */
const buildRange = (current, total, siblings) => {
  // 1 first + 1 last + 1 current + 2 ellipses + siblings on both sides
  const slots = siblings * 2 + 5;
  if (total <= slots) return Array.from({ length: total }, (_, i) => i + 1);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeftDots = left > 2;
  const showRightDots = right < total - 1;

  if (!showLeftDots && showRightDots) {
    const count = siblings * 2 + 3;
    return [...Array.from({ length: count }, (_, i) => i + 1), DOTS, total];
  }

  if (showLeftDots && !showRightDots) {
    const count = siblings * 2 + 3;
    return [
      1,
      DOTS,
      ...Array.from({ length: count }, (_, i) => total - count + 1 + i),
    ];
  }

  return [
    1,
    DOTS,
    ...Array.from({ length: right - left + 1 }, (_, i) => left + i),
    DOTS,
    total,
  ];
};

export default function Pagination({
  page,
  totalPages,
  onChange,
  /* Pages either side of the current one. 0 on the narrowest screens keeps the
     control to first / prev / current / next / last. */
  siblings = 1,
  className = '',
  label,
}) {
  const { t } = useTranslation();
  const range = useMemo(() => buildRange(page, totalPages, siblings), [page, totalPages, siblings]);

  /* One page needs no pager. Rendering it anyway would add a control that can
     never do anything. */
  if (totalPages <= 1) return null;

  const go = (next) => {
    const clamped = Math.max(1, Math.min(totalPages, next));
    if (clamped !== page) onChange(clamped);
  };

  return (
    <nav className={`ns-pager ${className}`.trim()} aria-label={label || t('pagination', 'Pagination')}>
      <button
        type="button"
        className="ns-pager-arrow tap-44"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label={t('previous_page', 'Previous page')}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>

      <ul className="ns-pager-pages">
        {range.map((item, index) =>
          item === DOTS ? (
            <li key={`dots-${index}`} className="ns-pager-dots" aria-hidden="true">
              &hellip;
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className="ns-pager-page tap-44"
                data-current={item === page || undefined}
                aria-current={item === page ? 'page' : undefined}
                aria-label={t('go_to_page', 'Page {{page}}', { page: item })}
                onClick={() => go(item)}
              >
                <span className="num-tabular">{item}</span>
              </button>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        className="ns-pager-arrow tap-44"
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        aria-label={t('next_page', 'Next page')}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
