/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SideNav } from './side-nav';

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
];

describe('SideNav', () => {
  it('is the main navigation with a link per item', () => {
    render(<SideNav items={items} currentPath="/" />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/customers');
  });

  it('marks the current page', () => {
    render(<SideNav items={items} currentPath="/customers" />);
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('marks the section for nested pages', () => {
    render(<SideNav items={items} currentPath="/customers/c1" />);
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page');
  });

  it('does not match a different path that shares a prefix', () => {
    render(<SideNav items={items} currentPath="/customers-archive" />);
    expect(screen.getByRole('link', { name: 'Customers' })).not.toHaveAttribute('aria-current');
  });
});
