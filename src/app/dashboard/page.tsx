import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import UserDashboard from '@/components/dashboard/UserDashboard';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login?redirect=/dashboard');
  }

  if (session.role === 'ADMIN') {
    redirect('/admin');
  }

  return <UserDashboard />;
}
