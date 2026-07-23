import { useState } from 'react';
import { Eye, EyeOff, Sparkles, CheckCircle, Flame } from 'lucide-react';
import { API } from '../api/client.js';

export default function Login({ onLogin, onNavigateSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(
        `${API}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin(data.user, null, data.deletionCancelled);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F5F5] font-[var(--font-main)] page-transition">
      {/* Left Sidebar Panel - Desktop Only */}
      <aside className="relative hidden flex-[1.2] flex-col justify-between overflow-hidden bg-ns-primary p-[60px] text-white lg:flex">
        <div className="font-[var(--font-headline)] text-[1.8rem] font-bold tracking-tight">
          Fit<span className="text-[#6EE7B7]">Scan</span>
        </div>

        <div>
          <h2 className="mb-6 font-[var(--font-headline)] text-[2.8rem] font-bold leading-[1.2] tracking-tight">
            Know exactly what you eat.
          </h2>

          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-[10px]">
            <div className="flex items-center justify-center rounded-xl bg-white/15 p-2">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="mb-1 text-[1.05rem] font-bold">AI Label Analysis</div>
              <div className="text-sm leading-relaxed opacity-85">Instantly decode ingredients and uncover harmful additives or hidden sugars.</div>
            </div>
          </div>

          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-[10px]">
            <div className="flex items-center justify-center rounded-xl bg-white/15 p-2">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="mb-1 text-[1.05rem] font-bold">Healthier Alternatives</div>
              <div className="text-sm leading-relaxed opacity-85">Get tailored smart suggestions for better choices matching your lifestyle.</div>
            </div>
          </div>

          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-[10px]">
            <div className="flex items-center justify-center rounded-xl bg-white/15 p-2">
              <Flame size={20} />
            </div>
            <div>
              <div className="mb-1 text-[1.05rem] font-bold">Streak & Habits</div>
              <div className="text-sm leading-relaxed opacity-85">Log your choices, maintain your streak, and earn badges along your wellness journey.</div>
            </div>
          </div>
        </div>

        <div className="text-sm opacity-70">
          &copy; {new Date().getFullYear()} FitScan Inc. All rights reserved.
        </div>
      </aside>

      {/* Right Form Panel */}
      <main className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10">
        <div className="flex w-full max-w-[380px] flex-col">
          <div className="mb-8 block font-[var(--font-headline)] text-2xl font-bold text-ns-primary-con lg:hidden">
            Fit<span className="text-ns-primary">Scan</span>
          </div>

          <h1 className="mb-2 font-[var(--font-headline)] text-[2rem] font-bold tracking-tight text-[#1A1A1A]">
            Welcome back
          </h1>
          <p className="mb-8 text-[0.95rem] text-[#6B7280]">Log in to your account to continue</p>

          {error && (
            <div className="mb-6 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-500">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="login-form">
            <div className="mb-5 w-full">
              <label className="mb-1.5 block text-sm font-semibold text-[#374151]" htmlFor="login-email">Email Address</label>
              <input
                className="h-12 w-full rounded-xl border-[1.5px] border-[#EBEBEB] bg-white px-4 text-[0.95rem] text-[#1A1A1A] outline-none transition-all focus:border-ns-primary focus:shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="login-email"
                autoComplete="email"
              />
            </div>

            <div className="mb-5 w-full">
              <label className="mb-1.5 block text-sm font-semibold text-[#374151]" htmlFor="login-password">Password</label>
              <div className="relative">
                <input
                  className="h-12 w-full rounded-xl border-[1.5px] border-[#EBEBEB] bg-white px-4 pr-12 text-[0.95rem] text-[#1A1A1A] outline-none transition-all focus:border-ns-primary focus:shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  id="login-password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center border-none bg-transparent p-1 text-[#ADADAD] hover:text-[#374151]"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="mb-6 flex w-full justify-end">
              <button type="button" className="border-none bg-transparent text-sm font-bold text-ns-primary hover:text-ns-primary-con hover:underline">
                Forgot your password?
              </button>
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-xl border-none bg-ns-primary text-[0.95rem] font-bold text-white shadow-[0_4px_14px_rgba(16, 185, 129,0.38)] hover:bg-ns-primary-con disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              disabled={isSubmitting}
              id="login-submit"
            >
              {isSubmitting ? <><span className="spinner mr-2" /> Logging in...</> : 'Log In'}
            </button>
          </form>

          <p className="mt-8 text-center text-[0.9rem] text-[#6B7280]">
            Don't have an account?
            <button
              className="ml-1.5 border-none bg-transparent text-[0.9rem] font-bold text-ns-primary hover:text-ns-primary-con hover:underline"
              onClick={onNavigateSignup}
              id="navigate-signup"
            >
              Sign up for free
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
