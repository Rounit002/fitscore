/* Calendar date helpers.
   These were previously duplicated inside Dashboard.jsx; the calendar strip
   needs the same arithmetic, so they live here as one shared source. All of
   them operate on local time (the scan list is displayed in local time) and
   never mutate their argument. */

export const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toMonthKey = (date) => toDateKey(date).slice(0, 7);

export const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const startOfWeek = (date) => {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
};

export const endOfWeek = (date) => addDays(startOfWeek(date), 6);

export const monthKeyToDate = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

/* Whole days between two dates, ignoring the time component. Positive when
   `b` is later than `a`. */
export const diffInDays = (a, b) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);

export const isSameDay = (a, b) => toDateKey(a) === toDateKey(b);

export const clampDate = (date, min, max) => {
  if (min && date < min) return new Date(min);
  if (max && date > max) return new Date(max);
  return new Date(date);
};
