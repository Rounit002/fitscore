import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import Home from './components/Home';
import Results from './components/Results';
import Profile from './components/Profile';
import History from './components/History';
import Compare from './components/Compare';
import LoadingState from './components/LoadingState';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import BarcodeScanner from './components/BarcodeScanner';
import StreakLeaderboard from './components/StreakLeaderboard';
import FeatureRequests from './components/FeatureRequests';
import FoodDatabase from './components/FoodDatabase';
import Trends from './components/Trends';
import { analyzeFoodImage, analyzeFoodText } from './geminiService';
import { useTheme } from './components/ThemeToggle';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Apple,
  BarChart2,
  Bell,
  Camera,
  Database,
  History as HistoryIcon,
  Home as HomeIcon,
  LogOut,
  Search,
  Trophy,
  User,
} from 'lucide-react';
import { API } from './api/client.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import { RevenueCatProvider } from './context/RevenueCatContext.jsx';
import Paywall from './components/Paywall.jsx';

// Map view name keys (used throughout the app) ↔ URL paths
const VIEW_TO_PATH = {
  dashboard: '/dashboard',
  home: '/scan',
  barcode: '/scan/barcode',
  history: '/history',
  compare: '/compare',
  foodDatabase: '/food-database',
  trends: '/trends',
  streak: '/leaderboard',
  profile: '/profile',
  features: '/features',
  results: '/results',
};

const PATH_TO_VIEW = Object.fromEntries(
  Object.entries(VIEW_TO_PATH).map(([k, v]) => [v, k])
);

const shellTitles = {
  dashboard: 'home',
  home: 'scan_product',
  barcode: 'barcode',
  history: 'history',
  compare: 'compare_title',
  foodDatabase: 'food_db_title',
  trends: 'health_progress',
  streak: 'leaderboard',
  profile: 'profile',
  features: 'feature_requests',
  results: 'nutrition_analysis',
};

const shellNavigation = [
  { view: 'dashboard', translationKey: 'home', icon: HomeIcon },
  { view: 'home', translationKey: 'scan', icon: Camera },
  { view: 'history', translationKey: 'history', icon: HistoryIcon },
  { view: 'compare', translationKey: 'compare', icon: BarChart2 },
  { view: 'foodDatabase', translationKey: 'food_db_title', icon: Database },
  { view: 'trends', translationKey: 'health_progress', icon: Activity },
  { view: 'streak', translationKey: 'leaderboard', icon: Trophy },
  { view: 'profile', translationKey: 'profile', icon: User },
];

