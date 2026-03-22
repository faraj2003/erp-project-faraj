// src/pages/Dashboard.jsx
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';

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

// New fetcher for the Staff Dashboard
const fetchRecentOrders = async () => {
  const { data } = await api.get('/api/orders?page=1&limit=10');
  return data.data;
};

// ── Helpers ──
const formatAxisLabel = (value) => {
  if (typeof value !== 'string') return value;
  return value.length > 12 ? `${value.substring(0, 12)}...` : value;
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

const ErrorChart = ({ message = "Failed to load data" }) => (
  <div className="h-64 flex flex-col items-center justify-center text-red-400 dark:text-red-500 gap-2">
    <span className="text-3xl">⚠️</span>
    <p className="text-sm font-medium">{message}</p>
    <button 
      onClick={() => window.location.reload()} 
      className="mt-2 px-3 py-1 text-xs bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded transition-colors"
    >
      Retry
    </button>
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

// ── Staff Dashboard Component (For Non-Admins) ──
const StaffDashboard = ({ isSocketLive }) => {
  const { data: recentOrders = [], isLoading, isError } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: fetchRecentOrders,
  });

  const activeOrders = recentOrders.filter(o => o.status === 'Pending' || o.status === 'In Progress');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white transition-colors duration-200">Operator Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-colors duration-200">Your active production queue</p>
        </div>
        <LiveBadge isLive={isSocketLive} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ChartCard>
          <SectionTitle title="Action Required" subtitle="Orders currently pending or in progress" />
          
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse">Loading queue...</div>
          ) : isError ? (
            <div className="p-8 text-center text-red-500 dark:text-red-400 text-sm">Failed to load active orders.</div>
          ) : activeOrders.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <span className="text-2xl">☕</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">No active orders at the moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {activeOrders.map(order => (
                <div key={order._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-2 -mx-2 rounded transition-colors duration-150">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{order.orderNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        order.status === 'Pending' 
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-1.5">
                      <span><strong className="text-gray-800 dark:text-gray-200">To Produce:</strong> {order.outputs.map(o => `${o.quantityProduced}x ${o.itemId?.name}`).join(', ')}</span>
                      <span><strong className="text-gray-800 dark:text-gray-200">Requires:</strong> {order.inputs.map(i => `${i.quantityRequired}x ${i.itemId?.name}`).join(', ')}</span>
                    </div>
                  </div>
                  <a href="/orders" className="btn-secondary text-xs whitespace-nowrap self-start sm:self-center">View Details</a>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

// ── Main Dashboard ──
const Dashboard = () => {
  const { isAdmin } = useAuthStore();
  const isSocketLive = useSocketStore((state) => state.isConnected);

  const { data: production = [], isLoading: loadingProduction, isError: errorProduction } = useQuery({
    queryKey: ['analytics', 'production'],
    queryFn: fetchProductionMetrics,
    enabled: isAdmin(),
  });

  const { data: trends = [], isLoading: loadingTrends, isError: errorTrends } = useQuery({
    queryKey: ['analytics', 'trends'],
    queryFn: fetchMonthlyTrends,
    enabled: isAdmin(),
  });

  const { data: stockMovement = [], isLoading: loadingMovement, isError: errorMovement } = useQuery({
    queryKey: ['analytics', 'stock-movement'],
    queryFn: fetchStockMovement,
    enabled: isAdmin(),
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: fetchLowStock,
    enabled: isAdmin(),
  });

  // Render Staff Dashboard if user is not an admin
  if (!isAdmin()) {
    return <StaffDashboard isSocketLive={isSocketLive} />;
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
          {loadingProduction ? (
            <LoadingChart />
          ) : errorProduction ? (
            <ErrorChart message="Could not load production data" />
          ) : production.length === 0 ? (
            <EmptyChart message="No production data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={production} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="_id" 
                  tick={{ fontSize: 11, fill: '#9ca3af' }} 
                  angle={-30} 
                  textAnchor="end" 
                  interval={0} 
                  tickFormatter={formatAxisLabel} 
                />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalProduced" name="Units Produced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionTitle title="Monthly Production Trend" subtitle="Volume of units produced each month" />
          {loadingTrends ? (
            <LoadingChart />
          ) : errorTrends ? (
            <ErrorChart message="Could not load monthly trends" />
          ) : trends.length === 0 ? (
            <EmptyChart message="No monthly data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trends} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: '#9ca3af' }} 
                  angle={-30} 
                  textAnchor="end" 
                  interval={0} 
                  tickFormatter={formatAxisLabel}
                />
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
        {loadingMovement ? (
            <LoadingChart />
          ) : errorMovement ? (
            <ErrorChart message="Could not load stock movements" />
          ) : stockMovement.length === 0 ? (
            <EmptyChart message="No stock movement data yet" />
          ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stockMovement} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="_id" 
                tick={{ fontSize: 11, fill: '#9ca3af' }} 
                angle={-30} 
                textAnchor="end" 
                interval={0} 
                tickFormatter={formatAxisLabel}
              />
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