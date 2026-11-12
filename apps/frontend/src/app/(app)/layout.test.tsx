/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppLayout from './layout';

vi.mock('next/navigation', () => ({ usePathname: () => '/customers' }));

describe('App layout', () => {
  it('links to every section of the dashboard', () => {
    render(<AppLayout>Page body</AppLayout>);
    const links = screen.getAllByRole('link').filter((l) => l.closest('nav[aria-label="Main"]'));
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Dashboard', '/dashboard'],
      ['Customers', '/customers'],
      ['Collections', '/collections'],
      ['Analytics', '/analytics'],
    ]);
  });

  it('marks the current section and shows the page', () => {
    render(<AppLayout>Page body</AppLayout>);
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('main')).toHaveTextContent('Page body');
  });
});
