/**
 * SplashScreen — the first thing a cold start paints.
 *
 * Deliberately mirrors the native Android splash declared in mobile/config.xml
 * (AndroidWindowSplashScreenAnimatedIcon + AndroidWindowSplashScreenBackground)
 * so the handover from the system splash to React's first paint reads as one
 * continuous screen rather than two differently-branded ones: same mark, same
 * surface colour, then the wordmark.
 *
 * The mark is the generated PWA icon rather than an inline glyph so the logo has
 * a single source of record — resources/icon.png, rasterised by
 * `npm run gen:res` in mobile/.
 *
 * The `/icons/...` path is absolute on purpose. It resolves for both builds: the
 * web build is served from the origin root, and the Cordova shell serves the
 * bundle from https://localhost/ (config.xml scheme/hostname), so a
 * base-relative URL would break on any deep route while an absolute one won't.
 */
import BrandLogo from './BrandLogo.jsx';

export const BRAND_NAME = 'bitezsnap';

export default function SplashScreen() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-5 animate-fade-in-up"
      style={{ background: 'var(--ns-surface)' }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <BrandLogo
        alt=""
        width="96"
        height="96"
        className="w-24 h-24 object-contain"
        decoding="async"
        fetchPriority="high"
      />
      <p
        className="text-2xl font-black tracking-tight"
        style={{ color: 'var(--ns-on-surface)', fontFamily: 'var(--font-main)' }}
      >
        {BRAND_NAME}
      </p>
      <div
        className="w-8 h-8 rounded-full animate-spin"
        style={{ border: '3px solid var(--ns-surface-high)', borderTopColor: 'var(--ns-primary)' }}
      />
      <p className="text-sm font-medium" style={{ color: 'var(--ns-outline)', fontFamily: 'var(--font-main)' }}>
        Loading {BRAND_NAME}...
      </p>
    </div>
  );
}
