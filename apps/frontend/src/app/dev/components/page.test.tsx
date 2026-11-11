/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ComponentsPage from './page';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/dev/components',
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/dev/components', () => {
  it('is not available in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => ComponentsPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('renders the gallery outside production, clearly marked as demo data', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(ComponentsPage());
    expect(screen.getByRole('heading', { name: 'Component gallery' })).toBeInTheDocument();
    expect(screen.getAllByText(/Demo data/).length).toBeGreaterThan(0);
  });
});
