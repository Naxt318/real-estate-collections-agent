import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Collections · Collections Intelligence' };

// TODO: load real data from the backend API once it exists.
export default function CollectionsPage() {
  return (
    <>
      <PageHeader
        title="Collections"
        description="Calls, payment promises, disputes and escalations."
      />
      <Card>
        <EmptyState
          title="No collection activity yet"
          description="Upcoming calls, payment promises and disputes will appear here."
        />
      </Card>
    </>
  );
}
