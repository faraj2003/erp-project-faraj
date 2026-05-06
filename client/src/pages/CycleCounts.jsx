import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

// --- API Fetchers ---
const fetchCycleCounts = async () => {
  const { data } = await api.get('/api/inventory/cycle-counts');
  return data.data;
};

const fetchLocations = async () => {
  // Assuming you have a standard locations endpoint
  const { data } = await api.get('/api/locations');
  return data.data || data; 
};

const CycleCounts = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAuditLocation, setNewAuditLocation] = useState('');

  // --- Queries ---
  const { data: audits = [], isLoading } = useQuery({ 
    queryKey: ['cycleCounts'], 
    queryFn: fetchCycleCounts 
  });
  
  const { data: locations = [] } = useQuery({ 
    queryKey: ['locations'], 
    queryFn: fetchLocations 
  });

  // --- Mutations ---
  const createAuditMutation = useMutation({
    mutationFn: (locationId) => api.post('/api/inventory/cycle-counts', { locationId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['cycleCounts']);
      setShowCreateModal(false);
      setNewAuditLocation('');
    },
    onError: (error) => alert(error.response?.data?.message || 'Failed to create audit')
  });

  const updateCountMutation = useMutation({
    mutationFn: ({ auditId, itemId, actualQuantity }) => 
      api.put(`/api/inventory/cycle-counts/${auditId}/count`, { itemId, actualQuantity }),
    onSuccess: (data) => {
      // Update the selected audit view dynamically
      setSelectedAudit(data.data.data);
      queryClient.invalidateQueries(['cycleCounts']);
    }
  });

  const completeAuditMutation = useMutation({
    mutationFn: (auditId) => api.post(`/api/inventory/cycle-counts/${auditId}/complete`),
    onSuccess: () => {
      setSelectedAudit(null);
      queryClient.invalidateQueries(['cycleCounts']);
    },
    onError: (error) => alert(error.response?.data?.message || 'Failed to complete audit')
  });

  // --- Handlers ---
  const handleCreateAudit = (e) => {
    e.preventDefault();
    if (!newAuditLocation) return;
    createAuditMutation.mutate(newAuditLocation);
  };

  const handleCountInput = (itemId, val) => {
    const actualQuantity = parseInt(val, 10);
    if (isNaN(actualQuantity) || actualQuantity < 0) return;
    updateCountMutation.mutate({ auditId: selectedAudit._id, itemId, actualQuantity });
  };

  // --- Views ---
  if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Cycle Counts...</div>;

  // View 2: Active Audit (Counting Mode)
  if (selectedAudit) {
    const isCompleted = selectedAudit.status === 'completed';
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <button onClick={() => setSelectedAudit(null)} className="text-blue-600 font-medium mb-4 hover:underline">
          &larr; Back to Audits
        </button>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{selectedAudit.name}</h2>
            <p className="text-gray-500 mt-1">Location: <span className="font-semibold text-gray-700">{selectedAudit.locationId?.name || 'Unknown'}</span></p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isCompleted ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
              {selectedAudit.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 text-sm font-semibold text-gray-600">Item</th>
                <th className="p-4 text-sm font-semibold text-gray-600">SKU</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-center">Expected</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-center">Actual Count</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-center">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectedAudit.itemsToCount.map((item) => {
                const isCounted = item.actualQuantity !== null;
                return (
                  <tr key={item.itemId._id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">{item.itemId.name}</td>
                    <td className="p-4 text-sm text-gray-500 font-mono">{item.itemId.sku}</td>
                    <td className="p-4 text-center text-gray-600">{item.expectedQuantity}</td>
                    <td className="p-4 text-center">
                      {isCompleted ? (
                        <span className="font-bold">{item.actualQuantity}</span>
                      ) : (
                        <input 
                          type="number" 
                          min="0"
                          defaultValue={item.actualQuantity ?? ''}
                          onBlur={(e) => handleCountInput(item.itemId._id, e.target.value)}
                          className={`w-24 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-blue-500 outline-none ${isCounted ? 'bg-blue-50 border-blue-200 font-bold' : 'bg-white border-gray-300'}`}
                          placeholder="---"
                        />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-bold ${item.variance < 0 ? 'text-red-600' : item.variance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {item.variance > 0 ? '+' : ''}{item.variance}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isCompleted && (
          <div className="mt-6 text-right">
            <button 
              onClick={() => completeAuditMutation.mutate(selectedAudit._id)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow"
            >
              Submit & Complete Audit
            </button>
          </div>
        )}
      </div>
    );
  }

  // View 1: List of Audits
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Cycle Counts & Audits</h1>
          <p className="text-gray-500 mt-1">Manage physical warehouse inventory checks.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow"
        >
          + New Audit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {audits.map(audit => (
          <div key={audit._id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => setSelectedAudit(audit)}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-gray-800 text-lg">{audit.name}</h3>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                audit.status === 'completed' ? 'bg-green-100 text-green-700' : 
                audit.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {audit.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Location: <span className="font-semibold">{audit.locationId?.name}</span></p>
            <div className="text-xs text-gray-500 flex justify-between border-t pt-3">
              <span>Items: {audit.itemsToCount.length}</span>
              <span>{new Date(audit.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {audits.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            No audits found. Create one to start counting!
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateAudit} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generate Cycle Count</h2>
            <p className="text-sm text-gray-500 mb-4">Select a location to snapshot current system inventory for a physical count.</p>
            
            <label className="block text-sm font-bold text-gray-700 mb-2">Location to Audit</label>
            <select 
              required
              value={newAuditLocation}
              onChange={(e) => setNewAuditLocation(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mb-6 outline-none focus:border-blue-500"
            >
              <option value="">-- Select a Location --</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc._id}>{loc.name}</option>
              ))}
            </select>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-medium">Cancel</button>
              <button type="submit" disabled={createAuditMutation.isLoading} className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:opacity-50">
                {createAuditMutation.isLoading ? 'Generating...' : 'Generate Audit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CycleCounts;