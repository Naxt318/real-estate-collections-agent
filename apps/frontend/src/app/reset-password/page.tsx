import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Reset password · Collections Intelligence' };

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Set a new password" description="Choose a new password for your account.">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
