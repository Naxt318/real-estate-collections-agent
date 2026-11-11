/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('shows the title and description', () => {
    render(<EmptyState title="No customers yet" description="Connect your CRM to import them." />);
    expect(screen.getByText('No customers yet')).toBeInTheDocument();
    expect(screen.getByText('Connect your CRM to import them.')).toBeInTheDocument();
  });

  it('shows no button without an action', () => {
    render(<EmptyState title="No customers yet" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls the action when its button is clicked', async () => {
    const onAction = vi.fn();
    render(<EmptyState title="No customers yet" actionLabel="Connect CRM" onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Connect CRM' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
