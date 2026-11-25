import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { RequestAccessForm } from '@/components/auth/request-access-form';

export const metadata: Metadata = { title: 'Request access · Collections Intelligence' };

export default function RequestAccessPage() {
  return (
    <AuthLayout
      title="Request access"
      description="Tell us about your company. Our team reviews every request and emails you a link to set up your account once it's approved."
    >
      <RequestAccessForm />
    </AuthLayout>
  );
}
