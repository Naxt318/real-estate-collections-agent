/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('announces itself as a loading status', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('uses a custom label when given', () => {
    render(<Spinner label="Loading customers" />);
    expect(screen.getByRole('status', { name: 'Loading customers' })).toBeInTheDocument();
  });
});
