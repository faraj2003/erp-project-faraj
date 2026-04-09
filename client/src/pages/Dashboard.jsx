import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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

const fetchRecentOrders = async () => {
  const { data } = await api.get('/api/orders?page=1&limit=10');
  return data.data;
};

const fetchDashboardMetrics = async () => {
  const { data } = await api.get('/api/inventory/dashboard');
  return data.data;
};

// Fetch full inventory for Lookups
const fetchFullInventory = async () => {
  const { data } = await api.get('/api/inventory');
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

const LoadingChart = () => <div className="h-64 flex items-center justify-center text-gray-300 animate-pulse">Loading chart...</div>;
const EmptyChart = ({ message }) => <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2"><span className="text-3xl">📊</span><p className="text-sm font-medium">{message}</p></div>;
const ErrorChart = ({ message = "Failed to load data" }) => (
  <div className="h-64 flex flex-col items-center justify-center text-red-400 gap-2">
    <span className="text-3xl">⚠️</span><p className="text-sm font-medium">{message}</p>
    <button onClick={() => window.location.reload()} className="mt-2 px-3 py-1 text-xs bg-red-50 text-red-600 rounded">Retry</button>
  </div>
);

const LiveBadge = ({ isLive }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
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
      {payload.map((p) => <p key={p.dataKey} style={{ color: p.color }} className="font-medium">{p.name}: {p.value.toLocaleString()}</p>)}
    </div>
  );
};

