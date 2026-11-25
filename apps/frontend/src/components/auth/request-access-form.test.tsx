/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RequestAccessForm } from './request-access-form';

async function fill(values: { company?: string; name?: string; email?: string; phone?: string }) {
  if (values.company) await userEvent.type(screen.getByLabelText(/Company/), values.company);
  if (values.name) await userEvent.type(screen.getByLabelText(/Full name/), values.name);
  if (values.email) await userEvent.type(screen.getByLabelText(/Work email/), values.email);
  if (values.phone) await userEvent.type(screen.getByLabelText(/Phone/), values.phone);
  await userEvent.click(screen.getByRole('button', { name: 'Request access' }));
}

const VALID = {
  company: 'Skyline Developers',
  name: 'Priya Sharma',
  email: 'priya@skyline.example',
  phone: '+91 98765 43210',
};

describe('RequestAccessForm', () => {
  it('shows an error on every field when submitted empty', async () => {
    render(<RequestAccessForm />);
    await fill({});
    expect(screen.getByLabelText(/Company/)).toHaveAccessibleDescription('Enter your company name');
    expect(screen.getByLabelText(/Full name/)).toHaveAccessibleDescription('Enter your full name');
    expect(screen.getByLabelText(/Work email/)).toHaveAccessibleDescription(
      'Enter your email address',
    );
    expect(screen.getByLabelText(/Phone/)).toHaveAccessibleDescription('Enter your phone number');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('rejects an invalid phone number', async () => {
    render(<RequestAccessForm />);
    await fill({ ...VALID, phone: '12345' });
    expect(screen.getByLabelText(/Phone/)).toHaveAccessibleDescription(
      'Enter a valid phone number',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says access requests are not connected yet when the form is valid', async () => {
    render(<RequestAccessForm />);
    await fill(VALID);
    expect(screen.getByRole('status')).toHaveTextContent("Access requests aren't connected yet.");
    expect(screen.getByLabelText(/Work email/)).toHaveAttribute('aria-invalid', 'false');
  });

  it('clears field errors once they are fixed', async () => {
    render(<RequestAccessForm />);
    await fill({});
    await fill(VALID);
    expect(screen.getByLabelText(/Company/)).not.toHaveAccessibleDescription();
  });

  it('hides the notice again if a later submit is invalid', async () => {
    render(<RequestAccessForm />);
    await fill(VALID);
    await userEvent.clear(screen.getByLabelText(/Phone/));
    await userEvent.click(screen.getByRole('button', { name: 'Request access' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('links back to sign in for people who already have an account', () => {
    render(<RequestAccessForm />);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});
