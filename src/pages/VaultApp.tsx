
import { useVault } from '@/contexts/VaultContext';
import { AuthForm } from '@/components/AuthForm';
import { UnlockForm } from '@/components/UnlockForm';
import { VaultDashboard } from '@/components/VaultDashboard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Container, Box } from '@mui/material';

export function VaultApp() {
  const { isAuthenticated, isUnlocked } = useVault();

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 3,
          }}
        >
          <AuthForm />
        </Box>
      </Container>
    );
  }

  if (!isUnlocked) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 3,
          }}
        >
          <UnlockForm />
        </Box>
      </Container>
    );
  }

  return (
    <AppLayout>
      <VaultDashboard />
    </AppLayout>
  );
}