const StaffDashboard = ({ isSocketLive }) => {
  const { data: recentOrders = [], isLoading, isError } = useQuery({ queryKey: ['orders', 'recent'], queryFn: fetchRecentOrders });
  const activeOrders = recentOrders.filter(o => o.status === 'Pending' || o.status === 'In Progress');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-extrabold text-gray-800">Operator Dashboard</h2><p className="text-sm text-gray-500 mt-0.5">Your active production queue</p></div>
        <LiveBadge isLive={isSocketLive} />
      </div>
      <ChartCard>
        <SectionTitle title="Action Required" subtitle="Orders currently pending or in progress" />
        {isLoading ? <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading queue...</div> : isError ? <div className="p-8 text-center text-red-500 text-sm">Failed to load active orders.</div> : activeOrders.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200"><span className="text-2xl">☕</span><p className="text-sm text-gray-500 mt-2 font-medium">No active orders.</p></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeOrders.map(order => (
              <div key={order._id} className="py-4 flex justify-between gap-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-sm font-bold text-blue-600">{order.orderNumber}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
};

const Dashboard = () => {
  const { isAdmin } = useAuthStore();
  const isSocketLive = useSocketStore((state) => state.isConnected);

  // States for Lookups
  const [selectedItemInfo, setSelectedItemInfo] = useState(null);
  const [selectedSupplierInfo, setSelectedSupplierInfo] = useState(null);

  // Queries
  const { data: production = [], isLoading: loadingProduction, isError: errorProduction } = useQuery({ queryKey: ['analytics', 'production'], queryFn: fetchProductionMetrics, enabled: isAdmin() });
  const { data: trends = [], isLoading: loadingTrends, isError: errorTrends } = useQuery({ queryKey: ['analytics', 'trends'], queryFn: fetchMonthlyTrends, enabled: isAdmin() });
  const { data: stockMovement = [], isLoading: loadingMovement, isError: errorMovement } = useQuery({ queryKey: ['analytics', 'stock-movement'], queryFn: fetchStockMovement, enabled: isAdmin() });
  const { data: dashboardMetrics = {} } = useQuery({ queryKey: ['inventory', 'dashboard'], queryFn: fetchDashboardMetrics, enabled: isAdmin() });
  
  // Full inventory for Lookup features
  const { data: inventory = [] } = useQuery({ queryKey: ['inventory', 'full'], queryFn: fetchFullInventory, enabled: isAdmin() });

  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Map();
    inventory.forEach(item => {
      if (item.supplier?.name) {
        if (!suppliers.has(item.supplier.name)) {
          suppliers.set(item.supplier.name, { ...item.supplier, itemsSupplied: [] });
        }
        suppliers.get(item.supplier.name).itemsSupplied.push(item);
      }
    });
    return Array.from(suppliers.values());
  }, [inventory]);

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
  const peakItem = trends.reduce((max, t) => (t.metrics?.totalConsumed || 0) > (max?.metrics?.totalConsumed ?? 0) ? t : max, null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Live production & inventory insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleDownloadCSV('/api/inventory/export/transactions', 'inventory_transactions.csv')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold py-1.5 px-4 rounded shadow-sm border border-gray-300">
            📥 Export Transactions
          </button>
          <LiveBadge isLive={isSocketLive} />
        </div>
      </div>

      {/* ── QUICK LOOKUPS (Req 1 & 2) ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6 flex items-center gap-6">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">🔍 Quick Item Lookup</label>
          <select 
            className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50"
            onChange={(e) => {
              if(!e.target.value) return;
              setSelectedItemInfo(inventory.find(i => i._id === e.target.value));
              e.target.value = ""; // reset
            }}
          >
            <option value="">-- Select an Item to view details --</option>
            {inventory.map(i => <option key={i._id} value={i._id}>{i.name} ({i.sku})</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">🏢 Supplier Lookup</label>
          <select 
            className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50"
            onChange={(e) => {
              if(!e.target.value) return;
              setSelectedSupplierInfo(uniqueSuppliers.find(s => s.name === e.target.value));
              e.target.value = ""; // reset
            }}
          >
            <option value="">-- Select a Supplier to view details --</option>
            {uniqueSuppliers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Alerts */}
      {dashboardMetrics.lowStockAlerts > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-red-800">Requires Attention: Low Stock Detected</h3>
          <p className="text-xs text-red-600 mt-1">{dashboardMetrics.lowStockAlerts} item(s) have dropped below their threshold.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Valuation" value={`$${(dashboardMetrics.totalValuation || 0).toFixed(2)}`} color="border-l-emerald-500" />
        <StatCard label="Total Units" value={totalUnits} unit="units" color="border-l-blue-500" />
        <StatCard label="Highest Velocity Item" value={peakItem?.item?.name ?? '—'} color="border-l-indigo-500" />
        <StatCard label="Daily Burn Rate" value={peakItem?.metrics?.averageDailyConsumption ?? '—'} unit="/day" color="border-l-orange-400" />
      </div>

      {/* Charts */}
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
          {/* Req 3: Renamed to Material Usage Rate */}
          <SectionTitle title="Material Usage Rate (30 Days)" subtitle="Fastest moving materials" />
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

      {/* ── ITEM INFO MODAL ── */}
      {selectedItemInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedItemInfo.name}</h3>
                <p className="text-sm text-gray-500 font-mono mt-1">{selectedItemInfo.sku} | <span className="uppercase text-blue-600">{selectedItemInfo.type.replace('_', ' ')}</span></p>
              </div>
              <button onClick={() => setSelectedItemInfo(null)} className="text-gray-400 hover:text-red-500 text-2xl font-bold">×</button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div><span className="text-gray-500 font-medium">Brand/Company:</span> <span className="font-bold text-gray-800">{selectedItemInfo.productCompanyName || 'N/A'}</span></div>
              <div><span className="text-gray-500 font-medium">Category:</span> <span className="font-bold text-gray-800">{selectedItemInfo.categoryId?.name || 'Uncategorized'}</span></div>
              <div><span className="text-gray-500 font-medium">Base Unit:</span> <span className="font-bold text-gray-800 uppercase">{selectedItemInfo.baseUnit}</span></div>
              <div><span className="text-gray-500 font-medium">Dimensions:</span> <span className="font-bold text-gray-800">{selectedItemInfo.dimensions || 'N/A'}</span></div>
              <div><span className="text-gray-500 font-medium">Shelf Life:</span> <span className="font-bold text-gray-800">{selectedItemInfo.shelfLife || 'N/A'}</span></div>
              <div><span className="text-gray-500 font-medium">Cost / Value:</span> <span className="font-bold text-gray-800">${selectedItemInfo.costPerUnit || 0} / ${selectedItemInfo.valuePerUnit || 0}</span></div>
              
              <div className="col-span-2 mt-2 pt-4 border-t border-gray-100">
                <h4 className="font-bold text-gray-700 mb-2">Supplier Details</h4>
                <p><span className="text-gray-500">Name:</span> {selectedItemInfo.supplier?.name || 'N/A'}</p>
                <p><span className="text-gray-500">Contact:</span> {selectedItemInfo.supplier?.contactInfo || 'N/A'}</p>
              </div>

              <div className="col-span-2 mt-2 pt-4 border-t border-gray-100">
                <h4 className="font-bold text-gray-700 mb-2">Alert Thresholds</h4>
                <div className="flex gap-4">
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded">Orange: {selectedItemInfo.alertLevels?.orange || 0}</span>
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded">Red: {selectedItemInfo.alertLevels?.red || 0}</span>
                  <span className="bg-red-900 text-white px-3 py-1 rounded">Critical: {selectedItemInfo.alertLevels?.critical || 0}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
              <button onClick={() => setSelectedItemInfo(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPPLIER INFO MODAL ── */}
      {selectedSupplierInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-blue-900">Supplier: {selectedSupplierInfo.name}</h3>
                <p className="text-sm text-blue-700 mt-1">{selectedSupplierInfo.contactInfo || 'No contact info provided'}</p>
              </div>
              <button onClick={() => setSelectedSupplierInfo(null)} className="text-blue-400 hover:text-red-500 text-2xl font-bold">×</button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">Items Supplied ({selectedSupplierInfo.itemsSupplied.length})</h4>
              <ul className="space-y-2">
                {selectedSupplierInfo.itemsSupplied.map(item => (
                  <li key={item._id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{item.sku}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-right">
              <button onClick={() => setSelectedSupplierInfo(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;