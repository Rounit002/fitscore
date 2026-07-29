import { useState } from 'react';
import {
  Home,
  ScanLine,
  History,
  GitCompareArrows,
  Database,
  Activity,
  Trophy,
  User,
  Search,
  Bell,
  Flame,
  Sun,
  Moon,
  Camera,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ *
 *  FitScan Ã¢â‚¬â€ Home dashboard (visual redesign)
 *  Self-contained + previewable. Placeholder data baked in.
 *  Drop-in: swap the placeholder arrays for your real props
 *  (userAuth, userProfile, scans, onNavigate, onViewDetailÃ¢â‚¬Â¦).
 * ------------------------------------------------------------------ */

/* ---------- Placeholder data (matches current screen) ---------- */
const USER = { name: 'Rounit', plan: 'PREMIUM PLAN', streak: 4, scansUsed: 0, scansLimit: Infinity };

const RECENT_SCANS = [
  {
    id: 1,
    name: 'Pintola Peanut Butter',
    brand: 'Pintola',
    score: 8,
    img: 'https://images.unsplash.com/photo-1612187209234-c5897a4d5b8c?q=80&w=200&auto=format&fit=crop',
    macros: { cal: 270, p: 10.5, c: 9, na: 8, f: 22.5 },
  },
  {
    id: 2,
    name: 'Sundrop Peanut Butter Creamy',
    brand: 'Sundrop',
    score: 6,
    img: 'https://images.unsplash.com/photo-1559656914-a30970c1affd?q=80&w=200&auto=format&fit=crop',
    macros: { cal: 288, p: 11.2, c: 9.6, na: 160, f: 24 },
  },
  {
    id: 3,
    name: 'Kurkure Masala Munch',
    brand: 'Kurkure',
    score: 2,
    img: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=200&auto=format&fit=crop',
    macros: { cal: 249, p: 3, c: 24, na: 450, f: 15 },
  },
];

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'scan', label: 'Scan', icon: ScanLine },
  { id: 'history', label: 'History', icon: History },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows },
  { id: 'foodDatabase', label: 'Food Database', icon: Database },
  { id: 'trends', label: 'Health Progress', icon: Activity },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: User },
];

/* ---------- June 2026 week strip (today = 17th) ---------- */
const WEEK = [
  { dow: 'Su', date: 14 },
  { dow: 'Mo', date: 15 },
  { dow: 'Tu', date: 16 },
  { dow: 'We', date: 17, today: true },
  { dow: 'Th', date: 18 },
  { dow: 'Fr', date: 19 },
  { dow: 'Sa', date: 20 },
];

/* ---------- Score to grade system ---------- */
const scoreMeta = (n) =>
  n >= 8
    ? { color: '#16A34A', soft: 'rgba(22,163,74,0.12)', label: 'Great' }
    : n >= 5
      ? { color: '#F59E0B', soft: 'rgba(245,158,11,0.14)', label: 'Fair' }
      : { color: '#EF4444', soft: 'rgba(239,68,68,0.12)', label: 'Poor' };

/* Macro display config + rough per-serving ceilings for the mini-bars */
const MACROS = [
  { key: 'cal', label: 'Cal', unit: '', max: 400, tint: '#047857' },
  { key: 'p', label: 'P', unit: 'g', max: 25, tint: '#16A34A' },
  { key: 'c', label: 'C', unit: 'g', max: 40, tint: '#0EA5E9' },
  { key: 'na', label: 'Na', unit: 'mg', max: 500, tint: '#8B5CF6' },
  { key: 'f', label: 'F', unit: 'g', max: 30, tint: '#10B981' },
];

/* ================================================================== */
/*  Small primitives                                                  */
/* ================================================================== */

function ScoreGauge({ score, size = 46 }) {
  const { color, label } = scoreMeta(score);
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 10) * circ;

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} title={`${label} Ã‚Â· ${score}/10`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fs-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 800ms cubic-bezier(.34,1.56,.64,1)', filter: `drop-shadow(0 0 4px ${color}55)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center leading-none">
        <span className="font-display text-[15px] font-extrabold" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

function MacroMiniBar({ label, value, unit, max, tint }) {
  const pct = Math.max(8, Math.min((value / max) * 100, 100));
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--fs-faint)]">{label}</span>
        <span className="font-display text-[11px] font-bold tabular-nums text-[var(--fs-ink)]">
          {value}
          <span className="text-[9px] font-semibold text-[var(--fs-faint)]">{unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--fs-track)]">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: tint, transition: 'width 700ms ease-out' }} />
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Recent scan card                                                  */
/* ================================================================== */

