/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LoginForm } from './login-form';

async function submit(email: string, password: string) {
  if (email) await userEvent.type(screen.getByLabelText(/Email/), email);
  if (password) await userEvent.type(screen.getByLabelText(/Password/), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginForm', () => {
  it('shows field errors when submitted empty', async () => {
    render(<LoginForm />);
    await submit('', '');
    expect(screen.getByLabelText(/Email/)).toHaveAccessibleDescription('Enter your email address');
    expect(screen.getByLabelText(/Password/)).toHaveAccessibleDescription('Enter your password');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says sign-in is not connected yet when the form is valid', async () => {
    render(<LoginForm />);
    await submit('priya@example.com', 'a password');
    expect(screen.getByRole('status')).toHaveTextContent("Sign-in isn't connected yet.");
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'false');
  });

  it('clears field errors once they are fixed', async () => {
    render(<LoginForm />);
    await submit('', '');
    await submit('priya@example.com', 'a password');
    expect(screen.getByLabelText(/Email/)).not.toHaveAccessibleDescription();
  });

  it('has a Google sign-in placeholder', async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(screen.getByRole('status')).toHaveTextContent("Google sign-in isn't connected yet.");
  });

  it('links to the forgot password page', () => {
    render(<LoginForm />);
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });
});
