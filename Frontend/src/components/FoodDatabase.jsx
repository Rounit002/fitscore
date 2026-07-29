import { useEffect, useState } from 'react';
import { Database, Search, Utensils, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';
import usePagination from '../utils/usePagination.js';
import Pagination from './Pagination.jsx';

/* ------------------------------------------------------------------ */
/*  Shared surface token                                              */
/* ------------------------------------------------------------------ */

/* Same treatment as the dashboard and History: 20px radius, hairline edge,
   resting elevation, theme accents. Replaces the bespoke "food-db-shell" frame
   that pinned the page to 390px and left dead gutters on larger screens. */
const CARD = 'rounded-xl edge-hairline elev-rest bg-[var(--ns-card-bg)]';

const PER_PAGE = 12;

const getProductImage = (product) => {
  const raw = product.rawProductData || product.raw_product_data || {};
  return (
    product.image_url ||
    raw.image_front_small_url ||
    raw.image_front_url ||
    raw.image_small_url ||
    raw.image_url ||
    null
  );
};

export default function FoodDatabase({ onSelectProduct }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  /* The query is what the results were actually fetched for. Paging resets on
     that rather than on `searchTerm`, so the page does not jump back to 1 on
     every keystroke while the debounce is still pending. */
  const [activeQuery, setActiveQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadProducts = async () => {
      setIsLoading(true);
      setError('');

      try {
        const trimmed = searchTerm.trim();
        const query = trimmed ? `?search=${encodeURIComponent(trimmed)}` : '';
        const response = await fetch(`${API}/scans/database${query}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Failed to load products');
        const data = await response.json();
        if (isMounted) {
          setProducts(Array.isArray(data) ? data : []);
          setActiveQuery(trimmed);
        }
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          console.error(loadError);
          if (isMounted) setError(t('could_not_load'));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadProducts, searchTerm ? 650 : 0);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchTerm, t]);

  const { page, totalPages, pageItems, setPage, from, to, total } = usePagination(
    products,
    PER_PAGE,
    activeQuery
  );

  /* Paging is a jump, not a scroll, so the new first row has to be brought into
     view or the user lands mid-list on a long page. */
  const handlePageChange = (next) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    /* No back button and no bespoke header: Food Database is reached from the
       dashboard's Explore row and the shell renders the page name already. */
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-5 pb-8 sm:px-6 sm:pt-6 lg:gap-6">
      {/* Search is the whole point of this page, so it is the first thing in the
          layout rather than sitting under a decorative hero block. */}
      <div className={`${CARD} flex items-center gap-2 px-3`}>
        <Search size={18} className="shrink-0 text-[var(--ns-outline)]" aria-hidden="true" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t('search_scanned_product')}
          aria-label={t('search_scanned_product')}
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

      {/* Result count as a plain line of text. It used to be a hero card with a
          sparkle icon and a paragraph of marketing copy, which took the space
          where the first results should be. */}
      {!isLoading && !error && total > 0 && (
        <p className="num-tabular -mb-1 text-xs font-medium text-[var(--ns-on-surface-var)]">
          {totalPages > 1
            ? t('showing_range', 'Showing {{from}}-{{to}} of {{total}}', { from, to, total })
            : t('result_count', '{{count}} products', { count: total })}
        </p>
      )}

      {error && (
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
      )}

      {isLoading ? (
        /* Skeletons match the real card's height, so the list does not jump when
           results land. */
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className={`${CARD} h-[76px] animate-pulse bg-[var(--ns-surface-low)]`}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : pageItems.length ? (
        <>
          {/* Up to three columns on desktop: these cards are short, so a single
              column left most of a wide window empty. */}
          <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {pageItems.map((product) => {
              const image = getProductImage(product);
              const score = product.latest_score;

              return (
                <li key={`${product.brands}-${product.product_name}-${product.id}`} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className={`${CARD} flex w-full min-w-0 items-center gap-3 p-3 text-left transition hover:border-[color-mix(in_srgb,var(--ns-primary)_40%,transparent)] active:scale-[0.99]`}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-lg edge-hairline object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-lg edge-hairline bg-[var(--ns-surface-low)] text-[var(--ns-outline)]"
                      >
                        <Utensils size={18} />
                      </span>
                    )}

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <strong className="truncate text-sm font-bold text-[var(--ns-on-surface)]">
                        {product.product_name || t('unknown_product')}
                      </strong>
                      <span className="truncate text-xs text-[var(--ns-on-surface-var)]">
                        {product.brands || t('unknown_brand')}
                      </span>
                    </span>

                    {/* A scored product shows its score; a web result says so.
                        These are different kinds of value, so they do not share
                        one badge style. */}
                    {score ? (
                      <span className="num-tabular grid h-9 min-w-9 shrink-0 place-items-center rounded-lg edge-hairline bg-[color-mix(in_srgb,var(--ns-primary)_12%,transparent)] px-1.5 font-[var(--font-headline)] text-sm font-bold text-ns-primary-con">
                        {score}
                      </span>
                    ) : (
                      <span className="grid h-9 shrink-0 place-items-center rounded-lg edge-hairline bg-[var(--ns-surface-low)] px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ns-outline)]">
                        {t('web', 'Web')}
                      </span>
                    )}
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
        /* Dashed hairline reads as "nothing here" rather than a real surface. */
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--edge-hairline)] bg-[var(--ns-card-bg)] px-4 py-10 text-center">
          <Database size={32} className="text-[var(--ns-outline)]" aria-hidden="true" />
          <p className="font-bold text-[var(--ns-on-surface)]">{t('no_products_found_db')}</p>
          <p className="max-w-xs text-sm text-[var(--ns-on-surface-var)]">
            {t('try_another_search')}
          </p>
        </div>
      )}
    </div>
  );
}
