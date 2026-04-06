import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

export default function Units() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', abbreviation: '' });

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data } = await api.get('/api/system/units');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => api.post('/api/system/units', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setForm({ name: '', abbreviation: '' });
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to create unit.')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/system/units/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units'] }),
    onError: (err) => alert(err.response?.data?.message || 'Failed to delete unit.')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  if (isLoading) return <div className="p-6">Loading units...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Measurement Units</h1>
        <p className="text-sm text-gray-500 mt-1">Manage secondary units for your inventory conversions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
          <h2 className="text-lg font-bold mb-4 dark:text-white">Add Custom Unit</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Name</label>
              <input type="text" required placeholder="e.g. Pallet" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Abbreviation</label>
              <input type="text" required placeholder="e.g. plt" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={form.abbreviation} onChange={e => setForm({...form, abbreviation: e.target.value})} />
            </div>
            <button type="submit" disabled={createMutation.isLoading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium">
              Create Unit
            </button>
          </form>
        </div>

        {/* Units Table */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abbreviation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {units.map(unit => (
                <tr key={unit._id}>
                  <td className="px-6 py-4 text-sm font-medium capitalize dark:text-white">{unit.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{unit.abbreviation}</td>
                  <td className="px-6 py-4 text-sm">
                    {unit.isCore 
                      ? <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">CORE UNIT (Protected)</span>
                      : <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">CUSTOM</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    {!unit.isCore && (
                      <button onClick={() => deleteMutation.mutate(unit._id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}