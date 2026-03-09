// src/components/ProtectedRoute.jsx
// Wraps any route that requires authentication.
// Optionally accepts a 'roles' prop to restrict access to specific roles.
//
// Usage:
//   <Route element={<ProtectedRoute />}>           ← any logged-in user
//     <Route path="/inventory" element={<Inventory />} />
//   </Route>
//
//   <Route element={<ProtectedRoute roles={['admin']} />}>   ← admin only
//     <Route path="/users" element={<Users />} />
//   </Route>

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ProtectedRoute = ({ roles }) => {
  const { isAuthenticated, user } = useAuthStore();

  // Not logged in at all → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → redirect to dashboard (or a 403 page)
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // All good — render the child route
  return <Outlet />;
};

export default ProtectedRoute;
