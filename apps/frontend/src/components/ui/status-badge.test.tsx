/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('shows its label', () => {
    render(<StatusBadge tone="danger">Overdue</StatusBadge>);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it.each(['neutral', 'info', 'success', 'warning', 'danger'] as const)(
    'exposes the %s tone',
    (tone) => {
      render(<StatusBadge tone={tone}>Label</StatusBadge>);
      expect(screen.getByText('Label')).toHaveAttribute('data-tone', tone);
    },
  );

  it('defaults to neutral', () => {
    render(<StatusBadge>Label</StatusBadge>);
    expect(screen.getByText('Label')).toHaveAttribute('data-tone', 'neutral');
  });
});
