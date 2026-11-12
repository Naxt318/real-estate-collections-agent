/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AnalyticsPage from './analytics/page';
import CollectionsPage from './collections/page';
import CustomersPage from './customers/page';
import DashboardPage from './dashboard/page';

const PAGES = [
  { Page: DashboardPage, heading: 'Dashboard', empty: 'No collection data yet' },
  { Page: CustomersPage, heading: 'Customers', empty: 'No customers yet' },
  { Page: CollectionsPage, heading: 'Collections', empty: 'No collection activity yet' },
  { Page: AnalyticsPage, heading: 'Analytics', empty: 'No analytics yet' },
];

describe.each(PAGES)('$heading page', ({ Page, heading, empty }) => {
  it('has a page heading', () => {
    render(<Page />);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('shows an empty state instead of made-up data', () => {
    render(<Page />);
    expect(screen.getByText(empty)).toBeInTheDocument();
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
  });
});
