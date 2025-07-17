
import { useVault } from '@/contexts/VaultContext';
import { AuthForm } from '@/components/AuthForm';
import { UnlockForm } from '@/components/UnlockForm';
import { VaultDashboard } from '@/components/VaultDashboard';

export function VaultApp() {
  const { isAuthenticated, isUnlocked } = useVault();

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  if (!isUnlocked) {
    return <UnlockForm />;
  }

  return <VaultDashboard />;
}
