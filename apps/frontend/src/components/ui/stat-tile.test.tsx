/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatTile } from './stat-tile';

describe('StatTile', () => {
  it('pairs the label with its value as a term and definition', () => {
    render(<StatTile label="Total outstanding" value="₹12,50,000.00" />);
    expect(screen.getByRole('term')).toHaveTextContent('Total outstanding');
    expect(screen.getByRole('definition')).toHaveTextContent('₹12,50,000.00');
  });

  it('shows an optional hint', () => {
    render(<StatTile label="Overdue" value="₹3,00,000.00" hint="12 customers" />);
    expect(screen.getByText('12 customers')).toBeInTheDocument();
  });
});
