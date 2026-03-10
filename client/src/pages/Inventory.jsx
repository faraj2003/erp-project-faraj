// src/pages/Inventory.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

// ── Zod schema ──
const createItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required').toUpperCase(),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['raw_material', 'finished_good'], { errorMap: () => ({ message: 'Select a type' }) }),
  currentStock: z.coerce.number().min(0, 'Cannot be negative').optional(),
  minStockLevel: z.coerce.number().min(0, 'Cannot be negative'),
  unit: z.string().min(1, 'Unit is required'),
});

// ── API fetchers ──
const fetchItems = async ({ search, type }) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (type) params.append('type', type);
  const { data } = await api.get(`/api/inventory?${params}`);
  return data.data;
};

const fetchLowStock = async () => {
  const { data } = await api.get('/api/inventory/low-stock');
  return data.data;
};

const createItemAPI = async (body) => {
  const { data } = await api.post('/api/inventory', body);
  return data.data;
};

// ── NEW API CALLS ──
const updateItemAPI = async ({ id, ...body }) => {
  const { data } = await api.put(`/api/inventory/${id}`, body);
  return data.data;
};

const deleteItemAPI = async (id) => {
  await api.delete(`/api/inventory/${id}`);
};

// ── Subcomponents ──
const Badge = ({ type }) =>
  type === 'raw_material' ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 transition-colors">
      Raw Material
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 transition-colors">
      Finished Good
    </span>
  );

