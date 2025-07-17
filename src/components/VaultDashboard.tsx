
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Lock, 
  LogOut, 
  Shield, 
  Key, 
  Globe,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { useVault } from '@/contexts/VaultContext';
import { VaultEntry } from './VaultEntry';
import { AddEntryDialog } from './AddEntryDialog';

export function VaultDashboard() {
  const { user, entries, lockVault, signOut } = useVault();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    
    const query = searchQuery.toLowerCase();
    return entries.filter(entry => 
      entry.title.toLowerCase().includes(query) ||
      entry.url?.toLowerCase().includes(query) ||
      entry.username?.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  // Calculate vault statistics
  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const entriesWithPasswords = entries.filter(e => e.password).length;
    const entriesWithUrls = entries.filter(e => e.url).length;
    const duplicateUrls = entries.reduce((acc, entry) => {
      if (entry.url) {
        acc[entry.url] = (acc[entry.url] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    const duplicateCount = Object.values(duplicateUrls).filter(count => count > 1).length;

    return {
      totalEntries,
      entriesWithPasswords,
      entriesWithUrls,
      duplicateCount,
    };
  }, [entries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-vault-50 to-vault-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-vault-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 vault-gradient rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SecureVault</h1>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" onClick={lockVault}>
                <Lock className="w-4 h-4 mr-2" />
                Lock
              </Button>
              <Button variant="ghost" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="vault-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-vault-600" />
                <span className="text-2xl font-bold">{stats.totalEntries}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="vault-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">With Passwords</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold">{stats.entriesWithPasswords}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="vault-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Websites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <span className="text-2xl font-bold">{stats.entriesWithUrls}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="vault-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Duplicates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-2xl font-bold">{stats.duplicateCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your vault..."
              className="pl-10"
            />
          </div>
          
          <AddEntryDialog />
        </div>

        {/* Entries Grid */}
        {filteredEntries.length === 0 ? (
          <Card className="vault-card text-center py-12">
            <CardContent>
              {entries.length === 0 ? (
                <>
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <CardTitle className="mb-2">Your vault is empty</CardTitle>
                  <CardDescription className="mb-6">
                    Add your first password entry to get started with SecureVault
                  </CardDescription>
                  <AddEntryDialog />
                </>
              ) : (
                <>
                  <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <CardTitle className="mb-2">No entries found</CardTitle>
                  <CardDescription>
                    Try adjusting your search terms or add a new entry
                  </CardDescription>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Results header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold">
                  {searchQuery ? 'Search Results' : 'Your Passwords'}
                </h2>
                <Badge variant="secondary">
                  {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                </Badge>
              </div>
              
              {searchQuery && (
                <Button variant="ghost" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              )}
            </div>

            {/* Entries grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredEntries.map((entry) => (
                <VaultEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
