import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login?redirect=/admin');
  }

  if (session.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <AdminDashboard />;
}
