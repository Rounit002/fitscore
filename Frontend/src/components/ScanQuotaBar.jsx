import React, { useState, useEffect } from 'react';
import { API } from '../api/client.js';

export default function ScanQuotaBar({ onQuotaChecked, refreshTrigger }) {
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchQuota = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/user/scan-quota`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {
          if (res.status === 401) {
            setError('unauthorized');
            return;
          }
          throw new Error('Failed to fetch scan quota');
        }
        const data = await res.json();
        setQuota(data);
        if (onQuotaChecked) onQuotaChecked(data);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchQuota();
    return () => controller.abort();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="w-full bg-neutral-100 dark:bg-neutral-800 animate-pulse h-8 rounded-lg mb-4 flex items-center justify-between px-3 text-xs text-neutral-400">
        <span>Loading quota...</span>
        <div className="w-1/3 bg-neutral-200 dark:bg-neutral-700 h-2.5 rounded-full" />
      </div>
    );
  }

  if (error === 'unauthorized' || !quota) return null;

  const used = quota.used ?? 0;
  const limit = quota.limit ?? 5;
  const remaining = Math.max(0, limit - used);
  const percent = Math.min(100, (remaining / limit) * 100);

  // Color logic: Green >50%, Amber 20-50%, Red <20%
  let barColorClass = 'bg-emerald-500';
  let badgeColorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
  let warningMessage = null;

  if (percent < 20) {
    barColorClass = 'bg-rose-500';
    badgeColorClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
    warningMessage = 'âš ï¸ Quota running critically low!';
  } else if (percent <= 50) {
    barColorClass = 'bg-amber-500';
    badgeColorClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
  }

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Scan Quota</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badgeColorClass}`}>
            {quota.plan || 'Free'} Plan
          </span>
        </div>
        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
          {remaining} / {limit} scans left
        </span>
      </div>
      <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {warningMessage && (
        <div className="mt-2 text-[10px] font-medium text-rose-500 flex items-center gap-1 animate-pulse">
          {warningMessage}
        </div>
      )}
    </div>
  );
}
