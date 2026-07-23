import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home as HomeIcon, Camera, History as HistoryIcon, TrendingUp, User } from 'lucide-react';

const NAV_ITEMS = [
  { view: 'dashboard', path: '/dashboard', icon: HomeIcon,    labelKey: 'home' },
  { view: 'history',   path: '/history',   icon: HistoryIcon, labelKey: 'history' },
  { view: 'home',      path: '/scan',      icon: Camera,      labelKey: 'scan', isScan: true },
  { view: 'trends',    path: '/trends',    icon: TrendingUp,  labelKey: 'health_progress' },
  { view: 'profile',   path: '/profile',   icon: User,        labelKey: 'profile' },
];

export default function MobileBottomNav({ onNavigate }) {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-end justify-center border-t border-[var(--ns-outline-var)] bg-[var(--ns-surface)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex w-full max-w-[480px] items-center px-2 pb-2 pt-1.5">
        {NAV_ITEMS.map(({ view, path, icon: Icon, labelKey, isScan }) => {
          const active = isActive(path);

          if (isScan) {
            return (
              <button
                key={view}
                type="button"
                aria-label={t('scan_product', 'Scan product')}
                onClick={() => onNavigate(view)}
                className="relative -mt-5 flex flex-1 flex-col items-center gap-1 bg-transparent px-1 py-0.5"
              >
                <span
                  className={[
                    'flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-white shadow-[0_6px_18px_rgba(16, 185, 129,0.4)]',
                    active ? 'bg-[#047857]' : 'bg-ns-primary',
                  ].join(' ')}
                >
                  <Icon size={24} />
                </span>
                <span
                  className={[
                    'text-[10px] leading-none font-[var(--font-main)]',
                    active ? 'font-bold text-ns-primary' : 'font-semibold text-[var(--ns-outline)]',
                  ].join(' ')}
                >
                  {t(labelKey)}
                </span>
              </button>
            );
          }

          return (
            <button
              key={view}
              type="button"
              aria-label={t(labelKey)}
              onClick={() => onNavigate(view)}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-transparent px-1 py-1.5"
            >
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-[10px]',
                  active ? 'bg-[rgba(16, 185, 129,0.12)]' : 'bg-transparent',
                ].join(' ')}
              >
                <Icon
                  size={20}
                  className={active ? 'text-ns-primary' : 'text-[var(--ns-outline)]'}
                />
              </span>
              <span
                className={[
                  'text-[10px] leading-none font-[var(--font-main)]',
                  active ? 'font-bold text-ns-primary' : 'font-medium text-[var(--ns-outline)]',
                ].join(' ')}
              >
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
