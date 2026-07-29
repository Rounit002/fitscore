import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home as HomeIcon, Camera, History as HistoryIcon, BarChart2, User } from 'lucide-react';

/* Four tabs in the pill; scanning is the detached round action beside it, so it
   is not a tab and does not take a slot. */
const NAV_ITEMS = [
  { view: 'dashboard', path: '/dashboard', icon: HomeIcon,    labelKey: 'home',        fallback: 'Home' },
  { view: 'history',   path: '/history',   icon: HistoryIcon, labelKey: 'history',     fallback: 'History' },
  { view: 'trends',    path: '/trends',    icon: BarChart2,   labelKey: 'nav_progress', fallback: 'Progress' },
  { view: 'profile',   path: '/profile',   icon: User,        labelKey: 'profile',     fallback: 'Profile', isAvatar: true },
];

const SCAN = { view: 'home', path: '/scan' };

export default function MobileBottomNav({ onNavigate, initials }) {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const scanActive = isActive(SCAN.path);

  return (
    /* The bar itself takes no pointer events, so the gap between the pill and the
       round button stays a hole through to the page rather than an invisible
       strip that eats taps on whatever sits underneath. */
    <nav className="ns-bnav lg:hidden" aria-label={t('mobile_navigation', 'Mobile navigation')}>
      <ul className="ns-bnav-pill">
        {NAV_ITEMS.map(({ view, path, icon: Icon, labelKey, fallback, isAvatar }) => {
          const active = isActive(path);
          const label = t(labelKey, fallback);

          return (
            <li key={view} className="ns-bnav-item">
              <button
                type="button"
                className="ns-bnav-tab"
                data-active={active || undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(view)}
              >
                <span className="ns-bnav-puck" aria-hidden="true">
                  {/* The profile tab carries the user's initials instead of a
                      generic glyph, which is the one place in the bar where the
                      icon is about a specific person rather than a section.
                      Nav icon context = 22 (TOKENS 7). Stroke weight, not size,
                      carries the active state, so the glyph does not shift by a
                      subpixel when a tab is selected. */}
                  {isAvatar && initials ? (
                    <span className="ns-bnav-initials">{initials}</span>
                  ) : (
                    <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  )}
                </span>
                <span className="ns-bnav-label">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Scan is the app's persistent primary action, so it keeps the highlighted
          edge and floating elevation that lift it clear of the pill. */}
      <button
        type="button"
        className="ns-bnav-fab"
        data-active={scanActive || undefined}
        aria-label={t('scan_product', 'Scan product')}
        aria-current={scanActive ? 'page' : undefined}
        onClick={() => onNavigate(SCAN.view)}
      >
        <Camera size={26} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </nav>
  );
}
