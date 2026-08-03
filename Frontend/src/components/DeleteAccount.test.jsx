/* global jest, describe, beforeEach, afterEach, it, expect */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeleteAccount from './DeleteAccount.jsx';

const mockNavigate = jest.fn();
let mockToken = '';

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(mockToken ? { token: mockToken } : {})],
}));
jest.mock('../api/client.js', () => ({ API: 'https://api.example.test' }));

function renderPage({ userAuth = null, onDeletionScheduled = jest.fn() } = {}) {
  return render(
    <DeleteAccount
      userAuth={userAuth}
      onDeletionScheduled={onDeletionScheduled}
    />,
  );
}

describe('DeleteAccount', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockToken = '';
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete globalThis.fetch;
  });

  it('shows a public registered-email deletion form and permanent-action disclaimer', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Delete your bitezsnap account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Registered Email Address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request Deletion' })).toBeDisabled();
    expect(screen.getAllByText(/Data deletion is permanent once completed and will be processed within 30 days/i))
      .not.toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'Data permanently deleted' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Limited data retention' })).toBeInTheDocument();
  });

  it('requires a valid email and prefills the signed-in account address', () => {
    renderPage({ userAuth: { email: 'person@example.com' } });

    const email = screen.getByLabelText('Registered Email Address');
    const submit = screen.getByRole('button', { name: 'Request Deletion' });
    expect(email).toHaveValue('person@example.com');
    expect(submit).toBeEnabled();

    fireEvent.change(email, { target: { value: 'not-an-email' } });
    expect(submit).toBeDisabled();
  });

  it('submits the public email request and shows non-enumerating verification guidance', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        success: true,
        message: 'If a bitezsnap account exists for that email, a verification link is on its way.',
      }),
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('Registered Email Address'), {
      target: { value: 'Person@Example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Request Deletion' }));

    await screen.findByRole('heading', { name: 'Check your email' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.test/auth/account/deletion-request',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'Person@Example.com' }),
      }),
    );
    expect(screen.getByText(/No deletion is scheduled until the email link is confirmed/i)).toBeInTheDocument();
  });

  it('keeps the public form actionable when the request API rejects it', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Deletion service unavailable' }),
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('Registered Email Address'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Request Deletion' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Deletion service unavailable');
    });
    expect(screen.getByRole('button', { name: 'Request Deletion' })).toBeEnabled();
  });

  it('confirms the one-time email link and shows the scheduled deletion date', async () => {
    const onDeletionScheduled = jest.fn();
    mockToken = 'a'.repeat(64);
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        scheduledDeletionAt: '2026-08-11T12:00:00.000Z',
      }),
    });
    renderPage({ onDeletionScheduled });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Deletion Request' }));

    await screen.findByRole('heading', { name: 'Deletion request confirmed' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.test/auth/account/deletion/confirm',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ token: 'a'.repeat(64) }),
      }),
    );
    expect(onDeletionScheduled).toHaveBeenCalledTimes(1);
  });
});
