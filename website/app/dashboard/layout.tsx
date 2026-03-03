import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ErrorBoundary } from '@/components/error-boundary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <ErrorBoundary>{children}</ErrorBoundary>
    </DashboardLayout>
  );
}
