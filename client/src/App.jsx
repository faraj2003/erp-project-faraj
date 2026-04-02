import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Adjustments from './pages/Adjustments'; // <-- NEW IMPORT
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import Users from './pages/Users';
import Locations from './pages/Locations';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Protected — all authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/adjustments" element={<Adjustments />} /> {/* <-- NEW ROUTE */}
              <Route path="/orders" element={<Orders />} />
            </Route>
          </Route>

          {/* Protected — manager + admin only */}
          <Route element={<ProtectedRoute roles={['manager', 'admin']} />}>
            <Route element={<AppShell />}>
              <Route path="/orders/new" element={<NewOrder />} />
              <Route path="/locations" element={<Locations />} />
            </Route>
          </Route>

          {/* Protected — admin only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<AppShell />}>
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;