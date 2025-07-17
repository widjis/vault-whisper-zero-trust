
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Calendar,
  User,
  Lock,
  Globe,
  FileText
} from 'lucide-react';
import { VaultEntry as VaultEntryType } from '@/lib/crypto';
import { SecureStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useVault } from '@/contexts/VaultContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { PasswordGenerator } from './PasswordGenerator';

interface VaultEntryProps {
  entry: VaultEntryType;
}

export function VaultEntry({ entry }: VaultEntryProps) {
  const { updateEntry, deleteEntry } = useVault();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    title: entry.title,
    url: entry.url || '',
    username: entry.username || '',
    password: entry.password || '',
    notes: entry.notes || '',
  });

  const handleCopy = async (text: string, label: string) => {
    try {
      await SecureStorage.copyToClipboard(text);
      toast({
        title: `${label} copied`,
        description: 'Copied to clipboard (will clear in 30 seconds).',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: `Failed to copy ${label.toLowerCase()}.`,
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateEntry(entry.id!, editForm);
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update entry.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await deleteEntry(entry.id!);
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete entry.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="vault-card hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{entry.title}</CardTitle>
              {entry.url && (
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Globe className="w-3 h-3 mr-1" />
                  <span className="truncate max-w-[200px]">{entry.url}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => window.open(entry.url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-1">
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Entry</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={editForm.title}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        type="url"
                        value={editForm.url}
                        onChange={(e) => setEditForm(prev => ({ ...prev, url: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={editForm.username}
                        onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={editForm.password}
                          onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
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
                      {editForm.password && (
                        <PasswordStrengthMeter password={editForm.password} className="mt-2" />
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={editForm.notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button onClick={handleSave} className="flex-1">
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <PasswordGenerator
                      onPasswordGenerated={(password) => 
                        setEditForm(prev => ({ ...prev, password }))
                      }
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {entry.username && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Username</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm">{entry.username}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(entry.username!, 'Username')}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
        
        {entry.password && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Password</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm">
                {showPassword ? entry.password : '••••••••'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(entry.password!, 'Password')}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
        
        {entry.notes && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Notes</span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.notes}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>Created: {formatDate(entry.createdAt)}</span>
          </div>
          {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>Updated: {formatDate(entry.updatedAt)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
