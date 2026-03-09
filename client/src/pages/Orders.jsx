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

// ── Note Modal Component ──
const NoteModal = ({ note, onClose }) => {
  if (!note) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative border border-transparent dark:border-gray-700 transition-colors duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none transition-colors"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span>📝</span> Special Instructions
        </h3>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 text-yellow-800 dark:text-yellow-200 p-4 rounded-xl text-sm whitespace-pre-wrap leading-relaxed transition-colors duration-200">
          {note}
        </div>
        <div className="mt-5 text-right">
          <button onClick={onClose} className="btn-secondary text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──
const Orders = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
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
        {isManager() && (
          <Link to="/orders/new" className="btn-primary">
            + New Order
          </Link>
        )}
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
            {isManager() && (
              <Link to="/orders/new" className="mt-3 inline-block btn-primary text-sm">
                Create your first order
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-left transition-colors duration-200">
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order #</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Notes</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Manager</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inputs</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outputs</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                {isManager() && (
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Update</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{order.orderNumber}</td>
                  
                  <td className="px-4 py-3 text-center">
                    {order.notes ? (
                      <button 
                        onClick={() => setSelectedNote(order.notes)}
                        className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-md font-semibold transition-colors shadow-sm"
                      >
                        📄 View
                      </button>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{order.managerId?.name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {order.inputs.map((i) => (
                      <div key={i._id} className="text-xs">
                        {i.itemId?.name ?? 'Unknown'} × {i.quantityRequired}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {order.outputs.map((o) => (
                      <div key={o._id} className="text-xs">
                        {o.itemId?.name ?? 'Unknown'} × {o.quantityProduced}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
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

      {/* Render the Modal when a note is clicked */}
      <NoteModal 
        note={selectedNote} 
        onClose={() => setSelectedNote(null)} 
      />
    </div>
  );
};

export default Orders;