function ScanCard({ scan, onClick }) {
  const meta = scoreMeta(scan.score);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group fs-card relative flex w-full items-stretch gap-3.5 overflow-hidden p-3 text-left transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 sm:gap-4 sm:p-3.5"
    >
      {/* image with grade accent rail */}
      <div className="relative shrink-0">
        <span className="absolute -left-3 top-1/2 h-9 w-1 -translate-y-1/2 rounded-full" style={{ background: meta.color }} aria-hidden />
        <div className="h-[68px] w-[68px] overflow-hidden rounded-2xl ring-1 ring-black/5 sm:h-[76px] sm:w-[76px]" style={{ background: meta.soft }}>
          <img
            src={scan.img}
            alt={scan.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      </div>

      {/* body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2.5 py-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[14px] font-bold leading-tight text-[var(--fs-ink)]">{scan.name}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-[var(--fs-faint)]">
              {scan.brand}
              <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide" style={{ background: meta.soft, color: meta.color }}>
                {meta.label}
              </span>
            </p>
          </div>
          <ScoreGauge score={scan.score} />
        </div>

        {/* macro mini-bars */}
        <div className="flex items-end gap-2.5 sm:gap-3.5">
          {MACROS.map((m) => (
            <MacroMiniBar key={m.key} label={m.label} value={scan.macros[m.key]} unit={m.unit} max={m.max} tint={m.tint} />
          ))}
        </div>
      </div>
    </button>
  );
}

/* ================================================================== */
/*  Sidebar (tablet / desktop)                                        */
/* ================================================================== */

function Sidebar({ active, onNavigate }) {
  const pct = USER.scansLimit === Infinity ? 100 : (USER.scansUsed / USER.scansLimit) * 100;
  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[256px] shrink-0 flex-col border-r border-[var(--fs-border)] bg-[var(--fs-elevated)]/80 px-4 py-5 backdrop-blur-xl lg:flex">
      {/* brand */}
      <div className="mb-7 flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#10B981] text-white shadow-lg shadow-emerald-500/30">
          <ScanLine size={19} />
        </span>
        <span className="font-display text-lg font-extrabold tracking-tight text-[var(--fs-ink)]">NutriScore</span>
      </div>

      {/* nav */}
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={[
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-all',
                on
                  ? 'bg-[#10B981] text-white shadow-md shadow-emerald-500/25'
                  : 'text-[var(--fs-muted)] hover:bg-[var(--fs-hover)] hover:text-[var(--fs-ink)]',
              ].join(' ')}
            >
              <Icon size={18} className={on ? '' : 'opacity-80'} />
              {label}
              {on && <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white/90" />}
            </button>
          );
        })}
      </nav>

      {/* profile card */}
      <div className="fs-card mt-4 p-3.5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#10B981] font-display text-sm font-bold text-white">
            {USER.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[13px] font-bold text-[var(--fs-ink)]">{USER.name}</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-px text-[9px] font-extrabold uppercase tracking-wider text-amber-600">
              <Sparkles size={9} /> {USER.plan}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-[var(--fs-faint)]">
            <span>Scans</span>
            <span>{USER.scansLimit === Infinity ? 'Unlimited' : `${USER.scansUsed}/${USER.scansLimit}`}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--fs-track)]">
            <span className="block h-full rounded-full bg-[#10B981]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--fs-border)] py-2 text-[12px] font-semibold text-[var(--fs-muted)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  );
}

/* ================================================================== */
/*  Main dashboard                                                    */
/* ================================================================== */

