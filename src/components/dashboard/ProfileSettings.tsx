'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Key, Copy, RefreshCw, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProfileSettingsProps {
  user: any;
  onUpdate: () => void;
}

export default function ProfileSettings({ user, onUpdate }: ProfileSettingsProps) {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch(`/api/api-keys?userId=${user.id}`);
      const data = await res.json();
      setApiKeys(data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payload: any = {
      name: formData.get('name'),
    };

    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      payload.password = newPassword;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/users?id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      toast.success('Profile updated successfully');
      onUpdate();
      
      // Clear password fields
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: `API Key ${new Date().toLocaleDateString()}`,
          status: 'ACTIVE',
        }),
      });

      if (!res.ok) throw new Error('Failed to generate API key');

      toast.success('API key generated successfully');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to generate API key');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeApiKey = async (keyId: number) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    try {
      const res = await fetch(`/api/api-keys?id=${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REVOKED' }),
      });

      if (!res.ok) throw new Error('Failed to revoke API key');

      toast.success('API key revoked');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile Settings</CardTitle>
          </div>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user?.name}
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Change Password</h4>
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password (Optional)</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  disabled={loading}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage your API keys for integration</CardDescription>
              </div>
            </div>
            <Button onClick={handleGenerateApiKey} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No API keys generated yet</p>
              <p className="text-sm mt-2">Generate an API key to integrate with external systems</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{apiKey.name}</p>
                      <Badge variant={apiKey.status === 'ACTIVE' ? 'default' : 'destructive'}>
                        {apiKey.status}
                      </Badge>
                    </div>
                    <code className="text-xs bg-muted px-2 py-1 rounded block max-w-md truncate">
                      {apiKey.key}
                    </code>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(apiKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {apiKey.status === 'ACTIVE' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeApiKey(apiKey.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
