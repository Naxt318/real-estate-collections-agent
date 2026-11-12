/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';

vi.mock('next/navigation', () => ({ usePathname: () => '/customers' }));

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
];

describe('AppShell', () => {
  it('shows the product name, navigation and page content', () => {
    render(<AppShell navItems={items}>Page body</AppShell>);
    expect(screen.getByText('Collections Intelligence')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Page body');
  });

  it('marks the current page from the URL', () => {
    render(<AppShell navItems={items}>Body</AppShell>);
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens and closes the navigation on small screens', async () => {
    render(<AppShell navItems={items}>Body</AppShell>);
    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close navigation' }));
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes the navigation when a link is chosen', async () => {
    render(<AppShell navItems={items}>Body</AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    await userEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes the navigation with Escape', async () => {
    render(<AppShell navItems={items}>Body</AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('closes the navigation when the backdrop is clicked', async () => {
    render(<AppShell navItems={items}>Body</AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    await userEvent.click(screen.getByTestId('nav-backdrop'));
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('has a close button inside the open navigation', async () => {
    render(<AppShell navItems={items}>Body</AppShell>);
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const sidebar = screen.getByRole('navigation', { name: 'Main' }).closest('aside')!;
    await userEvent.click(within(sidebar).getByRole('button', { name: 'Close menu' }));
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
