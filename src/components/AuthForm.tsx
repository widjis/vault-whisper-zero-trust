
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Shield, Lock } from 'lucide-react';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

export function AuthForm() {
  const { signUp, signIn, isLoading } = useVault();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent, type: 'signin' | 'signup') => {
    e.preventDefault();
    
    if (!form.email || !form.password) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'signup' && form.password !== form.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (type === 'signup') {
        await signUp(form.email, form.password);
      } else {
        await signIn(form.email, form.password);
      }
    } catch (error) {
      toast({
        title: type === 'signup' ? 'Sign up failed' : 'Sign in failed',
        description: error instanceof Error ? error.message : 'Please try again.',
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
          <h1 className="text-3xl font-bold text-gray-900">SecureVault</h1>
          <p className="text-gray-600 mt-2">Zero-knowledge password manager</p>
          <p className="text-sm text-vault-600 mt-1">PT Merdeka Tsingshan Indonesia</p>
        </div>

        <Card className="vault-card shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Your passwords are encrypted locally and never stored in plain text
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={(e) => handleSubmit(e, 'signin')} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your.email@company.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signin-password">Master Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter your master password"
                        className="pr-10"
                        required
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
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={(e) => handleSubmit(e, 'signup')} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your.email@company.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="signup-password">Master Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Create a strong master password"
                        className="pr-10"
                        required
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
                    {form.password && (
                      <PasswordStrengthMeter password={form.password} className="mt-2" />
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your master password"
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Zero-Knowledge Security</p>
                  <p className="mt-1">Your master password encrypts all data locally. We never see your passwords.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
