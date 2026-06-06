import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useAuthStore } from '../store/authStore';

export default function Adjustments() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((state) => state.getRole());
  
  // Permissions
  const isAdmin = userRole === 'admin';
  // STRICT SoD: Only operational staff can request missing stock
  const canCreate = ['manager', 'dispatch_manager', 'shop_worker'].includes(userRole);

  // States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewingAdjustment, setReviewingAdjustment] = useState(null);

  // Cascading Filter States
  const [filterType, setFilterType] = useState('');
  const [filterDimension, setFilterDimension] = useState('');

  const [createForm, setCreateForm] = useState({
    itemId: '',
    locationId: '',
    quantityChange: '',
    reason: ''
  });
  const [reviewNotes, setReviewNotes] = useState('');

  // Queries
  const { data: adjustments = [], isLoading: adjustmentsLoading } = useQuery({
    queryKey: ['adjustments'],
    queryFn: async () => {
      const { data } = await axios.get('/api/inventory/adjustments');
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await axios.get('/api/inventory');
      return data.data || data; 
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await axios.get('/api/locations');
      return data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async ({ payload }) => axios.post('/api/inventory/adjustments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      closeCreateModal();
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to create adjustment")
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.patch(`/api/inventory/adjustments/${id}/review`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); 
      setReviewingAdjustment(null);
      setReviewNotes('');
    },
    onError: (error) => alert(error.response?.data?.message || "Review failed")
  });

  // ── CSV Export ──
  const handleExportAdjustments = async () => {
    try {
      const response = await axios.get('/api/inventory/export/adjustments', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_adjustments.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to export adjustments.");
      console.error(error);
    }
  };

  // ── HANDLERS ──

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setFilterType('');
    setFilterDimension('');
    setCreateForm({ itemId: '', locationId: '', quantityChange: '', reason: '' });
  };

  const handleTypeChange = (e) => {
    setFilterType(e.target.value);
    setFilterDimension(''); // Reset child filter
    setCreateForm({ ...createForm, itemId: '' }); // Reset item selection
  };

  const handleDimensionChange = (e) => {
    setFilterDimension(e.target.value);
    setCreateForm({ ...createForm, itemId: '' }); // Reset item selection
  };

  const handleCreateSubmit = (e, submitForReview) => {
    e.preventDefault();
    if (!createForm.itemId || !createForm.locationId || !createForm.quantityChange || !createForm.reason) {
      return alert("All fields are required.");
    }
    createMutation.mutate({
      payload: {
        ...createForm,
        quantityChange: Number(createForm.quantityChange),
        submitForReview
      }
    });
  };

  const handleReviewSubmit = (e, action) => {
    e.preventDefault();
    reviewMutation.mutate({
      id: reviewingAdjustment._id,
      payload: { action, reviewNotes }
    });
  };

  // ── DERIVED STATE FOR CASCADING DROPDOWNS ──

  const availableDimensions = useMemo(() => {
    return Array.from(
      new Set(
        items
          .filter(i => (filterType ? i.type === filterType : true))
          .map(i => i.dimensions)
          .filter(d => d && d.trim() !== '') // Remove empty dimensions
      )
    );
  }, [items, filterType]);

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      if (filterType && i.type !== filterType) return false;
      if (filterDimension && i.dimensions !== filterDimension) return false;
      return true;
    });
  }, [items, filterType, filterDimension]);

  // UI Helpers
  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      auto_approved: "bg-green-100 text-green-800"
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status.replace('_', ' ')}</span>;
  };

  if (adjustmentsLoading) return <div className="p-6 text-gray-600">Loading Adjustments...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Adjustments</h1>
          <p className="text-sm text-gray-500 mt-1">Reconcile physical stock discrepancies</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
             <button 
               onClick={handleExportAdjustments}
               className="bg-gray-100 text-gray-800 border border-gray-300 px-4 py-2 rounded hover:bg-gray-200 font-medium shadow-sm transition-colors"
             >
               📥 Export Adjustments
             </button>
          )}
          {canCreate && (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium shadow-sm transition-colors"
            >
              + Request Adjustment
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item & Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {adjustments.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500 text-sm">No adjustments found.</td></tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(adj.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{adj.itemId?.name || 'Deleted Item'} <span className="text-xs text-gray-500">({adj.itemId?.sku})</span></div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{adj.locationId?.name || 'Deleted Location'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      <span className={adj.quantityChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {adj.quantityChange > 0 ? '+' : ''}{adj.quantityChange}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={adj.reason}>
                      {adj.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(adj.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isAdmin && adj.status === 'pending' && (
                        <button 
                          onClick={() => setReviewingAdjustment(adj)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded"
                        >
                          Review
                        </button>
                      )}
                      {adj.status !== 'pending' && <span className="text-gray-400 text-xs italic">Reviewed</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border-t-4 border-blue-600">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Request Stock Adjustment</h2>
            <form>
              
              {/* 1. Item Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">1. Item Type</label>
                <select 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-gray-700 dark:text-white" 
                  value={filterType} 
                  onChange={handleTypeChange}
                >
                  <option value="">-- All Types --</option>
                  <option value="raw_material">Raw Material</option>
                  <option value="finished_good">Finished Good</option>
                </select>
              </div>

              {/* 2. Item Dimensions */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">2. Item Dimensions</label>
                <select 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-gray-700 dark:text-white" 
                  value={filterDimension} 
                  onChange={handleDimensionChange}
                  disabled={availableDimensions.length === 0}
                >
                  <option value="">-- All Dimensions --</option>
                  {availableDimensions.map(dim => (
                    <option key={dim} value={dim}>{dim}</option>
                  ))}
                </select>
              </div>

              {/* 3. Name of the Product */}
              <div className="mb-4 bg-blue-50 dark:bg-gray-900 p-3 rounded border border-blue-100 dark:border-gray-700">
                <label className="block text-sm font-bold mb-1 text-blue-800 dark:text-blue-300">3. Select Product *</label>
                <select 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-gray-700 dark:text-white" 
                  value={createForm.itemId} 
                  onChange={(e) => setCreateForm({...createForm, itemId: e.target.value})} 
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {filteredItems.map(i => (
                    <option key={i._id} value={i._id}>
                      {i.name} ({i.sku}) {i.dimensions ? `[${i.dimensions}]` : ''}
                    </option>
                  ))}
                </select>
                {filteredItems.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No products match your selected type/dimensions.</p>
                )}
              </div>

              {/* 4. Select Location */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">4. Location Stored *</label>
                <select 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-gray-700 dark:text-white" 
                  value={createForm.locationId} 
                  onChange={(e) => setCreateForm({...createForm, locationId: e.target.value})} 
                  required
                >
                  <option value="">-- Select Location --</option>
                  {locations.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* 5. Quantity Change */}
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">5. Add/Deduct Qty *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-gray-700 dark:text-white" 
                    value={createForm.quantityChange} 
                    onChange={(e) => setCreateForm({...createForm, quantityChange: e.target.value})} 
                    placeholder="e.g. -5 or +10" 
                    required 
                  />
                  <p className="text-xs text-gray-500 mt-1">Use '-' for deductions.</p>
                </div>
              </div>

              {/* 6. Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">6. Reason for Adjustment *</label>
                <textarea 
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-gray-700 dark:text-white" 
                  rows="2" 
                  value={createForm.reason} 
                  onChange={(e) => setCreateForm({...createForm, reason: e.target.value})} 
                  placeholder="e.g. Damaged goods, found extra stock, expired..." 
                  required
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={closeCreateModal} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm">Cancel</button>
                <button type="button" onClick={(e) => handleCreateSubmit(e, false)} disabled={createMutation.isLoading || !createForm.itemId} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium">Save Draft</button>
                <button type="button" onClick={(e) => handleCreateSubmit(e, true)} disabled={createMutation.isLoading || !createForm.itemId} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium">Submit for Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REVIEW MODAL (ADMIN ONLY) --- */}
      {reviewingAdjustment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Review Adjustment Request</h2>
            
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded mb-4 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300">
              <p><strong>Item:</strong> {reviewingAdjustment.itemId?.name}</p>
              <p><strong>Location:</strong> {reviewingAdjustment.locationId?.name}</p>
              <p><strong>Requested By:</strong> {reviewingAdjustment.requestedBy?.name}</p>
              <p><strong>Change:</strong> <span className={`font-bold ${reviewingAdjustment.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>{reviewingAdjustment.quantityChange}</span></p>
              <p className="mt-2"><strong>Reason:</strong> "{reviewingAdjustment.reason}"</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Review Notes (Optional)</label>
              <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 dark:bg-gray-700 dark:text-white" rows="2" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="e.g. Verified physical stock count."></textarea>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
              <button type="button" onClick={() => setReviewingAdjustment(null)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm font-medium">Cancel</button>
              <div className="flex gap-2">
                <button type="button" onClick={(e) => handleReviewSubmit(e, 'reject')} disabled={reviewMutation.isLoading} className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded hover:bg-red-100 text-sm font-bold">Reject</button>
                <button type="button" onClick={(e) => handleReviewSubmit(e, 'approve')} disabled={reviewMutation.isLoading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-bold">Approve & Execute</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}