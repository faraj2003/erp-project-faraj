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

// UPDATED: Now fetches the new /api/analytics/trends endpoint
const fetchMonthlyTrends = async () => {
  const { data } = await api.get('/api/analytics/trends');
  return data.data; // Now returns velocity & trend data
};

const fetchStockMovement = async () => {
  const { data } = await api.get('/api/analytics/stock-movement');
  return data.data;
};

const fetchRecentOrders = async () => {
  const { data } = await api.get('/api/orders?page=1&limit=10');
  return data.data;
};

const fetchDashboardMetrics = async () => {
  const { data } = await api.get('/api/inventory/dashboard');
  return data.data;
};

// ── Helpers ──
const formatAxisLabel = (value) => {
  if (typeof value !== 'string') return value;
  return value.length > 12 ? `${value.substring(0, 12)}...` : value;
};

const SectionTitle = ({ title, subtitle }) => (
  <div className="mb-4">
    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
  </div>
);

const ChartCard = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 ${className}`}>
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
  </div>
);

const ErrorChart = ({ message = "Failed to load data" }) => (
  <div className="h-64 flex flex-col items-center justify-center text-red-400 gap-2">
    <span className="text-3xl">⚠️</span>
    <p className="text-sm font-medium">{message}</p>
    <button onClick={() => window.location.reload()} className="mt-2 px-3 py-1 text-xs bg-red-50 text-red-600 rounded">
      Retry
    </button>
  </div>
);

const LiveBadge = ({ isLive }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
    isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
    {isLive ? 'Live' : 'Connecting...'}
  </span>
);

const StatCard = ({ label, value, unit, color }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 border-l-4 ${color} p-5 shadow-sm`}>
    <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
    <p className="text-3xl font-black text-gray-800 dark:text-white mt-1">
      {typeof value === 'number' ? value.toLocaleString() : value}
      {unit && <span className="text-sm font-medium text-gray-400 ml-1">{unit}</span>}
    </p>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

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
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white">Operator Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Your active production queue</p>
        </div>
        <LiveBadge isLive={isSocketLive} />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <ChartCard>
          <SectionTitle title="Action Required" subtitle="Orders currently pending or in progress" />
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading queue...</div>
          ) : isError ? (
            <div className="p-8 text-center text-red-500 text-sm">Failed to load active orders.</div>
          ) : activeOrders.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
              <span className="text-2xl">☕</span>
              <p className="text-sm text-gray-500 mt-2 font-medium">No active orders at the moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {activeOrders.map(order => (
                <div key={order._id} className="py-4 flex justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{order.orderNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{order.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { isAdmin } = useAuthStore();
  const isSocketLive = useSocketStore((state) => state.isConnected);

  const { data: production = [], isLoading: loadingProduction, isError: errorProduction } = useQuery({ queryKey: ['analytics', 'production'], queryFn: fetchProductionMetrics, enabled: isAdmin() });
  const { data: trends = [], isLoading: loadingTrends, isError: errorTrends } = useQuery({ queryKey: ['analytics', 'trends'], queryFn: fetchMonthlyTrends, enabled: isAdmin() });
  const { data: stockMovement = [], isLoading: loadingMovement, isError: errorMovement } = useQuery({ queryKey: ['analytics', 'stock-movement'], queryFn: fetchStockMovement, enabled: isAdmin() });
  
  const { data: dashboardMetrics = {} } = useQuery({ queryKey: ['inventory', 'dashboard'], queryFn: fetchDashboardMetrics, enabled: isAdmin() });

  // ── NEW FEATURE: Reusable CSV Downloader ──
  const handleDownloadCSV = async (endpoint, filename) => {
    try {
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Failed to download ${filename}.`);
      console.error(error);
    }
  };

  if (!isAdmin()) return <StaffDashboard isSocketLive={isSocketLive} />;

  const totalUnits = production.reduce((sum, p) => sum + p.totalProduced, 0);
  const totalMonths = trends.length;
  // Adjusted logic if the backend trends format changed to metrics object
  const peakItem = trends.reduce((max, t) => (t.metrics?.totalConsumed || 0) > (max?.metrics?.totalConsumed ?? 0) ? t : max, null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Live production & inventory insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleDownloadCSV('/api/inventory/export/transactions', 'inventory_transactions.csv')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold py-1.5 px-4 rounded shadow-sm border border-gray-300 transition-colors"
          >
            📥 Export Transactions
          </button>
          <LiveBadge isLive={isSocketLive} />
        </div>
      </div>

      {dashboardMetrics.lowStockAlerts > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-5 flex items-start gap-4 shadow-sm">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-800 dark:text-red-400">Requires Attention: Low Stock Detected</h3>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1 mb-3">{dashboardMetrics.lowStockAlerts} item(s) have dropped below their threshold.</p>
          </div>
        </div>
      )}

      {dashboardMetrics.pendingAdjustmentsCount > 0 && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-5 shadow-sm">
           <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-400">Pending Approvals</h3>
           <p className="text-xs text-yellow-700 mt-1">There are {dashboardMetrics.pendingAdjustmentsCount} stock adjustments waiting for your review.</p>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="Total Valuation" 
          value={`$${(dashboardMetrics.totalValuation || 0).toFixed(2)}`} 
          color="border-l-emerald-500" 
        />
        <StatCard label="Total Units" value={totalUnits} unit="units" color="border-l-blue-500" />
        <StatCard label="Highest Velocity Item" value={peakItem?.item?.name ?? '—'} color="border-l-indigo-500" />
        <StatCard label="Daily Burn Rate" value={peakItem?.metrics?.averageDailyConsumption ?? '—'} unit="/day" color="border-l-orange-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <ChartCard>
          <SectionTitle title="Total Production by Item" subtitle="Lifetime units produced per finished good" />
          {loadingProduction ? <LoadingChart /> : errorProduction ? <ErrorChart /> : production.length === 0 ? <EmptyChart message="No data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={production} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} tickFormatter={formatAxisLabel} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalProduced" name="Units Produced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionTitle title="Consumption Velocity (30 Days)" subtitle="Fastest moving materials" />
          {loadingTrends ? <LoadingChart /> : errorTrends ? <ErrorChart /> : trends.length === 0 ? <EmptyChart message="No data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trends} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="item.name" tick={{ fontSize: 11, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} tickFormatter={formatAxisLabel} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="metrics.totalConsumed" name="Total Consumed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard>
        <SectionTitle title="Stock Movement" subtitle="Total units added vs deducted" />
        {loadingMovement ? <LoadingChart /> : errorMovement ? <ErrorChart /> : stockMovement.length === 0 ? <EmptyChart message="No data yet" /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stockMovement} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#9ca3af' }} angle={-30} textAnchor="end" interval={0} tickFormatter={formatAxisLabel} />
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