'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Spinner } from '@/components/ui/spinner';
import { StatTile } from '@/components/ui/stat-tile';
import { StatusBadge, type BadgeTone } from '@/components/ui/status-badge';
import { TextField } from '@/components/ui/text-field';
import { formatInr } from '@/lib/format-money';

// DEMO DATA ONLY. Invented for this preview; not real customers or amounts.
type DemoCustomer = { id: string; name: string; outstanding: string; status: string };

const DEMO_STATUSES: { label: string; tone: BadgeTone }[] = [
  { label: 'On track', tone: 'success' },
  { label: 'Due soon', tone: 'warning' },
  { label: 'Overdue', tone: 'danger' },
];

const DEMO_CUSTOMERS: DemoCustomer[] = Array.from({ length: 12 }, (_, i) => ({
  id: `demo-${i + 1}`,
  name: `Demo Customer ${i + 1}`,
  outstanding: `${(i + 1) * 125000}.50`,
  status: DEMO_STATUSES[i % DEMO_STATUSES.length]!.label,
}));

const PAGE_SIZE = 5;

const columns: Column<DemoCustomer>[] = [
  { key: 'name', header: 'Customer', cell: (row) => row.name },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => (
      <StatusBadge tone={DEMO_STATUSES.find((s) => s.label === row.status)?.tone}>
        {row.status}
      </StatusBadge>
    ),
  },
  {
    key: 'outstanding',
    header: 'Outstanding',
    cell: (row) => formatInr(row.outstanding),
    align: 'right',
  },
];

const NAV_ITEMS = [
  { href: '/dev/components', label: 'Component gallery' },
  { href: '/', label: 'API status' },
];

export function ComponentGallery() {
  const [page, setPage] = useState(1);
  const visible = DEMO_CUSTOMERS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppShell navItems={NAV_ITEMS} topBarEnd={<StatusBadge tone="info">Demo data</StatusBadge>}>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Component gallery
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Shared UI components. Demo data only: every name and amount here is invented.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Stat tiles">
          <StatTile label="Total outstanding" value={formatInr('9750000.00')} hint="Demo data" />
          <StatTile label="Collected this month" value={formatInr('1250000.50')} />
          <StatTile label="Overdue" value={formatInr('325000')} hint="Demo data · 4 customers" />
        </section>

        <Card title="Customers table">
          <DataTable
            caption="Demo customers"
            columns={columns}
            rows={visible}
            getRowKey={(row) => row.id}
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total: DEMO_CUSTOMERS.length,
              onPageChange: setPage,
            }}
          />
        </Card>

        <Card title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        <Card title="Form fields">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Email" name="demo-email" type="email" placeholder="you@example.com" />
            <TextField
              label="Password"
              name="demo-password"
              type="password"
              hint="At least 12 characters"
            />
            <TextField label="Required field" name="demo-required" required />
            <TextField label="With error" name="demo-error" error="Enter a valid email address" />
          </div>
        </Card>

        <Card title="Alerts and badges">
          <div className="flex flex-col gap-3">
            <Alert tone="info" title="Info">
              Sign-in isn&apos;t connected yet.
            </Alert>
            <Alert tone="success">Changes saved.</Alert>
            <Alert tone="warning">Your CRM sync is delayed.</Alert>
            <Alert tone="error">Could not load customers.</Alert>
            <div className="flex flex-wrap gap-2">
              <StatusBadge>Neutral</StatusBadge>
              <StatusBadge tone="info">Info</StatusBadge>
              <StatusBadge tone="success">Paid</StatusBadge>
              <StatusBadge tone="warning">Promise due</StatusBadge>
              <StatusBadge tone="danger">Overdue</StatusBadge>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card title="Loading">
            <div className="flex justify-center py-6">
              <Spinner label="Loading demo" />
            </div>
          </Card>
          <Card title="Empty">
            <EmptyState title="No customers yet" description="Connect your CRM to import them." />
          </Card>
          <Card title="Error">
            <ErrorState description="Please try again." onRetry={() => {}} />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
