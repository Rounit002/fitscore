import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignUp from './SignUp';

function renderSignUp(props = {}) {
  return render(<SignUp onNavigateLogin={jest.fn()} onSignUpPending={jest.fn()} {...props} />);
}

describe('SignUp', () => {
  it('renders form fields', () => {
    renderSignUp();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('shows password mismatch error', async () => {
    renderSignUp();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), 'John');
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'OtherPass123!');
    await user.click(screen.getByRole('button', { name: /sign up|create/i }));
    expect(screen.getByText(/passwords do not match|password.*match/i)).toBeInTheDocument();
  });

  it('calls onSignUpPending on success', async () => {
    const onSignUpPending = jest.fn();
    renderSignUp({ onSignUpPending });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), 'John');
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: /sign up|create/i }));
    expect(onSignUpPending).toHaveBeenCalled();
  });

  it('navigates to login', async () => {
    const onNavigateLogin = jest.fn();
    renderSignUp({ onNavigateLogin });
    const user = userEvent.setup();
    // The "Sign in" button has id="navigate-login"
    const signInBtn = document.getElementById('navigate-login');
    await user.click(signInBtn);
    expect(onNavigateLogin).toHaveBeenCalled();
  });
});
