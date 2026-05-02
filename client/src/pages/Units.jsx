import React, { useState, useEffect } from 'react';
import api from '../lib/axios';

export default function Units() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    baseUnit: 'pcs',
    conversionRate: ''
  });

  const fetchUnits = async () => {
    try {
      const response = await api.get('/units');
      setUnits(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch units', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/units', {
        ...formData,
        conversionRate: Number(formData.conversionRate)
      });
      setFormData({ name: '', abbreviation: '', baseUnit: 'pcs', conversionRate: '' });
      fetchUnits(); // Refresh the list
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create unit');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;
    try {
      await api.delete(`/units/${id}`);
      fetchUnits();
    } catch (error) {
      alert('Failed to delete unit');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      <div className="border-b pb-4">
        <h1 className="text-3xl font-light text-gray-900">Custom Units of Measurement</h1>
        <p className="text-sm text-gray-500 mt-1">Define conversion rates for bulk receiving and issuing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Unit Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Unit</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit Name</label>
                <input 
                  type="text" required placeholder="e.g., Pallet"
                  className="mt-1 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Abbreviation</label>
                <input 
                  type="text" required placeholder="e.g., PLT"
                  className="mt-1 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 uppercase"
                  value={formData.abbreviation} onChange={(e) => setFormData({...formData, abbreviation: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Target Base Unit</label>
                <input 
                  type="text" required placeholder="e.g., pcs"
                  className="mt-1 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 lowercase"
                  value={formData.baseUnit} onChange={(e) => setFormData({...formData, baseUnit: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Conversion Rate</label>
                <input 
                  type="number" step="0.01" required placeholder="e.g., 500"
                  className="mt-1 w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={formData.conversionRate} onChange={(e) => setFormData({...formData, conversionRate: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  1 {formData.name || '[Unit]'} = {formData.conversionRate || '[X]'} {formData.baseUnit || '[Base Unit]'}
                </p>
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
                Save Unit
              </button>
            </form>
          </div>
        </div>

        {/* Existing Units Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Abbr.</th>
                  <th className="px-6 py-3 font-medium">Conversion Logic</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center">Loading...</td></tr>
                ) : units.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No custom units defined.</td></tr>
                ) : (
                  units.map((unit) => (
                    <tr key={unit._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{unit.name}</td>
                      <td className="px-6 py-4 font-mono text-xs">{unit.abbreviation}</td>
                      <td className="px-6 py-4 font-mono text-xs bg-gray-50 rounded">
                        1 <span className="font-bold">{unit.abbreviation}</span> = {unit.conversionRate} <span className="font-bold">{unit.baseUnit}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(unit._id)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}