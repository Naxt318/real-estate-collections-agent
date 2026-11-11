/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LandingPage from './page';

describe('Landing page', () => {
  it('explains what the product does', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Collect every instalment on time',
    );
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
  });

  it('sends every Sign in and Get started button to the sign-in page', () => {
    render(<LandingPage />);
    const ctas = [
      ...screen.getAllByRole('link', { name: 'Sign in' }),
      ...screen.getAllByRole('link', { name: 'Get started' }),
    ];
    expect(ctas.length).toBeGreaterThanOrEqual(3);
    for (const link of ctas) expect(link).toHaveAttribute('href', '/login');
  });
});
