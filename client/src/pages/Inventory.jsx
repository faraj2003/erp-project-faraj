import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useAuthStore } from '../store/authStore';

export default function Inventory() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((state) => state.getRole());
  const canReceive = ['admin', 'manager', 'procurement_manager'].includes(userRole);
  const canTransfer = ['admin', 'manager', 'dispatch_manager'].includes(userRole);
  
  const [selectedItemForStock, setSelectedItemForStock] = useState(null);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState(null);
  
  const [addStockForm, setAddStockForm] = useState({ locationId: '', quantityToAdd: '' });
  const [transferForm, setTransferForm] = useState({ sourceLocationId: '', destinationLocationId: '', quantity: '' });

  // Fetch Items 
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await axios.get('/api/inventory');
      return data;
    },
  });

  // Fetch Locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await axios.get('/api/locations');
      return data;
    },
  });

  // Add Stock Mutation
  const addStockMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/${id}/stock`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedItemForStock(null);
      setAddStockForm({ locationId: '', quantityToAdd: '' });
    },
  });

  // Transfer Stock Mutation
  const transferStockMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/${id}/transfer`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedItemForTransfer(null);
      setTransferForm({ sourceLocationId: '', destinationLocationId: '', quantity: '' });
    },
    onError: (error) => {
      alert(error.response?.data?.message || "Transfer failed");
    }
  });

  const handleAddStockSubmit = (e) => {
    e.preventDefault();
    if (!addStockForm.locationId || !addStockForm.quantityToAdd) return;
    addStockMutation.mutate({ id: selectedItemForStock._id, payload: { locationId: addStockForm.locationId, quantityToAdd: Number(addStockForm.quantityToAdd) } });
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferForm.sourceLocationId || !transferForm.destinationLocationId || !transferForm.quantity) return;
    transferStockMutation.mutate({ id: selectedItemForTransfer._id, payload: { ...transferForm, quantity: Number(transferForm.quantity) } });
  };

  if (itemsLoading) return <div className="p-4 text-gray-600">Loading Inventory...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Global Inventory Overview</h1>

      <div className="grid grid-cols-1 gap-6">
        {items?.map((item) => (
          <div key={item._id} className="bg-white p-6 rounded shadow border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{item.name} <span className="text-sm font-normal text-gray-500">({item.sku})</span></h2>
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1 capitalize">
                  {item.type.replace('_', ' ')}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Total Global Stock</p>
                <p className={`text-2xl font-bold ${item.currentStock <= item.minStockLevel ? 'text-red-600' : 'text-green-600'}`}>
                  {item.currentStock} {item.unit}
                </p>
              </div>
            </div>

            {/* Location Breakdown */}
            <div className="mt-4 bg-gray-50 p-4 rounded border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Stock by Location:</h3>
              {item.balances?.length > 0 ? (
                <ul className="space-y-2">
                  {item.balances.map((balance) => (
                    <li key={balance._id} className="flex justify-between text-sm bg-white p-2 rounded border border-gray-200 shadow-sm">
                      <span className="text-gray-700 font-medium">{balance.locationId?.name || 'Unknown'} <span className="text-xs text-gray-400 font-normal">({balance.locationId?.type})</span></span>
                      <span className="font-bold text-gray-800">{balance.quantity} {item.unit}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No stock found in any location.</p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3">
              {canReceive && (
                <button onClick={() => setSelectedItemForStock(item)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded text-sm font-medium transition-colors">
                  + Receive Stock
                </button>
              )}
              {canTransfer && item.balances?.length > 0 && (
                <button onClick={() => setSelectedItemForTransfer(item)} className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded text-sm font-medium transition-colors border border-blue-200">
                  ⇄ Transfer Stock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- ADD STOCK MODAL --- */}
      {selectedItemForStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">Receive Stock: {selectedItemForStock.name}</h2>
            <form onSubmit={handleAddStockSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Destination Location</label>
                <select className="w-full border border-gray-300 rounded p-2" value={addStockForm.locationId} onChange={(e) => setAddStockForm({ ...addStockForm, locationId: e.target.value })} required>
                  <option value="">-- Select a Location --</option>
                  {locations?.map(loc => <option key={loc._id} value={loc._id}>{loc.name} ({loc.type})</option>)}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Quantity ({selectedItemForStock.unit})</label>
                <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded p-2" value={addStockForm.quantityToAdd} onChange={(e) => setAddStockForm({ ...addStockForm, quantityToAdd: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedItemForStock(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={addStockMutation.isLoading} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">{addStockMutation.isLoading ? 'Processing...' : 'Confirm Receipt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- TRANSFER STOCK MODAL --- */}
      {selectedItemForTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border-t-4 border-blue-600">
            <h2 className="text-xl font-bold mb-4">Transfer Stock: {selectedItemForTransfer.name}</h2>
            <form onSubmit={handleTransferSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">From (Source)</label>
                <select className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500" value={transferForm.sourceLocationId} onChange={(e) => setTransferForm({ ...transferForm, sourceLocationId: e.target.value })} required>
                  <option value="">-- Select Source --</option>
                  {/* Only show locations where this item actually has stock */}
                  {selectedItemForTransfer.balances.map(b => (
                    <option key={b.locationId._id} value={b.locationId._id}>
                      {b.locationId.name} (Avail: {b.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Destination)</label>
                <select className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500" value={transferForm.destinationLocationId} onChange={(e) => setTransferForm({ ...transferForm, destinationLocationId: e.target.value })} required>
                  <option value="">-- Select Destination --</option>
                  {locations?.map(loc => <option key={loc._id} value={loc._id}>{loc.name} ({loc.type})</option>)}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Transfer ({selectedItemForTransfer.unit})</label>
                <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded p-2 focus:ring-blue-500" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedItemForTransfer(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancel</button>
                <button type="submit" disabled={transferStockMutation.isLoading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium">{transferStockMutation.isLoading ? 'Processing...' : 'Confirm Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}