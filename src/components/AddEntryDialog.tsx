
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { PasswordGenerator } from './PasswordGenerator';

export function AddEntryDialog() {
  const { addEntry } = useVault();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    title: '',
    url: '',
    username: '',
    password: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for this entry.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addEntry(form);
      setForm({
        title: '',
        url: '',
        username: '',
        password: '',
        notes: '',
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Failed to add entry',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="vault-gradient text-white shadow-lg hover:shadow-xl transition-shadow">
          <Plus className="w-5 h-5 mr-2" />
          Add Entry
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Entry</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entry Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Gmail, Facebook, Company Portal"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Email or username"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter or generate a password"
                    className="pr-10"
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
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional information..."
                  rows={4}
                />
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button type="submit" className="flex-1">
                  Add Entry
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
            
            {/* Password Generator */}
            <div>
              <PasswordGenerator
                onPasswordGenerated={(password) => 
                  setForm(prev => ({ ...prev, password }))
                }
              />
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
