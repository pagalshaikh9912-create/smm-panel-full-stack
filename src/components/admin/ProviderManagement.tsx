'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface Provider {
  id: number;
  name: string;
  apiUrl: string;
  apiKey: string;
  status: string;
  createdAt: string;
}

export default function ProviderManagement() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/providers?limit=1000');
      const data = await res.json();
      setProviders(data);
    } catch (error) {
      toast.error('Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      name: formData.get('name'),
      apiUrl: formData.get('apiUrl'),
      apiKey: formData.get('apiKey'),
      status: formData.get('status'),
    };

    try {
      const url = editingProvider 
        ? `/api/providers?id=${editingProvider.id}` 
        : '/api/providers';
      const method = editingProvider ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save provider');

      toast.success(editingProvider ? 'Provider updated' : 'Provider created');
      setIsDialogOpen(false);
      setEditingProvider(null);
      fetchProviders();
    } catch (error) {
      toast.error('Failed to save provider');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    try {
      const res = await fetch(`/api/providers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      toast.success('Provider deleted');
      fetchProviders();
    } catch (error) {
      toast.error('Failed to delete provider');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Provider Management</CardTitle>
            <CardDescription>Manage API provider integrations</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingProvider(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingProvider ? 'Edit Provider' : 'Add New Provider'}</DialogTitle>
                  <DialogDescription>
                    {editingProvider ? 'Update provider details' : 'Add a new SMM service provider'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Provider Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      defaultValue={editingProvider?.name} 
                      placeholder="e.g., SMM Provider API"
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="apiUrl">API URL</Label>
                    <Input 
                      id="apiUrl" 
                      name="apiUrl" 
                      defaultValue={editingProvider?.apiUrl} 
                      placeholder="https://api.provider.com/v2"
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input 
                      id="apiKey" 
                      name="apiKey" 
                      type="password"
                      defaultValue={editingProvider?.apiKey} 
                      placeholder="Enter API key"
                      required 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingProvider?.status || 'ACTIVE'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">{editingProvider ? 'Update' : 'Create'} Provider</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider Name</TableHead>
                <TableHead>API URL</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No providers found. Add your first provider to get started.
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {provider.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {provider.apiUrl}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {provider.apiKey.substring(0, 20)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {provider.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(provider.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingProvider(provider);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(provider.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
