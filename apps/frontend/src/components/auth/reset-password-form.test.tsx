/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ResetPasswordForm } from './reset-password-form';

async function submit(password: string, confirm: string) {
  if (password) await userEvent.type(screen.getByLabelText(/^New password/), password);
  if (confirm) await userEvent.type(screen.getByLabelText(/^Confirm new password/), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
}

describe('ResetPasswordForm', () => {
  it('shows the minimum length up front', () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription(
      'At least 12 characters',
    );
  });

  it('rejects a short password', async () => {
    render(<ResetPasswordForm />);
    await submit('short', 'short');
    expect(screen.getByLabelText(/^New password/)).toHaveAccessibleDescription(
      'At least 12 characters Use at least 12 characters',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('rejects a confirmation that does not match', async () => {
    render(<ResetPasswordForm />);
    await submit('correct horse', 'correct horses');
    expect(screen.getByLabelText(/^Confirm new password/)).toHaveAccessibleDescription(
      'Passwords do not match',
    );
  });

  it('says password reset is not connected yet when valid', async () => {
    render(<ResetPasswordForm />);
    await submit('correct horse', 'correct horse');
    expect(screen.getByRole('status')).toHaveTextContent("Password reset isn't connected yet.");
  });

  it('lets the user show the new password', async () => {
    render(<ResetPasswordForm />);
    const [toggle] = screen.getAllByRole('button', { name: 'Show password' });
    await userEvent.click(toggle!);
    expect(screen.getByLabelText(/^New password/)).toHaveAttribute('type', 'text');
  });

  it('links back to sign in', () => {
    render(<ResetPasswordForm />);
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });
});
