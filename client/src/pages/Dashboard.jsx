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

const fetchInventoryAlerts = async () => {
  const { data } = await api.get('/api/inventory/alerts');
  return data.data;
};

const fetchFullInventory = async () => {
  const { data } = await api.get('/api/inventory');
  return data.data;
};

// NEW: Fetch suppliers directly from the procurement route
const fetchSuppliers = async () => {
  const { data } = await api.get('/api/procurement/suppliers');
  return data.data;
};

// ── Helpers ──
const formatAxisLabel = (value) => {
  if (typeof value !== 'string') return value;
  return value.length > 12 ? `${value.substring(0, 12)}...` : value;
};

const SectionTitle = ({ title, subtitle }) => (
  <div className="mb-6">
    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight">{title}</h3>
    {subtitle && <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

const ChartCard = ({ children, className = '' }) => (
  <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-200/60 dark:border-gray-700/50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 ${className}`}>
    {children}
  </div>
);

const LoadingChart = () => <div className="h-64 flex items-center justify-center text-gray-400 animate-pulse font-medium">Loading analytics...</div>;
const EmptyChart = ({ message }) => <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3"><span className="text-4xl opacity-50">📈</span><p className="text-sm font-medium">{message}</p></div>;
const ErrorChart = ({ message = "Failed to load data" }) => (
  <div className="h-64 flex flex-col items-center justify-center text-red-400 gap-3">
    <span className="text-4xl opacity-80">⚠️</span><p className="text-sm font-medium">{message}</p>
    <button onClick={() => window.location.reload()} className="mt-2 px-4 py-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">Retry</button>
  </div>
);

const LiveBadge = ({ isLive }) => (
  <span className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full shadow-sm transition-colors duration-300 ${isLive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
    <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
    {isLive ? 'SYSTEM LIVE' : 'CONNECTING...'}
  </span>
);

const StatCard = ({ label, value, unit, color }) => {
  const accentColor = color.replace('border-l-', 'bg-');
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-200/60 dark:border-gray-700/50 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${accentColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-gray-800 dark:text-white mt-2 tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-base font-semibold text-gray-400 ml-1.5">{unit}</span>}
      </p>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-bold text-gray-800 dark:text-gray-200 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">{label}</p>
      {payload.map((p) => <p key={p.dataKey} style={{ color: p.color }} className="font-semibold flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></span>{p.name}: {p.value.toLocaleString()}</p>)}
    </div>
  );
};

const StaffDashboard = ({ isSocketLive }) => {
  const { data: recentOrders = [], isLoading, isError } = useQuery({ queryKey: ['orders', 'recent'], queryFn: fetchRecentOrders });
  const activeOrders = recentOrders.filter(o => o.status === 'Pending' || o.status === 'In Progress');

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Operator Dashboard</h2>
          <p className="text-sm font-medium text-gray-500 mt-1">Your active production queue</p>
        </div>
        <LiveBadge isLive={isSocketLive} />
      </div>
      <ChartCard>
        <SectionTitle title="Action Required" subtitle="Orders currently pending or in progress" />
        {isLoading ? <div className="p-10 text-center text-sm font-medium text-gray-400 animate-pulse">Loading queue...</div> : isError ? <div className="p-10 text-center text-red-500 text-sm font-medium">Failed to load active orders.</div> : activeOrders.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200"><span className="text-4xl mb-3 opacity-80">☕</span><p className="text-base text-gray-500 font-semibold">Queue is empty. Take a break!</p></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeOrders.map(order => (
              <div key={order._id} className="py-4 flex justify-between gap-4 hover:bg-gray-50/50 rounded-lg px-2 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">{order.orderNumber}</span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${order.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{order.status}</span>
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

  const [selectedItemInfo, setSelectedItemInfo] = useState(null);
  const [selectedSupplierInfo, setSelectedSupplierInfo] = useState(null);

  const { data: production = [], isLoading: loadingProduction, isError: errorProduction } = useQuery({ queryKey: ['analytics', 'production'], queryFn: fetchProductionMetrics, enabled: isAdmin() });
  const { data: trends = [], isLoading: loadingTrends, isError: errorTrends } = useQuery({ queryKey: ['analytics', 'trends'], queryFn: fetchMonthlyTrends, enabled: isAdmin() });
  const { data: stockMovement = [], isLoading: loadingMovement, isError: errorMovement } = useQuery({ queryKey: ['analytics', 'stock-movement'], queryFn: fetchStockMovement, enabled: isAdmin() });
  const { data: dashboardMetrics = {} } = useQuery({ queryKey: ['inventory', 'dashboard'], queryFn: fetchDashboardMetrics, enabled: isAdmin() });
  const { data: alerts = [], isLoading: loadingAlerts, isError: errorAlerts } = useQuery({ queryKey: ['inventory', 'alerts'], queryFn: fetchInventoryAlerts, enabled: isAdmin() });
  const { data: inventory = [] } = useQuery({ queryKey: ['inventory', 'full'], queryFn: fetchFullInventory, enabled: isAdmin() });
  
  // NEW: Fetch suppliers directly
  const { data: suppliersList = [] } = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers, enabled: isAdmin() });

  // UPDATED: Match items to suppliers reliably
  const suppliersWithItems = useMemo(() => {
    return suppliersList.map(supplier => {
      const itemsSupplied = inventory.filter(item => 
        // Checks if it's an object ID string or a populated object
        (item.supplier?._id || item.supplier) === supplier._id
      );
      return { ...supplier, itemsSupplied };
    });
  }, [suppliersList, inventory]);

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
    }
  };

  if (!isAdmin()) return <StaffDashboard isSocketLive={isSocketLive} />;

  const totalUnits = production.reduce((sum, p) => sum + p.totalProduced, 0);
  const peakItem = trends.reduce((max, t) => (t.metrics?.totalConsumed || 0) > (max?.metrics?.totalConsumed ?? 0) ? t : max, null);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Analytics Dashboard</h2>
          <p className="text-sm font-medium text-gray-500 mt-1">Live production & inventory insights</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => handleDownloadCSV('/api/inventory/export/transactions', 'inventory_transactions.csv')} className="bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 text-sm font-bold py-2.5 px-5 rounded-xl shadow-sm border border-gray-200/80 transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0">
             Export Transactions
          </button>
          <LiveBadge isLive={isSocketLive} />
        </div>
      </div>

      {/* ── QUICK LOOKUPS ── */}
      <div className="bg-white/80 backdrop-blur-md border border-gray-200/60 rounded-2xl p-6 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full">
          <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-2">Item Lookup</label>
          <select 
            className="input cursor-pointer"
            onChange={(e) => {
              if(!e.target.value) return;
              setSelectedItemInfo(inventory.find(i => i._id === e.target.value));
              e.target.value = ""; 
            }}
          >
            <option value="">Search inventory items...</option>
            {inventory.map(i => <option key={i._id} value={i._id}>{i.name} ({i.sku})</option>)}
          </select>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-2">Supplier Lookup</label>
          <select 
            className="input cursor-pointer"
            onChange={(e) => {
              if(!e.target.value) return;
              setSelectedSupplierInfo(suppliersWithItems.find(s => s._id === e.target.value));
              e.target.value = ""; 
            }}
          >
            <option value="">Search suppliers...</option>
            {suppliersWithItems.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {loadingAlerts ? (
        <div className="mb-8 p-6 rounded-2xl border border-gray-200 shadow-sm text-center font-medium text-gray-400 animate-pulse">
          Analyzing stock levels...
        </div>
      ) : errorAlerts ? null : alerts.length > 0 ? (
        <div className="mb-8 bg-white/80 backdrop-blur-md border border-gray-200/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-black text-gray-800 tracking-tight">Action Required: Low Stock</h3>
            </div>
            <span className="bg-red-100 text-red-700 py-1 px-3 rounded-full text-xs font-black tracking-wide">{alerts.length} ITEMS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.slice(0, 6).map((alert) => {
              let colorClasses = alert.alertLevel === 'Critical' ? "bg-red-50/50 border-red-200" : alert.alertLevel === 'Red' ? "bg-rose-50/50 border-rose-200" : "bg-orange-50/50 border-orange-200";
              let textClasses = alert.alertLevel === 'Critical' ? "text-red-700" : alert.alertLevel === 'Red' ? "text-rose-700" : "text-orange-700";

              return (
                <div key={alert.itemId} className={`p-4 rounded-xl border ${colorClasses} flex justify-between items-center transition-all hover:shadow-md`}>
                  <div>
                    <p className="font-bold text-gray-800">{alert.name}</p>
                    <p className="font-mono text-xs text-gray-500 mt-1">{alert.sku}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${textClasses}`}>
                      {alert.alertLevel}
                    </div>
                    <p className="text-xl font-black text-gray-900">
                      {alert.currentStock} <span className="text-xs font-bold text-gray-500 uppercase">{alert.baseUnit}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── STATS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Valuation" value={`$${(dashboardMetrics.totalValuation || 0).toFixed(2)}`} color="border-l-emerald-500" />
        <StatCard label="Total Units" value={totalUnits} unit="units" color="border-l-blue-500" />
        <StatCard label="Highest Velocity Item" value={peakItem?.item?.name ?? '—'} color="border-l-indigo-500" />
        <StatCard label="Daily Burn Rate" value={peakItem?.metrics?.averageDailyConsumption ?? '—'} unit="/day" color="border-l-orange-400" />
      </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <ChartCard>
          <SectionTitle title="Lifetime Production" subtitle="Total units produced per finished good" />
          {loadingProduction ? <LoadingChart /> : errorProduction ? <ErrorChart /> : production.length === 0 ? <EmptyChart message="No data yet" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={production} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="_id" tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={formatAxisLabel} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Bar dataKey="totalProduced" name="Units Produced" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionTitle title="Material Velocity" subtitle="Fastest moving materials (Last 30 Days)" />
          {loadingTrends ? <LoadingChart /> : errorTrends ? <ErrorChart /> : trends.length === 0 ? <EmptyChart message="No data yet" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
                <XAxis dataKey="item.name" tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={formatAxisLabel} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                <Bar dataKey="metrics.totalConsumed" name="Total Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard>
        <SectionTitle title="Stock Movement Activity" subtitle="Total units added to inventory vs deducted from inventory" />
        {loadingMovement ? <LoadingChart /> : errorMovement ? <ErrorChart /> : stockMovement.length === 0 ? <EmptyChart message="No data yet" /> : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stockMovement} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
              <XAxis dataKey="_id" tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={formatAxisLabel} dy={10} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6', opacity: 0.4}} />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 20 }} iconType="circle" />
              <Bar dataKey="added" name="Stock Added" fill="#10b981" radius={[6, 6, 0, 0]} barSize={30} />
              <Bar dataKey="deducted" name="Stock Deducted" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── MODALS (Backdrop blurred & Rounded) ── */}
      {selectedItemInfo && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedItemInfo.name}</h3>
                <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">{selectedItemInfo.sku} • {selectedItemInfo.type?.replace('_', ' ')}</p>
              </div>
              <button onClick={() => setSelectedItemInfo(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors">✕</button>
            </div>
            
            <div className="p-8 grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
              <div><span className="block text-xs font-bold text-gray-400 uppercase mb-1">Brand/Company</span> <span className="font-semibold text-gray-900">{selectedItemInfo.productCompanyName || 'N/A'}</span></div>
              <div><span className="block text-xs font-bold text-gray-400 uppercase mb-1">Category</span> <span className="font-semibold text-gray-900">{selectedItemInfo.categoryId?.name || 'Uncategorized'}</span></div>
              <div><span className="block text-xs font-bold text-gray-400 uppercase mb-1">Base Unit</span> <span className="font-semibold text-gray-900 uppercase">{selectedItemInfo.baseUnit}</span></div>
              <div><span className="block text-xs font-bold text-gray-400 uppercase mb-1">Dimensions</span> <span className="font-semibold text-gray-900">{selectedItemInfo.dimensions || 'N/A'}</span></div>
              
              <div className="col-span-2 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Supplier Details</h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="font-semibold text-gray-900">{selectedItemInfo.supplier?.name || 'N/A'}</p>
                  <p className="text-gray-500 mt-1">{selectedItemInfo.supplier?.contactInfo || 'No contact provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSupplierInfo && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedSupplierInfo.name}</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">{selectedSupplierInfo.contactInfo || 'No contact info provided'}</p>
              </div>
              <button onClick={() => setSelectedSupplierInfo(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors">✕</button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Items Supplied ({selectedSupplierInfo.itemsSupplied?.length || 0})</h4>
              <ul className="space-y-3">
                {selectedSupplierInfo.itemsSupplied?.map(item => (
                  <li key={item._id} className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-800">{item.name}</span>
                    <span className="text-xs font-bold bg-white px-2 py-1 rounded text-gray-500 border border-gray-200">{item.sku}</span>
                  </li>
                ))}
                {(!selectedSupplierInfo.itemsSupplied || selectedSupplierInfo.itemsSupplied.length === 0) && (
                   <p className="text-sm text-gray-400 italic">This supplier does not supply any current items.</p>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;