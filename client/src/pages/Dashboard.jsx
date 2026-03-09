// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

// ── API fetchers ──
const fetchProductionMetrics = async () => {
  const { data } = await api.get('/api/analytics/production');
  return data.data;
};

const fetchMonthlyTrends = async () => {
  const { data } = await api.get('/api/analytics/trends');
  return data.data;
};

const fetchStockMovement = async () => {
  const { data } = await api.get('/api/analytics/stock-movement');
  return data.data;
};

const fetchLowStock = async () => {
  const { data } = await api.get('/api/inventory/low-stock');
  return data.data;
};

// ── Reusable components ──
const SectionTitle = ({ title, subtitle }) => (
  <div className="mb-4">
    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 transition-colors duration-200">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 transition-colors duration-200">{subtitle}</p>}
  </div>
);

const ChartCard = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 transition-colors duration-200 ${className}`}>
    {children}
  </div>
);

const LoadingChart = () => (
  <div className="h-64 flex items-center justify-center text-gray-300 dark:text-gray-600 text-sm animate-pulse">
    Loading chart...
  </div>
);

const EmptyChart = ({ message }) => (
  <div className="h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2">
    <span className="text-3xl">📊</span>
    <p className="text-sm font-medium">{message}</p>
    <p className="text-xs">Complete production orders to generate data</p>
  </div>
);

const LiveBadge = ({ isLive }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors duration-200 ${
    isLive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400 dark:bg-gray-600'}`} />
    {isLive ? 'Live' : 'Connecting...'}
  </span>
);

const StatCard = ({ label, value, unit, color }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${color} p-5 shadow-sm transition-colors duration-200`}>
    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
    <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1 transition-colors duration-200">
      {typeof value === 'number' ? value.toLocaleString() : value}
      {unit && <span className="text-sm font-medium text-gray-400 dark:text-gray-500 ml-1">{unit}</span>}
    </p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md px-3 py-2 text-xs transition-colors duration-200">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ── Main Dashboard ──
const Dashboard = () => {
  const { isAdmin } = useAuthStore();
  const [isSocketLive, setIsSocketLive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSocketLive(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const { data: production = [], isLoading: loadingProduction } = useQuery({
    queryKey: ['analytics', 'production'],
    queryFn: fetchProductionMetrics,
    enabled: isAdmin(),
  });

  const { data: trends = [], isLoading: loadingTrends } = useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: fetchMonthlyTrends,
    enabled: isAdmin(),
  });

  const { data: stockMovement = [], isLoading: loadingMovement } = useQuery({
    queryKey: ['analytics', 'stock-movement'],
    queryFn: fetchStockMovement,
    enabled: isAdmin(),
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: fetchLowStock,
    enabled: isAdmin(),
  });

  if (!isAdmin()) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white transition-colors duration-200">Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome to FactoryFlow</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center transition-colors duration-200">
          <p className="text-4xl mb-3">🏭</p>
          <p className="text-gray-600 dark:text-gray-300 font-semibold">Analytics are available to Admins only.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Use the sidebar to navigate to Inventory or Orders.</p>
        </div>
      </div>
    );
  }

  const totalUnits = production.reduce((sum, p) => sum + p.totalProduced, 0);
  const totalItems = production.length;
  const totalMonths = trends.length;
  const peakMonth = trends.reduce((max, t) => t.totalProduced > (max?.totalProduced ?? 0) ? t : max, null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white transition-colors duration-200">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-colors duration-200">Live production & inventory insights</p>
        </div>
        <LiveBadge isLive={isSocketLive} />
      </div>

      {/* Low Stock Alert Widget */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-5 flex items-start gap-4 shadow-sm animate-in fade-in transition-colors duration-200">
          <div className="text-red-500 text-2xl mt-0.5" aria-hidden="true">⚠️</div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-800 dark:text-red-400">Requires Attention: Low Stock Detected</h3>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1 mb-3">
              {lowStockItems.length} item(s) have dropped below their minimum stock threshold.
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map(item => (
                <span key={item._id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 shadow-sm transition-colors duration-200">
                  {item.name}
                  <span className="bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 px-1.5 py-0.5 rounded text-[10px]">
                    {item.currentStock} / {item.minStockLevel} {item.unit}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Units" value={totalUnits} unit="units" color="border-l-blue-500" />
        <StatCard label="Finished Goods" value={totalItems} color="border-l-purple-500" />
        <StatCard label="Active Months" value={totalMonths} color="border-l-green-500" />
        <StatCard label="Peak Month" value={peakMonth?.month ?? '—'} color="border-l-orange-400" />
      </div>

      {/* Chart Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <ChartCard>
          <SectionTitle title="Total Production by Item" subtitle="Lifetime units produced per finished good" />
          {loadingProduction ? <LoadingChart /> : production.length === 0 ? <EmptyChart message="No production data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={production} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalProduced" name="Units Produced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionTitle title="Monthly Production Trend" subtitle="Volume of units produced each month" />
          {loadingTrends ? <LoadingChart /> : trends.length === 0 ? <EmptyChart message="No monthly data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trends} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="totalProduced" name="Units" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Chart Row 2 */}
      <ChartCard>
        <SectionTitle title="Stock Movement" subtitle="Total units added vs deducted" />
        {loadingMovement ? <LoadingChart /> : stockMovement.length === 0 ? <EmptyChart message="No stock movement data yet" /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stockMovement} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              <Bar dataKey="added" name="Added (Outputs)" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="deducted" name="Deducted (Inputs)" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
};

export default Dashboard;