/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ForgotPasswordForm } from './forgot-password-form';

describe('ForgotPasswordForm', () => {
  it('rejects a malformed email', async () => {
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText(/Email/), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(screen.getByLabelText(/Email/)).toHaveAccessibleDescription(
      'Enter a valid email address',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says password reset is not connected yet when the email is valid', async () => {
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText(/Email/), 'priya@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(screen.getByRole('status')).toHaveTextContent("Password reset isn't connected yet.");
  });

  it('links back to sign in', () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });
});
