/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthLayout } from './auth-layout';

describe('AuthLayout', () => {
  it('shows the page title and content', () => {
    render(<AuthLayout title="Welcome back">Form here</AuthLayout>);
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Form here')).toBeInTheDocument();
  });

  it('does not show a copyright year that would freeze at build time', () => {
    render(<AuthLayout title="Welcome back">Form</AuthLayout>);
    expect(screen.getByText(/^© Collections Intelligence$/)).toBeInTheDocument();
  });
});
