import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in · Collections Intelligence' };

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" description="Sign in to your collections dashboard.">
      <LoginForm />
    </AuthLayout>
  );
}