export default function DashboardRedesign({ onNavigate = () => {}, onViewDetail = () => {} }) {
  const [active, setActive] = useState('home');
  const [dark, setDark] = useState(false);
  const [selected, setSelected] = useState(17);

  const nav = (id) => { setActive(id); onNavigate(id); };

  return (
    <div data-theme={dark ? 'dark' : 'light'} className="fs-root font-body min-h-[100dvh] w-full text-[var(--fs-ink)]">
      <ScopedStyles />

      <div className="relative z-10 mx-auto flex w-full max-w-[1280px]">
        <Sidebar active={active} onNavigate={nav} />

        {/* ---------------- main column ---------------- */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* top bar */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--fs-border)] bg-[var(--fs-bg)]/70 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-[var(--fs-border)] bg-[var(--fs-elevated)] px-3.5 py-2.5 shadow-sm">
              <Search size={17} className="text-[var(--fs-faint)]" />
              <input
                placeholder="Search foods, brands, barcodesÃ¢â‚¬Â¦"
                className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[var(--fs-ink)] outline-none placeholder:text-[var(--fs-faint)]"
              />
              <span className="hidden items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 sm:inline-flex">
                <Sparkles size={10} /> Unlimited scans
              </span>
            </div>
            <button type="button" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--fs-border)] bg-[var(--fs-elevated)] text-[var(--fs-muted)] shadow-sm transition hover:text-[var(--fs-ink)]">
              <Bell size={18} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#047857] ring-2 ring-[var(--fs-elevated)]" />
            </button>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#10B981] font-display text-sm font-bold text-white shadow-md shadow-emerald-500/25">
              {USER.name.charAt(0)}
            </div>
          </header>

          {/* scrollable content */}
          <div className="flex flex-col gap-5 px-4 pb-28 pt-5 sm:px-6 lg:pb-8">
            {/* greeting */}
            <section className="fs-card relative overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#047857]">Welcome back</p>
                  <h1 className="mt-1 font-display text-[30px] font-extrabold leading-none tracking-tight text-[var(--fs-ink)] sm:text-[34px]">
                    {USER.name}
                  </h1>
                  <p className="mt-2.5 max-w-md text-[13px] font-medium text-[var(--fs-muted)]">
                    Your nutrition workspace is ready. Scan something to keep the streak alive.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-2xl border border-emerald-200/60 bg-emerald-50 px-3 py-2 shadow-sm">
                    <Flame size={16} className="text-[#047857]" fill="#047857" />
                    <span className="font-display text-[15px] font-extrabold text-[var(--fs-ink)]">{USER.streak}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDark((d) => !d)}
                    aria-label="Toggle theme"
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--fs-border)] bg-[var(--fs-elevated)] text-[var(--fs-muted)] shadow-sm transition hover:text-[var(--fs-ink)]"
                  >
                    {dark ? <Sun size={17} /> : <Moon size={17} />}
                  </button>
                </div>
              </div>
            </section>

            {/* CTAs */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => nav('scan')}
                className="group relative flex min-h-[96px] flex-col justify-between overflow-hidden rounded-3xl bg-[#10B981] hover:bg-[#059669] p-4 text-left text-white shadow-[0_14px_34px_-12px_rgba(4, 120, 87,0.65)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 sm:p-5"
              >
                <span className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/15 blur-xl" />
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Camera size={22} />
                </span>
                <div className="flex items-end justify-between">
                  <span className="font-display text-[16px] font-bold">Scan Food</span>
                  <ArrowUpRight size={18} className="opacity-70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => nav('history')}
                className="group fs-card relative flex min-h-[96px] flex-col justify-between p-4 text-left transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 sm:p-5"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#047857]/10 text-[#047857]">
                  <History size={22} />
                </span>
                <div className="flex items-end justify-between">
                  <span className="font-display text-[16px] font-bold text-[var(--fs-ink)]">View History</span>
                  <ArrowUpRight size={18} className="text-[var(--fs-faint)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>
            </section>

            {/* This month stat */}
            <section className="fs-card relative flex items-center gap-4 overflow-hidden p-5">
              <span className="pointer-events-none absolute -left-8 -bottom-10 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl" />
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-500">
                <Sparkles size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--fs-faint)]">This month</span>
                <span className="text-[12px] font-semibold text-[var(--fs-muted)]">scans logged</span>
              </div>
              <strong className="font-display text-[40px] font-extrabold leading-none tabular-nums text-[var(--fs-ink)]">0</strong>
            </section>

            {/* Calendar strip */}
            <section className="fs-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[16px] font-bold text-[var(--fs-ink)]">June 2026</h2>
                </div>
                <span className="rounded-full bg-[#047857]/10 px-3 py-1 text-[11px] font-bold text-[#047857]">0 scans</span>
              </div>

              <div className="mb-3 flex justify-end gap-1.5">
                <button type="button" aria-label="Previous week" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-transparent text-[var(--fs-muted)] transition hover:text-[#047857]">
                  <ChevronLeft size={17} />
                </button>
                <button type="button" aria-label="Next week" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-transparent text-[var(--fs-muted)] transition hover:text-[#047857]">
                  <ChevronRight size={17} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEK.map((d) => {
                  const on = selected === d.date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelected(d.date)}
                      aria-pressed={on}
                      className={[
                        'fs-day flex min-h-[62px] min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] bg-transparent px-1 py-2 transition-all duration-200',
                        on
                          ? 'fs-day-on text-[#047857]'
                          : 'text-[var(--fs-muted)] hover:text-[#047857]',
                      ].join(' ')}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">{d.dow}</span>
                      <strong className="font-display text-base font-extrabold leading-none">{d.date}</strong>
                      <span className={d.today ? 'h-1 w-1 rounded-full bg-[#047857]' : 'h-1 w-1 rounded-full bg-transparent'} />
                    </button>
                  );
                })}
              </div>
            </section>
            {/* Recent scans */}
            <section>
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="font-display text-[16px] font-bold text-[var(--fs-ink)]">Recent Scans</h2>
                <button type="button" onClick={() => nav('history')} className="text-[12px] font-bold text-[#047857] transition hover:opacity-70">
                  See all
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {RECENT_SCANS.map((s) => (
                  <ScanCard key={s.id} scan={s} onClick={() => onViewDetail(s)} />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ---------------- mobile bottom nav ---------------- */}
      <MobileNav active={active} onNavigate={nav} />
    </div>
  );
}

