// src/__tests__/utils/renderWithProviders.jsx
// A custom render function that wraps any component with the providers
// it needs to function: React Query client + React Router.
// Use this instead of RTL's raw render() for page-level components.

import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

export const renderWithProviders = (ui, { route = '/', initialEntries = ['/'] } = {}) => {
  // Fresh QueryClient per test — no cache leakage between tests
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,    // Don't retry on failure — tests should be deterministic
        staleTime: 0,
      },
    },
  });

  const Wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper }),
    queryClient,
  };
};
