import { useState } from 'react';
import { Eye, EyeOff, Sparkles, CheckCircle, Flame } from 'lucide-react';

export default function SignUp({ onNavigateLogin, onSignUpPending }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      onSignUpPending({ type: 'local', name: form.name, email: form.email, password: form.password });
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
            Start eating cleaner today.
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
          <div className="mb-6 block font-[var(--font-headline)] text-2xl font-bold text-ns-primary-con lg:hidden">
            Fit<span className="text-ns-primary">Scan</span>
          </div>

          <h1 className="mb-2 font-[var(--font-headline)] text-[2rem] font-bold tracking-tight text-[#1A1A1A]">
            Create Account
          </h1>
          <p className="mb-7 text-[0.95rem] text-[#6B7280]">Join us to start tracking and scanning cleaner</p>

          {error && (
            <div className="mb-5 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-500">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} id="signup-form">
            <div className="mb-4 w-full">
              <label className="mb-1 block text-sm font-semibold text-[#374151]" htmlFor="signup-name">Full Name</label>
              <input
                className="h-11 w-full rounded-xl border-[1.5px] border-[#EBEBEB] bg-white px-4 text-[0.95rem] text-[#1A1A1A] outline-none transition-all focus:border-ns-primary focus:shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={update('name')}
                required
                id="signup-name"
                autoComplete="name"
              />
            </div>

            <div className="mb-4 w-full">
              <label className="mb-1 block text-sm font-semibold text-[#374151]" htmlFor="signup-email">Email Address</label>
              <input
                className="h-11 w-full rounded-xl border-[1.5px] border-[#EBEBEB] bg-white px-4 text-[0.95rem] text-[#1A1A1A] outline-none transition-all focus:border-ns-primary focus:shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={update('email')}
                required
                id="signup-email"
                autoComplete="email"
              />
            </div>

            <div className="mb-4 w-full">
              <label className="mb-1 block text-sm font-semibold text-[#374151]" htmlFor="signup-password">Password</label>
              <div className="relative">
                <input
                  className="h-11 w-full rounded-xl border-[1.5px] border-[#EBEBEB] bg-white px-4 pr-12 text-[0.95rem] text-[#1A1A1A] outline-none transition-all focus:border-ns-primary focus:shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update('password')}
                  required
                  id="signup-password"
                  autoComplete="new-password"
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

            <div className="mb-4 w-full">
              <label className="mb-1 block text-sm font-semibold text-[#374151]" htmlFor="signup-confirm-password">Confirm Password</label>
              <div className="relative">
                <input
                  className="h-11 w-full rounded-xl border-[1.5px] border-[#EBEBEB] bg-white px-4 pr-12 text-[0.95rem] text-[#1A1A1A] outline-none transition-all focus:border-ns-primary focus:shadow-[0_0_0_4px_rgba(16,185,129,0.25)]"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  required
                  id="signup-confirm-password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center border-none bg-transparent p-1 text-[#ADADAD] hover:text-[#374151]"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-3 h-12 w-full rounded-xl border-none bg-ns-primary text-[0.95rem] font-bold text-white shadow-[0_4px_14px_rgba(16, 185, 129,0.38)] hover:bg-ns-primary-con disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              disabled={isSubmitting}
              id="signup-submit"
            >
              {isSubmitting ? <><span className="spinner mr-2" /> Creating account...</> : 'Sign Up'}
            </button>
          </form>

          <p className="mt-5 text-center text-[0.9rem] text-[#6B7280]">
            Already have an account?
            <button
              className="ml-1.5 border-none bg-transparent text-[0.9rem] font-bold text-ns-primary hover:text-ns-primary-con hover:underline"
              onClick={onNavigateLogin}
              id="navigate-login"
            >
              Sign in
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
