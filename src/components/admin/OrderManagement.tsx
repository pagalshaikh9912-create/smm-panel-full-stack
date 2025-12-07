'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  userId: number;
  serviceId: number;
  link: string;
  quantity: number;
  charge: number;
  startCount: number | null;
  remains: number | null;
  status: string;
  createdAt: string;
}

interface Service {
  id: number;
  name: string;
  category: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, servicesRes, usersRes] = await Promise.all([
        fetch('/api/orders?limit=1000'),
        fetch('/api/services?limit=1000'),
        fetch('/api/users?limit=1000'),
      ]);

      const ordersData = await ordersRes.json();
      const servicesData = await servicesRes.json();
      const usersData = await usersRes.json();

      setOrders(ordersData);
      setServices(servicesData);
      setUsers(usersData);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getServiceName = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  const handleStatusUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;

    const formData = new FormData(e.currentTarget);
    const status = formData.get('status') as string;
    const startCount = formData.get('startCount');
    const remains = formData.get('remains');

    try {
      const payload: any = { status };
      if (startCount) payload.startCount = parseInt(startCount as string);
      if (remains) payload.remains = parseInt(remains as string);

      const res = await fetch(`/api/orders?id=${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update order');

      toast.success('Order updated successfully');
      setIsDialogOpen(false);
      setEditingOrder(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleRefund = async (order: Order) => {
    if (!confirm('Are you sure you want to refund this order?')) return;

    try {
      // Get user data
      const userRes = await fetch(`/api/users?id=${order.userId}`);
      const userData = await userRes.json();

      // Update user balance
      const newBalance = userData.balance + order.charge;
      await fetch(`/api/users?id=${order.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance }),
      });

      // Create refund transaction
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: order.userId,
          type: 'REFUND',
          amount: order.charge,
          balanceBefore: userData.balance,
          balanceAfter: newBalance,
          description: `Refund for order #${order.id}`,
          orderId: order.id,
        }),
      });

      // Update order status
      await fetch(`/api/orders?id=${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REFUNDED' }),
      });

      toast.success('Order refunded successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to refund order');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.link.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toString().includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'default';
      case 'PROCESSING': return 'secondary';
      case 'PENDING': return 'secondary';
      case 'CANCELLED': return 'destructive';
      case 'REFUNDED': return 'destructive';
      case 'PARTIAL': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Management</CardTitle>
        <CardDescription>Manage and track all orders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID or link..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>{getUserName(order.userId)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {getServiceName(order.serviceId)}
                  </TableCell>
                  <TableCell>{order.quantity.toLocaleString()}</TableCell>
                  <TableCell>${order.charge.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingOrder(order);
                        setIsDialogOpen(true);
                      }}
                      title="Update Order"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    {(order.status === 'PENDING' || order.status === 'PROCESSING') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRefund(order)}
                      >
                        Refund
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(order.link, '_blank')}
                      title="View Link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <form onSubmit={handleStatusUpdate}>
              <DialogHeader>
                <DialogTitle>Update Order #{editingOrder?.id}</DialogTitle>
                <DialogDescription>
                  Modify order status and details
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingOrder?.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PROCESSING">Processing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="PARTIAL">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="startCount">Start Count (Optional)</Label>
                  <Input
                    id="startCount"
                    name="startCount"
                    type="number"
                    defaultValue={editingOrder?.startCount || ''}
                    placeholder="Initial count"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="remains">Remains (Optional)</Label>
                  <Input
                    id="remains"
                    name="remains"
                    type="number"
                    defaultValue={editingOrder?.remains || ''}
                    placeholder="Remaining quantity"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Update Order</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
