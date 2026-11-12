/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComponentGallery } from './component-gallery';

vi.mock('next/navigation', () => ({ usePathname: () => '/dev/components' }));
vi.mock('@/lib/auth-validation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth-validation')>()),
  MIN_PASSWORD_LENGTH: 20,
}));

describe('ComponentGallery password hint', () => {
  it('follows the shared password length instead of hard-coding it', () => {
    render(<ComponentGallery />);
    expect(screen.getByText('At least 20 characters')).toBeInTheDocument();
  });
});
