/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TextField } from './text-field';

describe('TextField', () => {
  it('links the label to the input', () => {
    render(<TextField label="Email" name="email" type="email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('accepts typed text', async () => {
    render(<TextField label="Email" name="email" />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    expect(screen.getByLabelText('Email')).toHaveValue('a@b.com');
  });

  it('is valid and has no description when there is no error or hint', () => {
    render(<TextField label="Email" name="email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('marks the input invalid and describes it with the error', () => {
    render(<TextField label="Email" name="email" error="Enter a valid email address" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address');
  });

  it('describes the input with the hint', () => {
    render(<TextField label="Password" name="password" hint="At least 12 characters" />);
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 12 characters');
  });

  it('describes the input with both hint and error', () => {
    render(
      <TextField
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

  it('marks required fields as required', () => {
    render(<TextField label="Email" name="email" required />);
    expect(screen.getByLabelText(/Email/)).toBeRequired();
  });
});