const StockCell = ({ current, min }) => {
  const isLow = current < min;
  return (
    <div className="flex items-center gap-2">
      <span className={`font-semibold transition-colors ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
        {current.toLocaleString()}
      </span>
      {isLow && (
        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium transition-colors">
          ⚠ Low
        </span>
      )}
    </div>
  );
};

// ── Add Item Modal ──
const AddItemModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(createItemSchema) });

  const mutation = useMutation({
    mutationFn: createItemAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-transparent dark:border-gray-700 transition-colors">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Add Inventory Item</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none transition-colors">✕</button>
        </div>

        {mutation.isError && (
          <div className="mb-4 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg transition-colors">
            {mutation.error?.response?.data?.error || 'Failed to create item'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">SKU *</label>
              <input {...register('sku')} placeholder="RAW-STL-01" className="input" />
              {errors.sku && <p className="err">{errors.sku.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Name *</label>
              <input {...register('name')} placeholder="Steel Rods" className="input" />
              {errors.name && <p className="err">{errors.name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Type *</label>
            <select {...register('type')} className="input">
              <option value="">Select type...</option>
              <option value="raw_material">Raw Material</option>
              <option value="finished_good">Finished Good</option>
            </select>
            {errors.type && <p className="err">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Current Stock</label>
              <input type="number" {...register('currentStock')} defaultValue={0} className="input" />
              {errors.currentStock && <p className="err">{errors.currentStock.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Min Level *</label>
              <input type="number" {...register('minStockLevel')} placeholder="50" className="input" />
              {errors.minStockLevel && <p className="err">{errors.minStockLevel.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Unit *</label>
              <input {...register('unit')} placeholder="kg" className="input" />
              {errors.unit && <p className="err">{errors.unit.message}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="flex-1 btn-primary">
              {mutation.isPending ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── NEW: Edit Item Modal ──
const EditItemModal = ({ item, onClose }) => {
  const queryClient = useQueryClient();
  
  // Pre-fill the form with the existing item's data
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ 
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      sku: item.sku,
      name: item.name,
      type: item.type,
      currentStock: item.currentStock,
      minStockLevel: item.minStockLevel,
      unit: item.unit,
    }
  });

  const mutation = useMutation({
    mutationFn: updateItemAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
    },
  });

  const onSubmit = (data) => mutation.mutate({ id: item._id, ...data });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-transparent dark:border-gray-700 transition-colors">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Edit Inventory Item</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none transition-colors">✕</button>
        </div>

        {mutation.isError && (
          <div className="mb-4 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg transition-colors">
            {mutation.error?.response?.data?.error || 'Failed to update item'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">SKU *</label>
              <input {...register('sku')} className="input" />
              {errors.sku && <p className="err">{errors.sku.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Name *</label>
              <input {...register('name')} className="input" />
              {errors.name && <p className="err">{errors.name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Type *</label>
            <select {...register('type')} className="input">
              <option value="raw_material">Raw Material</option>
              <option value="finished_good">Finished Good</option>
            </select>
            {errors.type && <p className="err">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Current Stock</label>
              <input type="number" {...register('currentStock')} className="input" />
              {errors.currentStock && <p className="err">{errors.currentStock.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Min Level *</label>
              <input type="number" {...register('minStockLevel')} className="input" />
              {errors.minStockLevel && <p className="err">{errors.minStockLevel.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Unit *</label>
              <input {...register('unit')} className="input" />
              {errors.unit && <p className="err">{errors.unit.message}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors">
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ──
const Inventory = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // ── NEW: State to hold the item currently being edited ──
  const [itemToEdit, setItemToEdit] = useState(null);
  
  const [showLowStock, setShowLowStock] = useState(false);
  const { isManager } = useAuthStore();

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['inventory', { search, type: typeFilter }],
    queryFn: () => fetchItems({ search, type: typeFilter }),
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: fetchLowStock,
  });

  // ── NEW: Delete Mutation ──
  const deleteMutation = useMutation({
    mutationFn: deleteItemAPI,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
    onError: (err) => alert(err?.response?.data?.error || 'Failed to delete item'),
  });

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportCSV = () => {
    if (!items || items.length === 0) return;

    const headers = ['SKU', 'Item Name', 'Type', 'Current Stock', 'Min Level', 'Unit'];
    const csvRows = [headers.join(',')];

    items.forEach(item => {
      const safeName = item.name.replace(/"/g, '""'); 
      const row = [
        item.sku,
        `"${safeName}"`,
        item.type,
        item.currentStock,
        item.minStockLevel,
        item.unit
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factoryflow-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white transition-colors">Inventory</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-colors">
            {items.length} item{items.length !== 1 ? 's' : ''} in catalog
            {lowStockItems.length > 0 && (
              <button
                onClick={() => setShowLowStock(!showLowStock)}
                className="ml-3 text-red-600 dark:text-red-400 font-semibold hover:underline transition-colors"
              >
                ⚠ {lowStockItems.length} low-stock alert{lowStockItems.length !== 1 ? 's' : ''}
              </button>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <button 
              onClick={handleExportCSV}
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors text-sm flex items-center gap-2 cursor-pointer"
            >
              <span className="text-lg leading-none">⬇</span> Export CSV
            </button>
          )}

          {isManager() && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              + Add Item
            </button>
          )}
        </div>
      </div>

      {/* Low-stock alert banner */}
      {showLowStock && lowStockItems.length > 0 && (
        <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-4 transition-colors">
          <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">⚠ Items Below Minimum Stock Level</p>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => (
              <span key={item._id} className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium border border-transparent dark:border-red-800/50 transition-colors">
                {item.name} — {item.currentStock} / {item.minStockLevel} {item.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input max-w-[180px]"
        >
          <option value="">All Types</option>
          <option value="raw_material">Raw Material</option>
          <option value="finished_good">Finished Good</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-sm animate-pulse">Loading inventory...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500 dark:text-red-400 text-sm">Failed to load inventory.</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No items found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-left transition-colors">
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Min Level</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit</th>
                {/* ── NEW: Actions column for managers ── */}
                {isManager() && (
                  <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const isLow = item.currentStock < item.minStockLevel;
                return (
                  <tr
                    key={item._id}
                    className={`transition-colors duration-150 ${isLow ? 'bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50/60 dark:hover:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 font-semibold">{item.sku}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{item.name}</td>
                    <td className="px-4 py-3"><Badge type={item.type} /></td>
                    <td className="px-4 py-3"><StockCell current={item.currentStock} min={item.minStockLevel} /></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.minStockLevel.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-500">{item.unit}</td>
                    
                    {/* ── NEW: Edit/Delete buttons ── */}
                    {isManager() && (
                      <td className="px-4 py-3 text-right space-x-3">
                        <button 
                          onClick={() => setItemToEdit(item)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-xs transition-colors"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item._id, item.name)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium text-xs transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} />}
      
      {/* ── NEW: Render the Edit Modal ── */}
      {itemToEdit && <EditItemModal item={itemToEdit} onClose={() => setItemToEdit(null)} />}
    </div>
  );
};

export default Inventory;