/* ================================================================== */
/*  Mobile bottom nav with center FAB                                 */
/* ================================================================== */

function MobileNav({ active, onNavigate }) {
  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: History },
    { id: 'scan', label: 'Scan', icon: ScanLine, fab: true },
    { id: 'trends', label: 'Progress', icon: Activity },
    { id: 'profile', label: 'Profile', icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="mx-auto flex max-w-[520px] items-end justify-between border-t border-[var(--fs-border)] bg-[var(--fs-elevated)]/85 px-5 pb-[calc(8px+env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur-xl">
        {items.map(({ id, label, icon: Icon, fab }) => {
          if (fab) {
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                aria-label="Scan"
                className="relative -mt-7 grid h-15 w-15 place-items-center rounded-full bg-[#10B981] text-white shadow-[0_10px_26px_-6px_rgba(4, 120, 87,0.7)] ring-4 ring-[var(--fs-elevated)] transition active:scale-95"
                style={{ height: 60, width: 60 }}
              >
                <Plus size={26} />
              </button>
            );
          }
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="flex flex-1 flex-col items-center gap-1 py-1.5"
            >
              <Icon size={21} className={on ? 'text-[#047857]' : 'text-[var(--fs-faint)]'} />
              <span className={`text-[10px] font-bold ${on ? 'text-[#047857]' : 'text-[var(--fs-faint)]'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ================================================================== */
/*  Scoped theme + ambient background + fonts                         */
/* ================================================================== */

function ScopedStyles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

.fs-root { --font-display:'Plus Jakarta Sans',system-ui,sans-serif; --font-body:'Inter',system-ui,sans-serif; }
.font-display { font-family: var(--font-display); }
.font-body { font-family: var(--font-body); }

.fs-root[data-theme='light'] {
  --fs-bg:#F6F5F3; --fs-elevated:#FFFFFF; --fs-ink:#0E1116; --fs-muted:#4B5563;
  --fs-faint:#9AA1AC; --fs-border:rgba(15,17,22,0.07); --fs-track:#ECEAE6;
  --fs-hover:#F3F1ED;
}
.fs-root[data-theme='dark'] {
  --fs-bg:#0B0D10; --fs-elevated:#15181D; --fs-ink:#F2F4F7; --fs-muted:#9BA3AF;
  --fs-faint:#5B626C; --fs-border:rgba(255,255,255,0.08); --fs-track:#262A30;
  --fs-hover:#1C2026;
}

/* ambient background: warm radial mesh + faint noise */
.fs-root {
  position:relative;
  background:var(--fs-bg);
}
.fs-root::before {
  content:''; position:fixed; inset:0; pointer-events:none; z-index:0; opacity:.5;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
}

/* layered card surface */
.fs-card {
  border-radius:24px;
  background:var(--fs-elevated);
  border:1px solid var(--fs-border);
  box-shadow:0 1px 2px rgba(15,17,22,0.04), 0 12px 30px -16px rgba(15,17,22,0.18);
}

/* calendar active pop */
@keyframes fs-pop { 0%{transform:scale(.9)} 60%{transform:scale(1.06)} 100%{transform:scale(1)} }
.fs-day-on { animation: fs-pop 320ms cubic-bezier(.34,1.56,.64,1); }

input[type=range]{ accent-color:#047857; }
`}</style>
  );
}
