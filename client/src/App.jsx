import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Adjustments from './pages/Adjustments';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import Users from './pages/Users';
import Locations from './pages/Locations';
import Categories from './pages/Categories';
import Units from './pages/Units';
import Procurement from './pages/Procurement';

import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import {useSocketStore} from './store/socketStore'; // ✅ make sure this exists
import CycleCounts from './pages/CycleCounts';
import Bom from './pages/BOM';

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

  // ✅ FIX: Hook must be inside component
  useEffect(() => {
    const socket = useSocketStore.getState().socket;

    if (!socket) return;

    const handler = (data) => {
      alert(`PROCUREMENT ALERT from ${data.sender}:\n\n${data.message}`);
    };

    socket.on('custom_alert', handler);

    return () => {
      socket.off('custom_alert', handler);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Protected — all authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inventory/cycle-counts" element={<CycleCounts />} />
              <Route path="/inventory/boms" element={<Bom />} />
              <Route path="/adjustments" element={<Adjustments />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/procurement" element={<Procurement />} />
            </Route>
          </Route>

          {/* Protected — manager + admin only */}
          <Route element={<ProtectedRoute roles={['manager', 'admin']} />}>
            <Route element={<AppShell />}>
              <Route path="/orders/new" element={<NewOrder />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/units" element={<Units />} />
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