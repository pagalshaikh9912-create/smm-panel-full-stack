'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Service {
  id: number;
  name: string;
  category: string;
  type: string;
  description: string | null;
  rate: number;
  minOrder: number;
  maxOrder: number;
  status: string;
}

interface ServiceBrowserProps {
  user: any;
  onOrderPlaced: () => void;
}

export default function ServiceBrowser({ user, onOrderPlaced }: ServiceBrowserProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/services?status=ACTIVE&limit=1000');
      const data = await res.json();
      setServices(data);
    } catch (error) {
      toast.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedService || !user) return;

    const formData = new FormData(e.currentTarget);
    const link = formData.get('link') as string;
    const quantity = parseInt(formData.get('quantity') as string);

    // Validate quantity
    if (quantity < selectedService.minOrder || quantity > selectedService.maxOrder) {
      toast.error(`Quantity must be between ${selectedService.minOrder} and ${selectedService.maxOrder}`);
      return;
    }

    // Calculate cost
    const charge = (quantity / 1000) * selectedService.rate;

    // Check balance
    if (charge > user.balance) {
      toast.error('Insufficient balance. Please add funds to your wallet.');
      return;
    }

    try {
      setOrderLoading(true);

      // Create order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          serviceId: selectedService.id,
          link,
          quantity,
          charge,
          status: 'PENDING',
        }),
      });

      if (!orderRes.ok) throw new Error('Failed to create order');
      const order = await orderRes.json();

      // Deduct balance
      const newBalance = user.balance - charge;
      await fetch(`/api/users?id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance }),
      });

      // Create transaction
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'ORDER',
          amount: -charge,
          balanceBefore: user.balance,
          balanceAfter: newBalance,
          description: `Order #${order.id} - ${selectedService.name}`,
          orderId: order.id,
        }),
      });

      toast.success('Order placed successfully!');
      setIsDialogOpen(false);
      setSelectedService(null);
      onOrderPlaced();
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setOrderLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(services.map(s => s.category)));

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Browse Services</CardTitle>
          <CardDescription>Choose from our wide range of SMM services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map((service) => (
          <Card key={service.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{service.category}</Badge>
                    <Badge variant="outline">{service.type}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {service.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {service.description}
                </p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate:</span>
                  <span className="font-semibold">${service.rate}/1k</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min/Max:</span>
                  <span>{service.minOrder} - {service.maxOrder.toLocaleString()}</span>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => {
                  setSelectedService(service);
                  setIsDialogOpen(true);
                }}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Order Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleOrderSubmit}>
            <DialogHeader>
              <DialogTitle>Place Order</DialogTitle>
              <DialogDescription>
                {selectedService?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="link">Link</Label>
                <Input
                  id="link"
                  name="link"
                  type="url"
                  placeholder="https://instagram.com/username"
                  required
                  disabled={orderLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the social media profile/post link
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={selectedService?.minOrder}
                  max={selectedService?.maxOrder}
                  placeholder={`Min: ${selectedService?.minOrder}`}
                  required
                  disabled={orderLoading}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 0;
                    const cost = (qty / 1000) * (selectedService?.rate || 0);
                    const costElement = document.getElementById('orderCost');
                    if (costElement) {
                      costElement.textContent = `$${cost.toFixed(2)}`;
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Min: {selectedService?.minOrder.toLocaleString()} | Max: {selectedService?.maxOrder.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate:</span>
                  <span className="font-medium">${selectedService?.rate}/1k</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Balance:</span>
                  <span className="font-medium">${user?.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-2 border-t">
                  <span>Total Cost:</span>
                  <span id="orderCost">$0.00</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={orderLoading}>
                {orderLoading ? 'Placing Order...' : 'Place Order'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
