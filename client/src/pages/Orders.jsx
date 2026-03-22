// src/pages/Orders.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

// ── API ──
const fetchOrders = async ({ page, limit, status }) => {
  const params = new URLSearchParams({ page, limit });
  if (status) params.append('status', status);
  const { data } = await api.get(`/api/orders?${params}`);
  return data;
};

const updateOrderStatus = async ({ id, status }) => {
  const { data } = await api.patch(`/api/orders/${id}/status`, { status });
  return data.data;
};

// ── Status badge ──
const statusConfig = {
  Pending:       { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '🕐' },
  'In Progress': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',   icon: '⚙️' },
  Completed:     { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  icon: '✅' },
  Cancelled:     { color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',    icon: '✕' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.Pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors duration-200 ${cfg.color}`}>
      {cfg.icon} {status}
    </span>
  );
};

// ── Status update dropdown (manager/admin only) ──
const StatusDropdown = ({ order }) => {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(order.status);

  const mutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onError: (err) => alert(err?.response?.data?.error || 'Failed to update status'),
  });

  const handleChange = (e) => {
    const newStatus = e.target.value;
    setValue(newStatus);
    mutation.mutate({ id: order._id, status: newStatus });
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={mutation.isPending || order.status === 'Completed' || order.status === 'Cancelled'}
      className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
    >
      {Object.keys(statusConfig).map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
};

// ── NEW: Comprehensive Order Details Modal ──
const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

  const cost = order.financials?.totalMaterialCost || 0;
  const value = order.financials?.totalProductionValue || 0;
  const margin = value - cost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 px-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative border border-transparent dark:border-gray-700 transition-colors duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              Order {order.orderNumber}
              <StatusBadge status={order.status} />
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Managed by: {order.managerId?.name || 'Unknown'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none transition-colors">✕</button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Financials Row */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800/30">
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Material Cost</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">₹{cost.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Finished Value</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">₹{value.toLocaleString('en-IN')}</p>
            </div>
            <div className={`p-4 rounded-xl border ${margin >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {margin >= 0 ? 'Projected Profit' : 'Projected Loss'}
              </p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">₹{margin.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Items & Notes */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">Production Details</h4>
              
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Inputs Required:</p>
                <ul className="space-y-1">
                  {order.inputs.map(i => (
                    <li key={i._id} className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 px-3 py-1.5 rounded-md flex justify-between">
                      <span>{i.itemId?.name}</span>
                      <span className="font-mono text-xs">{i.quantityRequired} {i.itemId?.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Outputs Produced:</p>
                <ul className="space-y-1">
                  {order.outputs.map(o => (
                    <li key={o._id} className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 px-3 py-1.5 rounded-md flex justify-between">
                      <span>{o.itemId?.name}</span>
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{o.quantityProduced} {o.itemId?.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {order.notes && (
                <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 p-4 rounded-xl">
                  <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 mb-1">📝 Special Instructions</p>
                  <p className="text-sm text-yellow-900 dark:text-yellow-200 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column: Audit Trail Timeline */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Status Audit Trail</h4>
              
              {order.statusHistory && order.statusHistory.length > 0 ? (
                <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                  {order.statusHistory.map((history, idx) => (
                    <div key={idx} className="relative pl-6">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-800 shadow-sm" />
                      
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          Changed to <span className="text-blue-600 dark:text-blue-400">{history.status}</span>
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          By {history.changedBy?.name || 'Unknown User'}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase font-mono tracking-wider">
                          {new Date(history.timestamp).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No history recorded for this order.</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-right">
          <button onClick={onClose} className="btn-secondary text-sm px-6">Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──
const Orders = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null); // <-- Updated state to hold entire order object
  const { isManager } = useAuthStore();
  const LIMIT = 10;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', { page, status: statusFilter }],
    queryFn: () => fetchOrders({ page, limit: LIMIT, status: statusFilter }),
    keepPreviousData: true,
  });

  const orders = data?.data ?? [];
  const pagination = data?.pagination ?? {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white transition-colors duration-200">Production Orders</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-colors duration-200">
            {pagination.total ?? 0} total order{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        
        <Link to="/orders/new" className="btn-primary">
          + New Order
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input max-w-[200px]"
        >
          <option value="">All Statuses</option>
          {Object.keys(statusConfig).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors duration-200">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-sm animate-pulse">Loading orders...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500 dark:text-red-400 text-sm">Failed to load orders.</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-2">🏭</p>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No orders found.</p>
            
            <Link to="/orders/new" className="mt-3 inline-block btn-primary text-sm">
              Create your first order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-left transition-colors duration-200">
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order #</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inputs</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outputs</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Details</th>
                  {isManager() && (
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150">
                    <td className="px-4 py-4 font-mono text-xs font-bold text-gray-800 dark:text-gray-200">
                      {order.orderNumber}
                      <div className="text-[10px] font-sans text-gray-400 font-normal mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {order.inputs.slice(0, 2).map((i) => (
                        <div key={i._id} className="text-xs truncate max-w-[150px]">
                          {i.quantityRequired}x {i.itemId?.name ?? 'Unknown'}
                        </div>
                      ))}
                      {order.inputs.length > 2 && <div className="text-[10px] text-gray-400 mt-1">+{order.inputs.length - 2} more</div>}
                    </td>
                    
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {order.outputs.slice(0, 2).map((o) => (
                        <div key={o._id} className="text-xs truncate max-w-[150px] font-medium text-blue-600 dark:text-blue-400">
                          {o.quantityProduced}x {o.itemId?.name ?? 'Unknown'}
                        </div>
                      ))}
                      {order.outputs.length > 2 && <div className="text-[10px] text-gray-400 mt-1">+{order.outputs.length - 2} more</div>}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-md font-semibold transition-colors shadow-sm whitespace-nowrap"
                      >
                        📄 View File
                      </button>
                    </td>

                    {isManager() && (
                      <td className="px-4 py-3">
                        <StatusDropdown order={order} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
            Page {pagination.page} of {pagination.totalPages} — {pagination.total} orders
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Render the new comprehensive Modal */}
      <OrderDetailsModal 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </div>
  );
};

export default Orders;