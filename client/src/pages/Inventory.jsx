import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useAuthStore } from '../store/authStore';

export default function Inventory() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((state) => state.getRole());
  
  // Permissions based on roles
  const canReceive = ['admin', 'manager', 'procurement_manager'].includes(userRole);
  const canTransfer = ['admin', 'manager', 'dispatch_manager'].includes(userRole);
  const canCreateItem = ['admin', 'manager', 'procurement_manager'].includes(userRole);
  // NEW: Permission for issuing stock
  const canIssue = ['admin', 'manager', 'dispatch_manager', 'shop_worker'].includes(userRole);
  
  // Modal States
  const [selectedItemForStock, setSelectedItemForStock] = useState(null);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState(null);
  const [selectedItemForIssue, setSelectedItemForIssue] = useState(null); // NEW
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  
  // Form States
  const [addStockForm, setAddStockForm] = useState({ locationId: '', quantityToAdd: '' });
  const [transferForm, setTransferForm] = useState({ sourceLocationId: '', destinationLocationId: '', quantity: '' });
  const [issueForm, setIssueForm] = useState({ locationId: '', quantityToIssue: '' }); // NEW
  
  // New Product Form State
  const [addItemForm, setAddItemForm] = useState({
    sku: '', name: '', type: 'raw_material', minStockLevel: '', unit: '', secondaryUnit: '', conversionFactor: ''
  });

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

  // Add Item Mutation
  const addItemMutation = useMutation({
    mutationFn: async (payload) => axios.post('/api/inventory', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsAddItemModalOpen(false);
      setAddItemForm({ sku: '', name: '', type: 'raw_material', minStockLevel: '', unit: '', secondaryUnit: '', conversionFactor: '' });
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to add new product.")
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
    onError: (error) => alert(error.response?.data?.message || "Transfer failed")
  });

  // NEW: Issue Stock Mutation
  const issueStockMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/${id}/issue`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedItemForIssue(null);
      setIssueForm({ locationId: '', quantityToIssue: '' });
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to issue stock.")
  });

  // Handlers
  const handleAddItemSubmit = (e) => {
    e.preventDefault();
    const payload = { ...addItemForm, minStockLevel: Number(addItemForm.minStockLevel) };
    if (!payload.secondaryUnit) {
      delete payload.secondaryUnit;
      delete payload.conversionFactor;
    } else {
      payload.conversionFactor = Number(payload.conversionFactor);
    }
    addItemMutation.mutate(payload);
  };

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

  // NEW: Issue handler
  const handleIssueSubmit = (e) => {
    e.preventDefault();
    if (!issueForm.locationId || !issueForm.quantityToIssue) return;
    issueStockMutation.mutate({ 
      id: selectedItemForIssue._id, 
      payload: { locationId: issueForm.locationId, quantityToIssue: Number(issueForm.quantityToIssue) } 
    });
  };

  if (itemsLoading) return <div className="p-4 text-gray-600">Loading Inventory...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Global Inventory Overview</h1>
        {canCreateItem && (
          <button onClick={() => setIsAddItemModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium shadow-sm transition-colors">
            + Add New Product
          </button>
        )}
      </div>

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
                {item.secondaryUnit && (
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    ≈ {item.currentSecondaryStock} {item.secondaryUnit}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 bg-gray-50 p-4 rounded border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Stock by Location:</h3>
              {item.balances?.length > 0 ? (
                <ul className="space-y-2">
                  {item.balances.map((balance) => (
                    <li key={balance._id} className="flex justify-between text-sm bg-white p-2 rounded border border-gray-200 shadow-sm">
                      <span className="text-gray-700 font-medium">{balance.locationId?.name || 'Unknown'} <span className="text-xs text-gray-400 font-normal">({balance.locationId?.type})</span></span>
                      <div className="text-right">
                         <span className="font-bold text-gray-800 block">{balance.quantity} {item.unit}</span>
                         {item.secondaryUnit && (
                            <span className="text-xs text-gray-500">({balance.quantity * item.conversionFactor} {item.secondaryUnit})</span>
                         )}
                      </div>
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
              {/* NEW ISSUE BUTTON */}
              {canIssue && item.balances?.length > 0 && (
                <button onClick={() => setSelectedItemForIssue(item)} className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded text-sm font-medium transition-colors border border-red-200">
                  - Issue Stock
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

      {/* --- ADD NEW PRODUCT MODAL --- */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto border-t-4 border-green-600">
            <h2 className="text-xl font-bold mb-4">Add New Product to Catalog</h2>
            <form onSubmit={handleAddItemSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2" value={addItemForm.name} onChange={(e) => setAddItemForm({ ...addItemForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU (e.g. RAW-001) *</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2 uppercase" value={addItemForm.sku} onChange={(e) => setAddItemForm({ ...addItemForm, sku: e.target.value.toUpperCase() })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select className="w-full border border-gray-300 rounded p-2" value={addItemForm.type} onChange={(e) => setAddItemForm({ ...addItemForm, type: e.target.value })} required>
                    <option value="raw_material">Raw Material</option>
                    <option value="finished_good">Finished Good</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum Stock Level *</label>
                  <input type="number" min="0" className="w-full border border-gray-300 rounded p-2" value={addItemForm.minStockLevel} onChange={(e) => setAddItemForm({ ...addItemForm, minStockLevel: e.target.value })} required />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-6 mt-2">
                <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Measurement Units</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Primary Unit (e.g. Box, Kg) *</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2" value={addItemForm.unit} onChange={(e) => setAddItemForm({ ...addItemForm, unit: e.target.value })} placeholder="e.g. box" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Secondary Unit <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <input type="text" className="w-full border border-gray-300 rounded p-2" value={addItemForm.secondaryUnit} onChange={(e) => setAddItemForm({ ...addItemForm, secondaryUnit: e.target.value })} placeholder="e.g. pieces" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Conversion Factor {addItemForm.secondaryUnit && '*'}</label>
                    <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded p-2" value={addItemForm.conversionFactor} onChange={(e) => setAddItemForm({ ...addItemForm, conversionFactor: e.target.value })} placeholder={addItemForm.secondaryUnit ? `e.g. 12 (pieces per ${addItemForm.unit || 'unit'})` : "Leave empty if no sec. unit"} required={!!addItemForm.secondaryUnit} disabled={!addItemForm.secondaryUnit} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddItemModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={addItemMutation.isLoading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">{addItemMutation.isLoading ? 'Saving...' : 'Create Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD STOCK MODAL --- */}
      {selectedItemForStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border-t-4 border-gray-800">
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

      {/* --- ISSUE STOCK MODAL (NEW) --- */}
      {selectedItemForIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border-t-4 border-red-600">
            <h2 className="text-xl font-bold mb-4">Issue Stock: {selectedItemForIssue.name}</h2>
            <form onSubmit={handleIssueSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Source Location</label>
                <select className="w-full border border-gray-300 rounded p-2" value={issueForm.locationId} onChange={(e) => setIssueForm({ ...issueForm, locationId: e.target.value })} required>
                  <option value="">-- Select a Location --</option>
                  {selectedItemForIssue.balances.map(b => (
                    <option key={b.locationId._id} value={b.locationId._id}>
                      {b.locationId.name} (Avail: {b.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Quantity to Issue ({selectedItemForIssue.unit})</label>
                <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded p-2" value={issueForm.quantityToIssue} onChange={(e) => setIssueForm({ ...issueForm, quantityToIssue: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedItemForIssue(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={issueStockMutation.isLoading} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">{issueStockMutation.isLoading ? 'Processing...' : 'Confirm Issue'}</button>
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
                <select className="w-full border border-gray-300 rounded p-2" value={transferForm.sourceLocationId} onChange={(e) => setTransferForm({ ...transferForm, sourceLocationId: e.target.value })} required>
                  <option value="">-- Select Source --</option>
                  {selectedItemForTransfer.balances.map(b => (
                    <option key={b.locationId._id} value={b.locationId._id}>
                      {b.locationId.name} (Avail: {b.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Destination)</label>
                <select className="w-full border border-gray-300 rounded p-2" value={transferForm.destinationLocationId} onChange={(e) => setTransferForm({ ...transferForm, destinationLocationId: e.target.value })} required>
                  <option value="">-- Select Destination --</option>
                  {locations?.map(loc => <option key={loc._id} value={loc._id}>{loc.name} ({loc.type})</option>)}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Transfer ({selectedItemForTransfer.unit})</label>
                <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded p-2" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedItemForTransfer(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={transferStockMutation.isLoading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{transferStockMutation.isLoading ? 'Processing...' : 'Confirm Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}