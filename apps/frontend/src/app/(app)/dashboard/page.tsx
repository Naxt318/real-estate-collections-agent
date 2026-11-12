import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Dashboard · Collections Intelligence' };

// TODO: load real data from the backend API once it exists.
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Outstanding amounts, overdue instalments and collection activity at a glance."
      />
      <Card>
        <EmptyState
          title="No collection data yet"
          description="Connect your CRM to see outstanding amounts, upcoming instalments and recent collection activity."
        />
      </Card>
    </>
  );
}
