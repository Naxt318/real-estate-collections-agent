import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in · Collections Intelligence' };

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Use your work email to access your collections dashboard."
    >
      <LoginForm />
    </AuthCard>
  );
}
