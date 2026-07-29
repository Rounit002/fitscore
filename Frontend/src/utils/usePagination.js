import { useMemo, useState } from 'react';

/* Paginates a list in memory and keeps the page number valid.

   Two things go wrong with a plain `useState(1)` page index:

   1. The list shrinks (a search narrows results, an item is deleted) and the
      index is left pointing past the end, so the user sees an empty page.
   2. A new query arrives while the user is on page 4, and the matches — which
      are all on page 1 — look like "no results".

   Both are fixed by deriving the effective page during render instead of
   correcting it in an effect afterwards: the page is stored alongside the
   `resetKey` it was chosen under, so when that key changes the stored value
   stops applying and the page falls back to 1. No cascading re-render, and no
   frame where the page is out of range.

   `resetKey` is any value whose change should return the user to page 1,
   typically the active search query or filter. */
export default function usePagination(items, perPage, resetKey) {
  const [pageState, setPageState] = useState({ page: 1, key: resetKey });

  const list = Array.isArray(items) ? items : [];
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));

  /* Clamp rather than reset when the list merely shrinks: the nearest valid page
     is closer to what the user was looking at than page 1 is. */
  const page =
    pageState.key === resetKey ? Math.min(Math.max(1, pageState.page), totalPages) : 1;

  const setPage = (next) => {
    setPageState({ page: Math.max(1, Math.min(totalPages, next)), key: resetKey });
  };

  const pageItems = useMemo(
    () => list.slice((page - 1) * perPage, page * perPage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, page, perPage]
  );

  return {
    page,
    totalPages,
    pageItems,
    setPage,
    /* Range of the visible slice, for "showing 1-12 of 42" summaries. */
    from: list.length === 0 ? 0 : (page - 1) * perPage + 1,
    to: Math.min(page * perPage, list.length),
    total: list.length,
  };
}
