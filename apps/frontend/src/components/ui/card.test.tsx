/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('renders its content', () => {
    render(<Card>Body text</Card>);
    expect(screen.getByText('Body text')).toBeInTheDocument();
  });

  it('labels itself with its title as a heading', () => {
    render(<Card title="Overdue instalments">Body</Card>);
    expect(screen.getByRole('heading', { name: 'Overdue instalments' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Overdue instalments' })).toBeInTheDocument();
  });

  it('has no heading without a title', () => {
    render(<Card>Body</Card>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
