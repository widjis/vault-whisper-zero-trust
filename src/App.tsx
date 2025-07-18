
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VaultProvider } from '@/contexts/VaultContext';
import { ThemeContextProvider } from '@/contexts/ThemeContext';
import { VaultApp } from './pages/VaultApp';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContextProvider>
        <VaultProvider>
          <VaultApp />
        </VaultProvider>
      </ThemeContextProvider>
    </QueryClientProvider>
  );
}

export default App;
