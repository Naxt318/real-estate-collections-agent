/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './alert';

describe('Alert', () => {
  it.each(['error', 'warning'] as const)('interrupts screen readers for %s', (tone) => {
    render(<Alert tone={tone}>Something happened</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Something happened');
  });

  it.each(['info', 'success'] as const)('is a polite status for %s', (tone) => {
    render(<Alert tone={tone}>Saved</Alert>);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an optional title', () => {
    render(
      <Alert tone="info" title="Heads up">
        Details
      </Alert>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Heads up');
  });
});
