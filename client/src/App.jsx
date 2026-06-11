import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';

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

// ── NEW IMPORT FOR RULES ENGINE ──
import Approvals from './pages/Approvals';

import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import { useSocketStore } from './store/socketStore'; 
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

  useEffect(() => {
    const socket = useSocketStore.getState().socket;

    if (!socket) return;

    const handler = (data) => {
      // Replaced the native alert() with a modern toast notification
      toast.info(`Procurement Alert: ${data.sender}`, {
        description: data.message,
        duration: 6000,
      });
    };

    socket.on('custom_alert', handler);

    return () => {
      socket.off('custom_alert', handler);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* ── Global Toast Container Added Here ── */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton 
        theme="light" 
        toastOptions={{
          style: { backdropFilter: 'blur(10px)', background: 'rgba(255, 255, 255, 0.9)' }
        }} 
      />
      
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

          {/* ── THE FIX: Protected — Approvers only ── */}
          {/* Pulled out into its own block so shop_managers don't get access to Locations/Categories accidentally */}
          <Route element={<ProtectedRoute roles={['admin', 'manager', 'shop_manager']} />}>
            <Route element={<AppShell />}>
              <Route path="/approvals" element={<Approvals />} />
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