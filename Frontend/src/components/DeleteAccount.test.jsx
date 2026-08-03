/* global jest, describe, beforeEach, afterEach, it, expect */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeleteAccount from './DeleteAccount.jsx';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete globalThis.fetch;
  });

  it('is publicly readable and directs signed-out visitors to sign in', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Delete your bitezsnap account' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How to request account deletion' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete from the Android app' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete on this website' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Data permanently deleted' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Data retained and for how long' })).toBeInTheDocument();
    expect(screen.getByText(/Anonymised shared product facts may remain indefinitely/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in to continue' }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('requires both confirmations before enabling the deletion request', () => {
    renderPage({ userAuth: { email: 'person@example.com' } });

    const submit = screen.getByRole('button', { name: 'Schedule account deletion' });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/I understand that my account/i));
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/i), {
      target: { value: 'delete' },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    });
    expect(submit).toBeEnabled();
  });

  it('submits to the canonical endpoint and shows the scheduled date', async () => {
    const onDeletionScheduled = jest.fn();
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        scheduledDeletionAt: '2026-08-10T12:00:00.000Z',
      }),
    });
    renderPage({
      userAuth: { email: 'person@example.com' },
      onDeletionScheduled,
    });

    fireEvent.click(screen.getByLabelText(/I understand that my account/i));
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule account deletion' }));

    await screen.findByRole('heading', { name: 'Deletion scheduled' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.test/auth/account/deletion',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: '{}',
      }),
    );
    expect(onDeletionScheduled).toHaveBeenCalledTimes(1);
  });

  it('keeps the page actionable when the API rejects the request', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Deletion service unavailable' }),
    });
    renderPage({ userAuth: { email: 'person@example.com' } });

    fireEvent.click(screen.getByLabelText(/I understand that my account/i));
    fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/i), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule account deletion' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Deletion service unavailable');
    });
    expect(screen.getByRole('button', { name: 'Schedule account deletion' })).toBeEnabled();
  });
});
