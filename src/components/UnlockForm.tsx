
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Shield, LogOut } from 'lucide-react';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/hooks/use-toast';

export function UnlockForm() {
  const { user, unlockVault, signOut, isLoading } = useVault();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: 'Password required',
        description: 'Please enter your master password.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await unlockVault(password);
      setPassword('');
    } catch (error) {
      toast({
        title: 'Unlock failed',
        description: 'Invalid master password. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vault-50 to-vault-100 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 vault-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">{user?.email}</p>
          <p className="text-sm text-vault-600 mt-1">Enter your master password to unlock your vault</p>
        </div>

        <Card className="vault-card shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>Unlock Your Vault</CardTitle>
            <CardDescription>
              Your vault is encrypted and locked for security
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="master-password">Master Password</Label>
                <div className="relative">
                  <Input
                    id="master-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your master password"
                    className="pr-10"
                    required
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? 'Unlocking...' : 'Unlock Vault'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={signOut} className="text-sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
