// src/components/layout/AppShell.jsx
// The persistent application frame that wraps all authenticated pages.
// Contains:
//   - Sidebar: navigation links filtered by user role
//   - Topbar: current page title + user info + logout button
//   - Main content area: renders child routes via <Outlet />

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useInventorySocket } from '../../hooks/useInventorySocket';

// Role-aware nav items
const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: '📊',
    roles: ['staff', 'manager', 'admin', 'shop_worker', 'dispatch_manager'],
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: '📦',
    roles: ['staff', 'manager', 'admin', 'shop_worker', 'dispatch_manager', 'procurement_manager'],
  },
  {
    label: 'Adjustments',
    path: '/adjustments',
    icon: '📝',
    roles: ['staff', 'manager', 'admin', 'shop_worker', 'dispatch_manager'], 
  },
  {
    label: 'Orders',
    path: '/orders',
    icon: '🏭',
    roles: ['staff', 'manager', 'admin', 'shop_worker', 'dispatch_manager'],
  },
  {
    label: 'Locations', // <-- RESTORED LOCATIONS BUTTON
    path: '/locations',
    icon: '🏢',
    roles: ['manager', 'admin'],
  },
  {
    label: 'Users',
    path: '/users',
    icon: '👥',
    roles: ['admin'],
  },
];

const AppShell = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Dark Mode State & Persistence
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Mount the real-time socket for all authenticated pages
  useInventorySocket();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter nav items based on logged-in user's role
  const visibleNav = navItems.filter((item) => item.roles.includes(user?.role));

  const roleBadgeColor = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    staff: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      {/* ── SIDEBAR ── */}
      <aside className="w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-sm flex-shrink-0 transition-colors duration-200">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <h1 className="text-xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
            ⚙️ FactoryFlow
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Production ERP</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom of sidebar */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user?.name}</p>
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  roleBadgeColor[user?.role] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0 shadow-sm transition-colors duration-200">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Welcome back, <span className="font-semibold text-gray-800 dark:text-gray-200">{user?.name}</span>
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Toggle Dark Mode"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors duration-150"
            >
              <span>🚪</span> Logout
            </button>
          </div>
        </header>

        {/* Page content — child routes render here */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;