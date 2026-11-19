import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Customers · Collections Intelligence' };

// TODO: load real data from the backend API once it exists.
export default function CustomersPage() {
  return (
    <>
      <PageHeader title="Customers" description="Homebuyers, their bookings and what they owe." />
      <Card>
        <EmptyState
          title="No customers yet"
          description="Customers appear here once your CRM is connected."
        />
      </Card>
    </>
  );
}
