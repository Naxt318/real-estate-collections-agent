/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RequestAccessPage, { metadata } from './page';

describe('Request access page', () => {
  it('explains that the team approves requests and shows the form', () => {
    render(<RequestAccessPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Request access');
    expect(screen.getByText(/our team reviews every request/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request access' })).toBeInTheDocument();
  });

  it('has a page title', () => {
    expect(metadata.title).toBe('Request access · Collections Intelligence');
  });
});
