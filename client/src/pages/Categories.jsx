import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

export default function Categories() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', parentId: '' });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/system/categories');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => api.post('/api/system/categories', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setForm({ name: '', description: '', parentId: '' });
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to create category.')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/system/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err) => alert(err.response?.data?.message || 'Failed to delete category.')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.parentId) payload.parentId = null; // Clean empty string to null for root categories
    createMutation.mutate(payload);
  };

  // Helper to visually indent sub-categories based on their path depth
  const getIndentLevel = (path) => {
    if (!path) return 0;
    const depth = path.split(',').filter(Boolean).length;
    return depth * 1.5; // 1.5rem indent per level
  };

  if (isLoading) return <div className="p-6">Loading categories...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Category Hierarchy</h1>
        <p className="text-sm text-gray-500 mt-1">Organize your item master using multi-level classification.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-fit">
          <h2 className="text-lg font-bold mb-4 dark:text-white">Add Category</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Name *</label>
              <input type="text" required className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Parent Category (Optional)</label>
              <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={form.parentId} onChange={e => setForm({...form, parentId: e.target.value})}>
                <option value="">-- Top Level (Root) --</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Description</label>
              <textarea rows="2" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
            </div>
            <button type="submit" disabled={createMutation.isLoading} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-medium">
              Create Category
            </button>
          </form>
        </div>

        {/* Categories Tree View */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-2">
          {categories.length === 0 ? (
             <div className="p-8 text-center text-gray-500">No categories found. Create one to start building your hierarchy.</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {categories.map(cat => (
                <li key={cat._id} className="flex justify-between items-center py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700/50" style={{ paddingLeft: `${getIndentLevel(cat.path) + 1}rem` }}>
                  <div>
                    {cat.parentId && <span className="text-gray-300 dark:text-gray-600 mr-2">↳</span>}
                    <span className="font-semibold text-gray-800 dark:text-white">{cat.name}</span>
                    {cat.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.description}</p>}
                  </div>
                  <button onClick={() => deleteMutation.mutate(cat._id)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}