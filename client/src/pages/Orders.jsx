import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

const fetchOrders = async () => {
  const { data } = await api.get('/api/orders');
  return data;
};

const updateOrderStatus = async ({ id, payload }) => {
  const { data } = await api.patch(`/api/orders/${id}/status`, payload);
  return data.data;
};

// Upgraded Modern Status Badge
const StatusBadge = ({ status }) => {
  const styles = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
    Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Cancelled: 'bg-gray-100 text-gray-600 border-gray-200'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.Pending}`}>
      {status}
    </span>
  );
};

export default function Orders() {
  const queryClient = useQueryClient();
  const { isManager } = useAuthStore();
  
  const [completionModalOrder, setCompletionModalOrder] = useState(null);
  const [actuals, setActuals] = useState({});

  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const orders = data?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setCompletionModalOrder(null);
    },
    onError: (err) => alert(err?.response?.data?.message || 'Failed to update status')
  });

  const handleStatusChange = (order, newStatus) => {
    if (newStatus === "Completed") {
      const initialActuals = {};
      order.inputs.forEach(input => {
        initialActuals[input.itemId._id] = { utilized: input.quantityRequired, scrapped: 0 };
      });
      setActuals(initialActuals);
      setCompletionModalOrder(order);
    } else {
      statusMutation.mutate({ id: order._id, payload: { status: newStatus } });
    }
  };

  const handleCompleteSubmit = (e) => {
    e.preventDefault();
    const formattedActuals = Object.entries(actuals).map(([itemId, vals]) => ({
      itemId,
      utilized: Number(vals.utilized),
      scrapped: Number(vals.scrapped)
    }));
    
    statusMutation.mutate({ 
      id: completionModalOrder._id, 
      payload: { status: "Completed", actuals: formattedActuals } 
    });
  };

  if (isLoading) return <div className="p-10 text-center font-medium text-gray-400 animate-pulse">Loading orders...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Production Orders</h2>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage active manufacturing workflows</p>
        </div>
        <Link to="/orders/new" className="btn-primary shadow-lg shadow-blue-500/30 flex items-center gap-2">
          <span className="text-lg leading-none">+</span> New Order
        </Link>
      </div>

      {/* Upgraded Glassmorphism Table Container */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/50 border-b border-gray-200/60">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order #</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Shop / Location</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Notes</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium">No orders found.</td>
                </tr>
              ) : orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50/50 transition-colors duration-150 group">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">{order.orderNumber}</td>
                  <td className="px-6 py-4 text-gray-700 font-semibold">{order.locationId?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate" title={order.notes}>{order.notes || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-4">
                    {isManager() && order.status !== 'Completed' && order.status !== 'Cancelled' ? (
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-300 shadow-sm"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Mark Completed</option>
                        <option value="Cancelled">Cancel Order</option>
                      </select>
                    ) : (
                      <span className="text-xs font-medium text-gray-400 px-3">Locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── COMPLETION MODAL (TRACK ACTUALS) ── */}
      {completionModalOrder && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Complete Order <span className="text-blue-600">{completionModalOrder.orderNumber}</span></h3>
              <p className="text-sm font-medium text-gray-500 mt-2">Please log exactly how much material was utilized vs. scrapped during production.</p>
            </div>
            
            <form onSubmit={handleCompleteSubmit}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {completionModalOrder.inputs.map((input) => (
                  <div key={input._id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50/50 p-4 rounded-xl border border-gray-200/60 hover:border-gray-300 transition-colors">
                    <div className="md:col-span-5">
                      <p className="font-bold text-gray-900">{input.itemId.name}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Req: {input.quantityRequired} {input.itemId.baseUnit}</p>
                    </div>
                    
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Actually Utilized</label>
                      <div className="relative">
                        <input 
                          type="number" step="0.01" min="0" required
                          className="input pr-12 font-mono font-bold"
                          value={actuals[input.itemId._id]?.utilized ?? ''}
                          onChange={(e) => setActuals(prev => ({
                            ...prev, [input.itemId._id]: { ...prev[input.itemId._id], utilized: e.target.value }
                          }))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase">{input.itemId.baseUnit}</span>
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1.5">Scrapped</label>
                       <div className="relative">
                        <input 
                          type="number" step="0.01" min="0" required
                          className="input border-red-200 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20 pr-12 font-mono font-bold text-red-700"
                          value={actuals[input.itemId._id]?.scrapped ?? ''}
                          onChange={(e) => setActuals(prev => ({
                            ...prev, [input.itemId._id]: { ...prev[input.itemId._id], scrapped: e.target.value }
                          }))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400 uppercase">{input.itemId.baseUnit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setCompletionModalOrder(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={statusMutation.isPending} className="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 text-white border-0">
                  {statusMutation.isPending ? 'Processing...' : 'Complete Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}