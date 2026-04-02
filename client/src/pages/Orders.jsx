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

const StatusBadge = ({ status }) => {
  const colors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    Completed: 'bg-green-100 text-green-800',
    Cancelled: 'bg-gray-100 text-gray-800'
  };
  return <span className={`px-2 py-1 rounded text-xs font-bold ${colors[status] || colors.Pending}`}>{status}</span>;
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

  if (isLoading) return <div className="p-6">Loading orders...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Production Orders</h2>
        <Link to="/orders/new" className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">+ New Order</Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Order #</th>
              <th className="p-4 font-semibold text-gray-600">Shop / Location</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order._id} className="hover:bg-gray-50">
                <td className="p-4 font-mono font-bold text-gray-800">{order.orderNumber}</td>
                <td className="p-4 text-gray-600 font-medium">{order.locationId?.name || 'Unknown'}</td>
                <td className="p-4"><StatusBadge status={order.status} /></td>
                <td className="p-4">
                  {isManager() && order.status !== 'Completed' && order.status !== 'Cancelled' && (
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 bg-white focus:ring-blue-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── COMPLETION MODAL (TRACK ACTUALS) ── */}
      {completionModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Complete Order: {completionModalOrder.orderNumber}</h3>
              <p className="text-sm text-gray-500 mt-1">Please log exactly how much material was utilized vs. scrapped.</p>
            </div>
            
            <form onSubmit={handleCompleteSubmit} className="p-6">
              <div className="space-y-4">
                {completionModalOrder.inputs.map((input) => (
                  <div key={input._id} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="col-span-4">
                      <p className="font-bold text-gray-800">{input.itemId.name}</p>
                      {/* UPDATED: Changed itemId.unit to itemId.baseUnit */}
                      <p className="text-xs text-gray-500">Required: {input.quantityRequired} {input.itemId.baseUnit}</p>
                    </div>
                    
                    <div className="col-span-4">
                      {/* UPDATED: Changed itemId.unit to itemId.baseUnit */}
                      <label className="block text-xs font-medium text-gray-700 mb-1">Actually Utilized ({input.itemId.baseUnit})</label>
                      <input 
                        type="number" step="0.01" min="0" required
                        className="w-full border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 border"
                        value={actuals[input.itemId._id]?.utilized ?? ''}
                        onChange={(e) => setActuals(prev => ({
                          ...prev, [input.itemId._id]: { ...prev[input.itemId._id], utilized: e.target.value }
                        }))}
                      />
                    </div>

                    <div className="col-span-4">
                      {/* UPDATED: Changed itemId.unit to itemId.baseUnit */}
                      <label className="block text-xs font-medium text-red-600 mb-1">Scrapped/Wasted ({input.itemId.baseUnit})</label>
                      <input 
                        type="number" step="0.01" min="0" required
                        className="w-full border-red-300 rounded p-2 text-sm focus:ring-red-500 focus:border-red-500 border bg-red-50"
                        value={actuals[input.itemId._id]?.scrapped ?? ''}
                        onChange={(e) => setActuals(prev => ({
                          ...prev, [input.itemId._id]: { ...prev[input.itemId._id], scrapped: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setCompletionModalOrder(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancel</button>
                <button type="submit" disabled={statusMutation.isPending} className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700">
                  {statusMutation.isPending ? 'Processing...' : 'Confirm & Complete Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}