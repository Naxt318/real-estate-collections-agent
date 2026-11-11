/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('announces a default message', () => {
    render(<ErrorState />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('shows a custom title and description', () => {
    render(<ErrorState title="Could not load customers" description="Please try again." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load customers');
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again.');
  });

  it('shows no retry button without onRetry', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRetry when Try again is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
