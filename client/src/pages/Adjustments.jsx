import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
// Assuming you have a hook or store that provides the current logged-in user
// import useAuthStore from '../store/authStore'; 

export default function Adjustments() {
  // Mocking user role for demonstration (Replace with actual auth state)
  const userRole = 'manager'; // Change to 'staff' to see the Maker view

  // State for the Maker Form
  const [formData, setFormData] = useState({ itemId: '', locationId: '', quantityChange: '', reason: '' });
  
  // State for the Checker Queue
  const [pendingAdjustments, setPendingAdjustments] = useState([]);
  
  // State for Dropdowns
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch dropdown data (Ensure you have simple GET routes for these in your backend)
        const [itemsRes, locsRes] = await Promise.all([
          api.get('/inventory/items').catch(() => ({ data: { data: [] } })),
          api.get('/inventory/locations').catch(() => ({ data: { data: [] } }))
        ]);
        setItems(itemsRes.data.data || []);
        setLocations(locsRes.data.data || []);

        // If manager, fetch pending adjustments
        if (userRole === 'manager' || userRole === 'admin') {
          const adjRes = await api.get('/inventory/adjustments?status=Pending_Review').catch(() => ({ data: { data: [] } }));
          setPendingAdjustments(adjRes.data.data || []);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    fetchData();
  }, [userRole]);

  // ==========================================
  // MAKER ACTIONS
  // ==========================================
  const handleDraftSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/adjustments', {
        ...formData,
        quantityChange: Number(formData.quantityChange)
      });
      alert('Draft submitted for manager review!');
      setFormData({ itemId: '', locationId: '', quantityChange: '', reason: '' }); // Reset form
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit draft');
    }
  };

  // ==========================================
  // CHECKER ACTIONS
  // ==========================================
  const handleApprove = async (id) => {
    try {
      await api.patch(`/inventory/adjustments/${id}/approve`);
      setPendingAdjustments(pendingAdjustments.filter(adj => adj._id !== id));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const notes = prompt("Reason for rejection:");
    if (notes === null) return; // User cancelled

    try {
      await api.patch(`/inventory/adjustments/${id}/reject`, { notes });
      setPendingAdjustments(pendingAdjustments.filter(adj => adj._id !== id));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-light text-gray-900">Inventory Adjustments</h1>
          <p className="text-sm text-gray-500 mt-1">Maker-Checker workflow for stock discrepancies.</p>
        </div>
        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
          Role: {userRole.toUpperCase()}
        </span>
      </div>

      {/* MAKER VIEW: The Submission Form */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Submit Adjustment Draft</h2>
        <form onSubmit={handleDraftSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Item</label>
            <select 
              required
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={formData.itemId}
              onChange={(e) => setFormData({...formData, itemId: e.target.value})}
            >
              <option value="">Select Item...</option>
              {items.map(item => <option key={item._id} value={item._id}>{item.name} ({item.sku})</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <select 
              required
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={formData.locationId}
              onChange={(e) => setFormData({...formData, locationId: e.target.value})}
            >
              <option value="">Select Location...</option>
              {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name} - {loc.zone}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Quantity Change (+ or -)</label>
            <input 
              type="number" 
              required
              placeholder="e.g., -5 or 10"
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={formData.quantityChange}
              onChange={(e) => setFormData({...formData, quantityChange: e.target.value})}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Reason for Adjustment</label>
            <input 
              type="text" 
              required
              placeholder="e.g., Found extra items behind shelf, or items damaged by water"
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button 
              type="submit" 
              className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Submit for Review
            </button>
          </div>
        </form>
      </div>

      {/* CHECKER VIEW: The Manager's Approval Queue */}
      {(userRole === 'manager' || userRole === 'admin') && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Pending Approvals Queue</h2>
          </div>
          
          {pendingAdjustments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No pending adjustments currently require your review.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Item</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Change</th>
                  <th className="px-6 py-3 font-medium">Reason</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingAdjustments.map((adj) => (
                  <tr key={adj._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{adj.item?.name || 'Unknown Item'}</td>
                    <td className="px-6 py-4">{adj.location?.name || 'Unknown Location'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${adj.quantityChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {adj.quantityChange > 0 ? '+' : ''}{adj.quantityChange}
                      </span>
                    </td>
                    <td className="px-6 py-4 truncate max-w-xs">{adj.reason}</td>
                    <td className="px-6 py-4 flex justify-end gap-2">
                      <button 
                        onClick={() => handleApprove(adj._id)}
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleReject(adj._id)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
}