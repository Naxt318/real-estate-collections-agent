/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ComponentGallery } from './component-gallery';

vi.mock('next/navigation', () => ({ usePathname: () => '/dev/components' }));

describe('ComponentGallery', () => {
  it('pages through the demo customers', async () => {
    render(<ComponentGallery />);
    expect(screen.getByText('Showing 1–5 of 12')).toBeInTheDocument();
    expect(screen.getByText('Demo Customer 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(screen.getByText('Showing 6–10 of 12')).toBeInTheDocument();
    expect(screen.getByText('Demo Customer 6')).toBeInTheDocument();
    expect(screen.queryByText('Demo Customer 1')).not.toBeInTheDocument();
  });

  it('formats demo amounts as rupees', () => {
    render(<ComponentGallery />);
    expect(screen.getAllByText(/^₹[\d,]+\.\d{2}$/).length).toBeGreaterThan(0);
  });

  it('links API status to the status page', () => {
    render(<ComponentGallery />);
    expect(screen.getByRole('link', { name: 'API status' })).toHaveAttribute('href', '/status');
  });
});
