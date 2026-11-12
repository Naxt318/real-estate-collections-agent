import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Analytics · Collections Intelligence' };

// TODO: load real data from the backend API once it exists.
export default function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" description="How well collections are going over time." />
      <Card>
        <EmptyState
          title="No analytics yet"
          description="Recovery, promise fulfilment and contact rates appear once there is collection history."
        />
      </Card>
    </>
  );
}
