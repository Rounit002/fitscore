import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

jest.mock('../api/client.js', () => ({ API: 'http://test', apiFetch: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

function renderLogin(props = {}) {
  return render(<Login onLogin={jest.fn()} onNavigateSignup={jest.fn()} {...props} />);
}

// The password queries are anchored (/^password$/i) so they match the field and
// not the "Show password" reveal button, which now carries an accessible name of
// its own. This is the form SignUp.test.jsx already used for its two fields.
describe('Login', () => {
  it('renders form fields', () => {
    const { container } = renderLogin();
    expect(container).toHaveTextContent('bitezsnap');
    expect(container).not.toHaveTextContent(/nutri\s*score/i);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('submits successfully and calls onLogin', async () => {
    const onLogin = jest.fn();
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: '1' }, deletionCancelled: false }),
    });
    renderLogin({ onLogin });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /log in|sign in/i }));
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });

  it('shows error on failure', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    });
    renderLogin();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /log in|sign in/i }));
    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument());
  });

  it('navigates to signup', async () => {
    const onNavigateSignup = jest.fn();
    renderLogin({ onNavigateSignup });
    const user = userEvent.setup();
    await user.click(screen.getByText(/sign up/i));
    expect(onNavigateSignup).toHaveBeenCalled();
  });
});
