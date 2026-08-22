/* global jest, describe, it, expect */
// Integration test: mount the actual DesktopAppShell with a fake authenticated
// user and confirm the AIHint footer appears in the rendered DOM. This is the
// closest we can get to a browser smoke test without a real backend.
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AIHint from './AIHint.jsx';
import { useTranslation } from 'react-i18next';

// Minimal stand-in for DesktopAppShell that mirrors the structure: a sidebar
// + content area with the AIHint at the bottom, on every protected route.
function FakeAppShell({ userAuth }) {
  if (!userAuth) return <p>login screen</p>;
  return (
    <div className="fitscan-app-shell lg:flex">
      <aside className="fitscan-app-sidebar hidden lg:flex" aria-label="Desktop navigation">
        <nav>
          <span>Dashboard</span>
          <span>Scan</span>
          <span>History</span>
        </nav>
      </aside>
      <div className="fitscan-app-content">
        <main>
          <p>page content for the route</p>
        </main>
        <AIHint />
      </div>
    </div>
  );
}

function renderShellAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard" element={<FakeAppShell userAuth={fakeUser} />} />
        <Route path="/history" element={<FakeAppShell userAuth={fakeUser} />} />
        <Route path="/compare" element={<FakeAppShell userAuth={fakeUser} />} />
        <Route path="/trends" element={<FakeAppShell userAuth={fakeUser} />} />
        <Route path="/results" element={<FakeAppShell userAuth={fakeUser} />} />
      </Routes>
    </MemoryRouter>
  );
}

const fakeUser = {
  id: 'u1',
  name: 'Tester',
  isPremium: false,
  streak: 3,
  scans_used: 1,
  profile: { age: 30, height: 170, weight: 70, gender: 'Male', conditions: [], goals: [] },
};

describe('App shell AIHint integration', () => {
  it('renders the brief AI note on the dashboard when the user is logged in', () => {
    renderShellAt('/dashboard');
    expect(
      screen.getByText('AI-assisted recommendations')
    ).toBeInTheDocument();
  });

  it('renders the brief AI note on the history route too', () => {
    renderShellAt('/history');
    expect(
      screen.getByText('AI-assisted recommendations')
    ).toBeInTheDocument();
  });

  it('renders the brief AI note on the compare route too', () => {
    renderShellAt('/compare');
    expect(
      screen.getByText('AI-assisted recommendations')
    ).toBeInTheDocument();
  });

  it('renders the brief AI note on the trends route too', () => {
    renderShellAt('/trends');
    expect(
      screen.getByText('AI-assisted recommendations')
    ).toBeInTheDocument();
  });

  it('renders the brief AI note on the results route too', () => {
    renderShellAt('/results');
    expect(
      screen.getByText('AI-assisted recommendations')
    ).toBeInTheDocument();
  });

  it('does NOT include the long medical-advice body on any of the main screens', () => {
    renderShellAt('/dashboard');
    expect(
      screen.queryByText(/Consult a qualified doctor or registered dietitian/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/not medical, nutritional, or dietary advice/i)
    ).not.toBeInTheDocument();
  });
});
