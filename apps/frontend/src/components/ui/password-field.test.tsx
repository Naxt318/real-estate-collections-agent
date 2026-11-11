/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PasswordField } from './password-field';

describe('PasswordField', () => {
  it('hides the password by default', () => {
    render(<PasswordField label="Password" name="password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shows and hides the password', async () => {
    render(<PasswordField label="Password" name="password" />);
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('keeps the error and hint wiring of a text field', () => {
    render(
      <PasswordField
        label="Password"
        name="password"
        hint="At least 12 characters"
        error="Too short"
      />,
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 12 characters Too short',
    );
  });

  it('does not submit the form when toggled', async () => {
    let submitted = false;
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitted = true;
        }}
      >
        <PasswordField label="Password" name="password" />
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(submitted).toBe(false);
  });
});