// DesktopAppShell is now a React Router layout route.
// It uses <Outlet /> where {children} used to be and derives the active nav
// item from the current URL via useLocation() instead of a currentView prop.
function DesktopAppShell({ userAuth, userProfile, onNavigate, onLogout }) {
  const { t } = useTranslation();
  const location = useLocation();

  // Redirect to login if session has expired or cookie is missing
  if (!userAuth) return <Navigate to="/login" replace />;

  const currentView = PATH_TO_VIEW[location.pathname] || 'dashboard';

  const displayName = userAuth?.name || userProfile?.name || 'FitScan User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'FS';
  const quotaUsed = Number(userAuth?.scansUsed ?? userAuth?.scanCount ?? userAuth?.scans_used ?? 0);
  const quotaLimit = userAuth?.isPremium ? '∞' : Number(userAuth?.scanLimit ?? userAuth?.scan_limit ?? 20);
  const quotaPercent = userAuth?.isPremium ? 100 : Math.max(0, Math.min((quotaUsed / quotaLimit) * 100, 100));

  return (
    <div className="fitscan-app-shell lg:flex">
      <aside className="fitscan-app-sidebar hidden lg:flex" aria-label="Desktop navigation">
        <div className="fitscan-app-brand">
          <span className="fitscan-app-brand-mark"><Apple size={20} /></span>
          <strong>Fit<span>Scan</span></strong>
        </div>

        <nav className="fitscan-app-sidebar-nav">
          {shellNavigation.map(({ view, translationKey, icon: Icon }) => (
            <button
              key={view}
              type="button"
              className={`sidebar-nav-link${currentView === view ? ' active' : ''}`}
              onClick={() => onNavigate(view)}
            >
              <Icon size={20} />
              <span>{t(translationKey)}</span>
            </button>
          ))}
        </nav>

        <div className="fitscan-app-user-card">
          <div className="fitscan-app-user-row">
            <span className="fitscan-app-avatar">{initials}</span>
            <span>
              <strong>{displayName}</strong>
              <em>{userAuth?.isPremium ? t('premium_plan', 'Premium plan') : t('free_plan', 'Free plan')}</em>
            </span>
          </div>
          <div className="fitscan-app-quota">
            <span>
              {userAuth?.isPremium
                ? t('unlimited_scans', 'Unlimited scans')
                : t('quota_scans', '{{used}} / {{limit}} scans', { used: quotaUsed, limit: quotaLimit })
              }
            </span>
            <i><b style={{ width: `${quotaPercent}%` }} /></i>
          </div>
          {!userAuth?.isPremium && (
            <button type="button" className="fitscan-app-upgrade" onClick={() => onNavigate('profile')}>
              {t('upgrade')}
            </button>
          )}
          <button type="button" className="fitscan-app-logout" onClick={onLogout}>
            <LogOut size={16} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      <div className="fitscan-app-content">
        {/* Desktop header */}
        <header className="top-header hidden lg:flex">
          <div className="fitscan-app-title">
            <span>{t(shellTitles[currentView]) || 'FitScan'}</span>
          </div>
          <div className="fitscan-header-quota" aria-label="Scan quota">
            <Search size={15} />
            <span>
              {userAuth?.isPremium
                ? t('unlimited_scans', 'Unlimited scans')
                : t('quota_scans_compact', '{{used}}/{{limit}} scans', { used: quotaUsed, limit: quotaLimit })
              }
            </span>
            <i><b style={{ width: `${quotaPercent}%` }} /></i>
          </div>
          <div className="fitscan-header-actions">
            <button type="button" aria-label="Notifications"><Bell size={18} /></button>
            <button type="button" className="fitscan-header-avatar" onClick={() => onNavigate('profile')}>
              {initials}
            </button>
          </div>
        </header>

        {/* Mobile header */}
        <header
          className="top-header flex lg:hidden"
          style={{ padding: '0 16px', height: 56, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ns-on-surface)', fontFamily: 'var(--font-headline)' }}>
              {t(shellTitles[currentView]) || 'FitScan'}
            </span>
          </div>
          <button
            type="button"
            className="fitscan-header-avatar"
            onClick={() => onNavigate('profile')}
            aria-label={t('profile')}
            style={{ width: 34, height: 34, fontSize: '0.75rem' }}
          >
            {initials}
          </button>
        </header>

        <main className="fitscan-app-main" style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Persistent mobile bottom navigation */}
        <MobileBottomNav onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export default function App() {
  const { t, i18n } = useTranslation();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Manage RTL/LTR document direction and lang attributes
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      const isRtl = lng === 'ar' || lng === 'ur';
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
      if (isRtl) {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    handleLanguageChange(i18n.resolvedLanguage || i18n.language || 'en');

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // isRestoring: only true when there is NO cached auth (first visit / after logout).
  // Returning users with a valid nutriscan_auth cache skip the splash entirely.
  const [isRestoring, setIsRestoring] = useState(() => !localStorage.getItem('nutriscan_auth'));
  // isLoading: true while an AI scan job is running (global overlay)
  const [isLoading, setIsLoading] = useState(false);
  // elapsedSeconds: seconds since current scan started (drives LoadingState UI)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Holds the AbortController for the active scan so the user can cancel it
  const scanAbortRef = useRef(null);
  const elapsedTimerRef = useRef(null);

  const startElapsedTimer = () => {
    setElapsedSeconds(0);
    elapsedTimerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  };

  const stopElapsedTimer = () => {
    clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
    setElapsedSeconds(0);
  };

  const handleCancelScan = () => {
    scanAbortRef.current?.abort();
    scanAbortRef.current = null;
    stopElapsedTimer();
    setIsLoading(false);
    navigate('/scan');
  };

  // Initialise both userAuth and userProfile from localStorage so returning
  // users skip the splash screen entirely on refresh.
  const [userAuth, setUserAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('nutriscan_auth');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // authToken is kept as null — the actual JWT lives in the HttpOnly cookie.
  // It's passed as a prop to child components for legacy compatibility but is unused for auth.
  const [authToken] = useState(null);
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('nutriscan_profile');
      return saved && saved !== "undefined" ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [pendingSignUp, setPendingSignUp] = useState(null);

  useEffect(() => {
    const updateHeaderShadow = () => {
      document
        .querySelectorAll('.top-header')
        .forEach((header) => header.classList.toggle('scrolled', window.scrollY > 10));
    };

    updateHeaderShadow();
    window.addEventListener('scroll', updateHeaderShadow, { passive: true });
    return () => window.removeEventListener('scroll', updateHeaderShadow);
  }, []);

  // Silently validate the session cookie on every mount.
  // - If cache existed: update state with fresh server data (no navigation needed).
  // - If no cache: this was the splash path — navigate after resolving.
  // - On failure: clear cache and redirect to /login.
  useEffect(() => {
    const hadCache = !!localStorage.getItem('nutriscan_auth');

    async function restoreSession() {
      try {
        const response = await fetch(`${API}/auth/me`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUserAuth(data.user);
          setUserProfile(data.user.profile);
          localStorage.setItem('nutriscan_auth', JSON.stringify(data.user));
          localStorage.setItem('nutriscan_profile', JSON.stringify(data.user.profile));
          // Only navigate when the splash was shown (no prior cache).
          // Returning users are already on the correct route.
          if (!hadCache) {
            navigate(data.user.profile ? '/dashboard' : '/onboarding', { replace: true });
          }
        } else {
          localStorage.removeItem('nutriscan_auth');
          localStorage.removeItem('nutriscan_profile');
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('nutriscan_auth');
        localStorage.removeItem('nutriscan_profile');
        navigate('/login', { replace: true });
      } finally {
        setIsRestoring(false);
      }
    }
    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Translate a view name key (e.g. 'dashboard') to a URL path and navigate
  const handleNavigate = (view) => {
    const path = VIEW_TO_PATH[view];
    if (path) navigate(path);
  };

  const handleLogin = (user, _token, deletionCancelled = false) => {
    setUserAuth(user);
    setUserProfile(user.profile);
    localStorage.setItem('nutriscan_auth', JSON.stringify(user));
    localStorage.setItem('nutriscan_profile', JSON.stringify(user.profile));
    navigate(user.profile ? '/dashboard' : '/onboarding', { replace: true });

    if (deletionCancelled) {
      setInfo("Welcome back! Your account deletion request has been cancelled, and your data is safe.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // cookie will expire naturally
    }
    setUserAuth(null);
    setUserProfile(null);
    setPendingSignUp(null);
    localStorage.removeItem('nutriscan_auth');
    localStorage.removeItem('nutriscan_profile');
    navigate('/login', { replace: true });
  };

  const handleSignUpPending = (data) => {
    setPendingSignUp(data);
    navigate('/onboarding');
  };

  const handleOnboardingComplete = async (profile) => {
    setUserProfile(profile);
    localStorage.setItem('nutriscan_profile', JSON.stringify(profile));

    try {
      await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ profile }),
      });
    } catch (err) {
      console.error('Failed to save profile to server:', err);
    }
    navigate('/dashboard', { replace: true });
  };

  const refreshStreak = async () => {
    try {
      const response = await fetch(`${API}/auth/me`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUserAuth(data.user);
        localStorage.setItem('nutriscan_auth', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Failed to refresh streak:', err);
    }
  };

  const handleUserDetailsUpdated = (updatedUser) => {
    if (!updatedUser) return;
    setUserAuth(updatedUser);
    setUserProfile(updatedUser.profile);
    localStorage.setItem('nutriscan_auth', JSON.stringify(updatedUser));
    localStorage.setItem('nutriscan_profile', JSON.stringify(updatedUser.profile));
  };

  // Called by RevenueCatProvider when the native premium entitlement flips.
  // Mirrors the value into userAuth so the rest of the app (quota, badges,
  // Profile screen) reacts immediately, and persists it for refreshes.
  const handlePremiumChange = (isPremium) => {
    setUserAuth((prev) => {
      if (!prev || prev.isPremium === isPremium) return prev;
      const next = { ...prev, isPremium };
      localStorage.setItem('nutriscan_auth', JSON.stringify(next));
      return next;
    });
  };

  // Shared helper: persist a completed scan to the backend
  const saveScan = async (payload) => {
    try {
      const saveResponse = await fetch(`${API}/scans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (saveResponse.ok) {
        const savedScan = await saveResponse.json();
        setAnalysisResult((prev) =>
          prev ? { ...prev, scanId: savedScan.id, servings: savedScan.servings || 1 } : prev
        );
      }
    } catch (err) {
      console.error('Failed to save scan:', err);
    }
    refreshStreak();
  };

  const handleImageSelected = async (imageBase64) => {
    const controller = new AbortController();
    scanAbortRef.current = controller;
    setIsLoading(true);
    setError(null);
    startElapsedTimer();
    try {
      const result = await analyzeFoodImage(imageBase64, userProfile, controller.signal);
      setAnalysisResult(result);
      navigate('/results');
      await saveScan({
        productName: result.productName,
        brand: result.brand,
        score: result.score,
        verdict: JSON.stringify(result.verdict),
        explanation: '',
        ingredients: JSON.stringify(result.ingredientsAnalysis),
        alternatives: result.alternatives,
        sideEffects: result.sideEffects,
        imageUrl: imageBase64,
        productData: {
          product_name: result.productName,
          brands: result.brand,
          ingredients_text: result.ingredientsAnalysis?.map((item) => item.name).join(', ') || '',
          serving_size: result.nutrition?.serving_size || result.nutriments?.serving_size || null,
          serving_quantity: result.nutrition?.serving_quantity || result.nutriments?.serving_quantity || null,
          nutriments: result.nutriments || result.nutrition || null,
        },
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setError(err.message || "Analysis failed. Gemini might be busy. Try again!");
      navigate('/scan');
    } finally {
      stopElapsedTimer();
      setIsLoading(false);
    }
  };

  const handleBarcodeScanned = async (barcode) => {
    const controller = new AbortController();
    scanAbortRef.current = controller;
    setIsLoading(true);
    setError(null);
    startElapsedTimer();
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1) {
        const productImageUrl =
          data.product?.image_front_small_url ||
          data.product?.image_front_url ||
          data.product?.image_url ||
          null;

        const result = await analyzeFoodText(data.product, userProfile, controller.signal);
        const enrichedResult = {
          ...result,
          nutriments: result.nutriments || result.nutrition || data.product?.nutriments || null,
          nutrition: result.nutrition || result.nutriments || data.product?.nutriments || null,
          rawProductData: data.product,
        };
        setAnalysisResult(enrichedResult);
        navigate('/results');
        await saveScan({
          productName: enrichedResult.productName,
          brand: enrichedResult.brand,
          score: enrichedResult.score,
          verdict: JSON.stringify(enrichedResult.verdict),
          explanation: '',
          ingredients: JSON.stringify(enrichedResult.ingredientsAnalysis),
          alternatives: enrichedResult.alternatives,
          sideEffects: enrichedResult.sideEffects,
          imageUrl: productImageUrl,
          productData: data.product,
        });
      } else {
        throw new Error("Product not found.");
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      const msg =
        err.message?.includes('Rate limited') || err.message?.includes('wait')
          ? err.message
          : "Product scan failed. Try a photo instead!";
      setError(msg);
      navigate('/scan');
    } finally {
      stopElapsedTimer();
      setIsLoading(false);
    }
  };

  const handleDatabaseProductSelected = async (product) => {
    const controller = new AbortController();
    scanAbortRef.current = controller;
    setIsLoading(true);
    setError(null);
    startElapsedTimer();
    try {
      const productImageUrl =
        product?.image_front_small_url ||
        product?.image_front_url ||
        product?.image_url ||
        null;

      const productData = product.rawProductData || product;
      const result = await analyzeFoodText(productData, userProfile, controller.signal);
      const enrichedResult = {
        ...result,
        nutriments: result.nutriments || result.nutrition || productData?.nutriments || null,
        nutrition: result.nutrition || result.nutriments || productData?.nutriments || null,
        rawProductData: productData,
      };
      setAnalysisResult(enrichedResult);
      navigate('/results');
      await saveScan({
        productName: enrichedResult.productName,
        brand: enrichedResult.brand,
        score: enrichedResult.score,
        verdict: JSON.stringify(enrichedResult.verdict),
        explanation: '',
        ingredients: JSON.stringify(enrichedResult.ingredientsAnalysis),
        alternatives: enrichedResult.alternatives,
        sideEffects: enrichedResult.sideEffects,
        imageUrl: productImageUrl,
        productData,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      const msg =
        err.message?.includes('Rate limited') || err.message?.includes('wait')
          ? err.message
          : "Product analysis failed. Try another product!";
      setError(msg);
      navigate('/food-database');
    } finally {
      stopElapsedTimer();
      setIsLoading(false);
    }
  };

  // Show splash while the session cookie is being validated
  if (isRestoring) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-6 animate-fade-in-up"
        style={{ background: 'var(--ns-surface)' }}
      >
        <div
          className="w-20 h-20 rounded-[24px] flex items-center justify-center"
          style={{ background: '#10B981', boxShadow: '0 12px 40px rgba(16, 185, 129,0.38)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white">
            <path d="M17 8C8 10 5.9 16.17 3.82 19.17C5 21 7 21 8 21C8 21 10 18 12 16C16 15 19 13 20 9L17 8Z" />
            <path d="M8.5 11.5C10.5 8.5 15 6 19 7C19 7 19 11 16 13C13 15 10 15 8 17C8 17 6.5 13.5 8.5 11.5Z" opacity="0.6" />
          </svg>
        </div>
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid var(--ns-surface-high)', borderTopColor: 'var(--ns-primary)' }}
        />
        <p className="text-sm font-medium" style={{ color: 'var(--ns-outline)', fontFamily: 'var(--font-main)' }}>
          Loading NutriScan...
        </p>
      </div>
    );
  }

  const shellProps = {
    userAuth,
    userProfile,
    onNavigate: handleNavigate,
    onLogout: handleLogout,
  };

  return (
    <RevenueCatProvider user={userAuth} onPremiumChange={handlePremiumChange}>
    <main id="root" className="animate-fade-in">
      {/* Global error toast */}
      {error && (
        <div className="fixed top-6 left-6 right-6 z-[200] animate-streak-pop">
          <div className="bg-error/90 backdrop-blur-xl text-white p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex justify-between items-center shadow-2xl">
            <span>{t(error)}</span>
            <button
              className="bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Global info / success toast */}
      {info && (
        <div className="fixed top-6 left-6 right-6 z-[200] animate-streak-pop">
          <div className="bg-[#5BAD4E]/90 backdrop-blur-xl text-white p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex justify-between items-center shadow-2xl">
            <span>{info}</span>
            <button
              className="bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
              onClick={() => setInfo(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Global scan-in-progress overlay */}
      {isLoading && <LoadingState elapsedSeconds={elapsedSeconds} onCancel={handleCancelScan} />}

      <Routes>
        {/* ── Public routes ── */}
        <Route
          path="/login"
          element={
            userAuth ? <Navigate to="/dashboard" replace /> :
            <Login onLogin={handleLogin} onNavigateSignup={() => navigate('/signup')} />
          }
        />
        <Route
          path="/signup"
          element={
            userAuth ? <Navigate to="/dashboard" replace /> :
            <SignUp
              onLogin={handleLogin}
              onNavigateLogin={() => navigate('/login')}
              onSignUpPending={handleSignUpPending}
            />
          }
        />
        <Route
          path="/onboarding"
          element={
            <Onboarding
              onComplete={handleOnboardingComplete}
              initialProfile={userProfile}
              authToken={authToken}
              pendingSignUp={pendingSignUp}
              onLogin={handleLogin}
              onBack={() => {
                if (pendingSignUp) {
                  setPendingSignUp(null);
                  navigate('/signup');
                } else if (userProfile) {
                  navigate('/profile');
                } else {
                  handleLogout();
                }
              }}
            />
          }
        />

        {/* ── Protected routes — rendered inside DesktopAppShell layout ── */}
        <Route element={<DesktopAppShell {...shellProps} />}>
          <Route
            path="/dashboard"
            element={
              <Dashboard
                userAuth={userAuth}
                userProfile={userProfile}
                authToken={authToken}
                onNavigate={handleNavigate}
                onViewDetail={(result) => { setAnalysisResult(result); navigate('/results'); }}
                isDark={isDark}
                toggleTheme={toggleTheme}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/scan"
            element={
              <Home
                onImageSelected={handleImageSelected}
                onNavigateProfile={() => navigate('/profile')}
                onBack={() => navigate('/dashboard')}
                onNavigateBarcode={() => navigate('/scan/barcode')}
                onNavigateHistory={() => navigate('/history')}
              />
            }
          />
          <Route
            path="/scan/barcode"
            element={<BarcodeScanner onScan={handleBarcodeScanned} onBack={() => navigate('/scan')} />}
          />
          <Route
            path="/history"
            element={
              <History
                authToken={authToken}
                onBack={() => navigate('/dashboard')}
                onViewDetail={(result) => { setAnalysisResult(result); navigate('/results'); }}
              />
            }
          />
          <Route
            path="/compare"
            element={<Compare authToken={authToken} onBack={() => navigate('/dashboard')} />}
          />
          <Route
            path="/food-database"
            element={
              <FoodDatabase
                authToken={authToken}
                onBack={() => navigate('/dashboard')}
                onSelectProduct={handleDatabaseProductSelected}
              />
            }
          />
          <Route
            path="/trends"
            element={<Trends authToken={authToken} onNavigate={handleNavigate} />}
          />
          <Route
            path="/leaderboard"
            element={
              <StreakLeaderboard userAuth={userAuth} authToken={authToken} onBack={() => navigate('/dashboard')} />
            }
          />
          <Route
            path="/profile"
            element={
              <Profile
                userProfile={userProfile}
                userAuth={userAuth}
                authToken={authToken}
                onBack={() => navigate('/dashboard')}
                onDelete={handleLogout}
                onLogout={handleLogout}
                onDetailsSaved={handleUserDetailsUpdated}
                onNavigateFeatures={() => navigate('/features')}
                isDark={isDark}
                toggleTheme={toggleTheme}
              />
            }
          />
          <Route
            path="/features"
            element={
              <FeatureRequests userAuth={userAuth} authToken={authToken} onBack={() => navigate('/profile')} />
            }
          />
          <Route
            path="/results"
            element={
              analysisResult ? (
                <Results
                  result={analysisResult}
                  onBack={() => { setAnalysisResult(null); navigate('/dashboard'); }}
                  authToken={authToken}
                  onServingsChanged={(_scanId, newServings) => {
                    setAnalysisResult((prev) => prev ? { ...prev, servings: newServings } : prev);
                  }}
                />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
        </Route>

        {/* ── Fallback redirects ── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Global premium paywall — opened via useRevenueCat().openPaywall() */}
      <Paywall />
    </main>
    </RevenueCatProvider>
  );
}
