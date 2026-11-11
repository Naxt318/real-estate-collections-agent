import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Reset password · Collections Intelligence' };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Set a new password" description="Choose a new password for your account.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
