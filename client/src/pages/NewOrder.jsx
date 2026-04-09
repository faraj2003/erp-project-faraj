// src/pages/NewOrder.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

const objectId = z.string().min(1, 'Required');

const newOrderSchema = z.object({
  orderNumber: z
    .string()
    .min(1, 'Order number is required')
    .regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers, and dashes (e.g. PO-2026-001)'),
  
  locationId: z.string().min(1, 'You must select a shop or location'),
  notes: z.string().optional(),

  inputs: z
    .array(z.object({
      itemId: objectId,
      quantityRequired: z.coerce.number().min(0.01, 'Must be > 0'),
    }))
    .min(1, 'At least one raw material input is required'),
  outputs: z
    .array(z.object({
      itemId: objectId,
      quantityProduced: z.coerce.number().min(0.01, 'Must be > 0'),
    }))
    .min(1, 'At least one finished good output is required'),
});

export default function NewOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [pendingOutputIndex, setPendingOutputIndex] = useState(null);
  const [addItemForm, setAddItemForm] = useState({
    sku: '', name: '', productCompanyName: '', type: 'finished_good', categoryId: '', 
    costPerUnit: '', shelfLife: '', dimensions: '', 
    alertOrange: '', alertRed: '', alertCritical: '',
    supplierName: '', supplierContact: '',
    baseUnit: '', secUnitName: '', secUnitMultiplier: ''
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await api.get('/api/inventory');
      return data.data;
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get('/api/locations');
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/system/categories');
      return data.data;
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data } = await api.get('/api/system/units');
      return data.data;
    },
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      orderNumber: '',
      locationId: '',
      notes: '', 
      inputs: [{ itemId: '', quantityRequired: '' }],
      outputs: [{ itemId: '', quantityProduced: '' }],
    },
  });

  const { fields: inputFields, append: appendInput, remove: removeInput } = useFieldArray({ control, name: 'inputs' });
  const { fields: outputFields, append: appendOutput, remove: removeOutput } = useFieldArray({ control, name: 'outputs' });

  const watchLocationId = watch('locationId');
  const watchInputs = watch('inputs');

  const orderMutation = useMutation({
    mutationFn: async (body) => {
      const { data } = await api.post('/api/orders', body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (payload) => api.post('/api/inventory', payload),
    onSuccess: (response) => {
      const newItem = response.data.data;
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsAddItemModalOpen(false);
      
      if (pendingOutputIndex !== null) {
        setValue(`outputs.${pendingOutputIndex}.itemId`, newItem._id);
        setPendingOutputIndex(null);
      }

      setAddItemForm({
        sku: '', name: '', productCompanyName: '', type: 'finished_good', categoryId: '', 
        costPerUnit: '', shelfLife: '', dimensions: '', alertOrange: '', alertRed: '', alertCritical: '',
        supplierName: '', supplierContact: '', baseUnit: '', secUnitName: '', secUnitMultiplier: ''
      });
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to add new product.")
  });

  const onSubmitOrder = (data) => orderMutation.mutate(data);

  const handleAddNewOutputItem = (index) => {
    setPendingOutputIndex(index);
    setIsAddItemModalOpen(true);
  };

  const handleAddItemSubmit = (e) => {
    e.preventDefault();
    const payload = { 
      sku: addItemForm.sku, name: addItemForm.name, productCompanyName: addItemForm.productCompanyName,
      type: addItemForm.type, categoryId: addItemForm.categoryId || null,
      costPerUnit: Number(addItemForm.costPerUnit) || 0, shelfLife: addItemForm.shelfLife, dimensions: addItemForm.dimensions,
      alertLevels: { orange: Number(addItemForm.alertOrange), red: Number(addItemForm.alertRed), critical: Number(addItemForm.alertCritical) },
      supplier: { name: addItemForm.supplierName, contactInfo: addItemForm.supplierContact },
      baseUnit: addItemForm.baseUnit, secondaryUnits: []
    };
    if (addItemForm.secUnitName && addItemForm.secUnitMultiplier) {
      payload.secondaryUnits.push({ name: addItemForm.secUnitName, multiplierToBase: Number(addItemForm.secUnitMultiplier) });
    }
    addItemMutation.mutate(payload);
  };

  const locationRawMaterials = inventory.filter(i => 
    i.type === 'raw_material' && 
    i.balances?.some(b => b.locationId?._id === watchLocationId && b.quantity > 0)
  );
  
  const finishedGoods = inventory.filter(i => i.type === 'finished_good');

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <button onClick={() => navigate('/orders')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1 font-medium">
          ← Back to Orders
        </button>
        <h2 className="text-3xl font-extrabold text-gray-800">New Production Order</h2>
        <p className="text-sm text-gray-500 mt-1">Assign a shop, define inputs from location stock, and set outputs.</p>
      </div>

      {orderMutation.isError && (
        <div className="mb-6 text-sm bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
          {orderMutation.error?.response?.data?.message || 'Failed to create order.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmitOrder)} className="space-y-8">
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Order Number *</label>
            <input {...register('orderNumber')} placeholder="PO-2026-001" className="w-full border border-gray-300 rounded-md p-2" />
            {errors.orderNumber && <p className="text-red-500 text-xs mt-1">{errors.orderNumber.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Executing Shop / Location *</label>
            <select {...register('locationId')} className="w-full border border-gray-300 rounded-md p-2 bg-white">
              <option value="">-- Select Location --</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc._id}>{loc.name} ({loc.type})</option>
              ))}
            </select>
            {errors.locationId && <p className="text-red-500 text-xs mt-1">{errors.locationId.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Special Instructions / Notes</label>
            <textarea {...register('notes')} placeholder="Enter order notes here..." className="w-full border border-gray-300 rounded-md p-2 min-h-[80px]" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm border-t-4 border-t-orange-400">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Raw Material Inputs</h3>
              <p className="text-xs text-gray-500 mt-0.5">Please select a location above to see available materials.</p>
            </div>
            <button type="button" disabled={!watchLocationId} onClick={() => appendInput({ itemId: '', quantityRequired: '' })} className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-orange-200 transition disabled:opacity-50">
              + Add Material
            </button>
          </div>
          
          <div className="space-y-4">
            {inputFields.map((field, index) => {
              const selectedItemId = watchInputs[index]?.itemId;
              const enteredQty = watchInputs[index]?.quantityRequired;
              
              const selectedItem = locationRawMaterials.find(i => i._id === selectedItemId);
              const maxAvailableAtLoc = selectedItem?.balances?.find(b => b.locationId?._id === watchLocationId)?.quantity || 0;
              
              const exceedsStock = Number(enteredQty) > maxAvailableAtLoc;

              return (
                <div key={field.id} className="flex gap-3 items-start bg-gray-50 p-3 rounded border border-gray-100">
                  <div className="flex-1">
                    <select {...register(`inputs.${index}.itemId`)} className="input w-full border border-gray-300 rounded-md p-2" disabled={!watchLocationId}>
                      <option value="">Select available item...</option>
                      {locationRawMaterials.map((item) => {
                        const locBalance = item.balances?.find(b => b.locationId?._id === watchLocationId)?.quantity || 0;
                        return (
                          <option key={item._id} value={item._id}>
                            {item.name} {item.dimensions ? `[${item.dimensions}]` : ''} — {locBalance} {item.baseUnit} available here
                          </option>
                        );
                      })}
                    </select>
                    {errors?.inputs?.[index]?.itemId && <p className="text-red-500 text-xs mt-1">{errors.inputs[index].itemId.message}</p>}
                  </div>
                  
                  <div className="w-48">
                    <input type="number" step="0.01" placeholder="Qty" {...register(`inputs.${index}.quantityRequired`)} className="input w-full border border-gray-300 rounded-md p-2" disabled={!watchLocationId} />
                    {errors?.inputs?.[index]?.quantityRequired && <p className="text-red-500 text-xs mt-1">{errors.inputs[index].quantityRequired.message}</p>}
                    
                    {selectedItemId && exceedsStock && (
                       <p className="text-red-600 font-bold text-xs mt-1">⚠️ Exceeds max available ({maxAvailableAtLoc})!</p>
                    )}
                  </div>
                  
                  <button type="button" onClick={() => removeInput(index)} className="mt-1 text-red-400 hover:text-red-600 text-xl font-bold px-2 transition-colors">✕</button>
                </div>
              );
            })}
          </div>
          {typeof errors.inputs?.message === 'string' && <p className="text-red-500 text-xs mt-2">{errors.inputs.message}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm border-t-4 border-t-blue-500">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Finished Good Outputs</h3>
              <p className="text-xs text-gray-500 mt-0.5">Outputs will be stored in the Location selected above.</p>
            </div>
            <button type="button" onClick={() => appendOutput({ itemId: '', quantityProduced: '' })} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-blue-200 transition">
              + Add Output
            </button>
          </div>
          
          <div className="space-y-4">
            {outputFields.map((field, index) => {
              const { onChange, onBlur, name, ref } = register(`outputs.${index}.itemId`);

              return (
                <div key={field.id} className="flex gap-3 items-start bg-gray-50 p-3 rounded border border-gray-100">
                  <div className="flex-1">
                    <select 
                      name={name} ref={ref} onBlur={onBlur}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                          handleAddNewOutputItem(index);
                          e.target.value = ""; 
                        } else {
                          onChange(e); 
                        }
                      }}
                      className="input w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="">Select finished good...</option>
                      {finishedGoods.map((item) => (
                        <option key={item._id} value={item._id}>
                           {item.name} {item.dimensions ? `[${item.dimensions}]` : ''} ({item.sku})
                        </option>
                      ))}
                      <option value="ADD_NEW" className="font-bold text-green-600 bg-green-50">+ Create New Product...</option>
                    </select>
                    {errors?.outputs?.[index]?.itemId && <p className="text-red-500 text-xs mt-1">{errors.outputs[index].itemId.message}</p>}
                  </div>
                  
                  <div className="w-48">
                    <input type="number" step="0.01" placeholder="Qty" {...register(`outputs.${index}.quantityProduced`)} className="input w-full border border-gray-300 rounded-md p-2" />
                    {errors?.outputs?.[index]?.quantityProduced && <p className="text-red-500 text-xs mt-1">{errors.outputs[index].quantityProduced.message}</p>}
                  </div>
                  
                  <button type="button" onClick={() => removeOutput(index)} className="mt-1 text-red-400 hover:text-red-600 text-xl font-bold px-2 transition-colors">✕</button>
                </div>
              );
            })}
          </div>
          {typeof errors.outputs?.message === 'string' && <p className="text-red-500 text-xs mt-2">{errors.outputs.message}</p>}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={() => navigate('/orders')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={isSubmitting || orderMutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50">
            {orderMutation.isPending ? 'Creating Order...' : 'Create Production Order'}
          </button>
        </div>
      </form>

      {/* ── INLINE ADD NEW PRODUCT MODAL ── */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto border-t-4 border-green-600">
            <h2 className="text-xl font-bold mb-4">Quick Create: Finished Good</h2>
            <form onSubmit={handleAddItemSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2" value={addItemForm.name} onChange={(e) => setAddItemForm({ ...addItemForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU *</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2 uppercase" value={addItemForm.sku} onChange={(e) => setAddItemForm({ ...addItemForm, sku: e.target.value.toUpperCase() })} required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Brand/Company</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2" value={addItemForm.productCompanyName} onChange={(e) => setAddItemForm({ ...addItemForm, productCompanyName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Per Unit</label>
                  <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2" value={addItemForm.costPerUnit} onChange={(e) => setAddItemForm({ ...addItemForm, costPerUnit: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shelf Life</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2" value={addItemForm.shelfLife} onChange={(e) => setAddItemForm({ ...addItemForm, shelfLife: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select className="w-full border border-gray-300 rounded p-2 bg-gray-100 text-gray-600" value={addItemForm.type} disabled>
                    <option value="finished_good">Finished Good</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select className="w-full border border-gray-300 rounded p-2" value={addItemForm.categoryId} onChange={(e) => setAddItemForm({ ...addItemForm, categoryId: e.target.value })}>
                    <option value="">-- No Category --</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.parentId ? `↳ ${c.name}` : c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dimensions</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2" value={addItemForm.dimensions} onChange={(e) => setAddItemForm({ ...addItemForm, dimensions: e.target.value })} />
                </div>
              </div>

              <div className="bg-orange-50 p-3 rounded border border-orange-200 mb-4">
                <h4 className="text-sm font-bold text-orange-800 mb-2">Stock Alert Thresholds</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-orange-700">Orange</label>
                    <input type="number" min="0" className="w-full border border-gray-300 rounded p-2" value={addItemForm.alertOrange} onChange={(e) => setAddItemForm({ ...addItemForm, alertOrange: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-red-600">Red</label>
                    <input type="number" min="0" className="w-full border border-gray-300 rounded p-2" value={addItemForm.alertRed} onChange={(e) => setAddItemForm({ ...addItemForm, alertRed: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-red-800">Critical</label>
                    <input type="number" min="0" className="w-full border border-gray-300 rounded p-2" value={addItemForm.alertCritical} onChange={(e) => setAddItemForm({ ...addItemForm, alertCritical: e.target.value })} required />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-6 mt-2">
                <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Measurement Units</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Base Unit *</label>
                  <select className="w-full border border-gray-300 rounded p-2" value={addItemForm.baseUnit} onChange={(e) => setAddItemForm({ ...addItemForm, baseUnit: e.target.value })} required>
                    <option value="">-- Select Base Unit --</option>
                    {units.map(u => <option key={u._id} value={u.name}>{u.name} ({u.abbreviation})</option>)}
                  </select>
                </div>
                
                {/* ── SECONDARY UNIT: UPDATED TO FREE TEXT FIELD ── */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Secondary Unit (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded p-2" 
                      value={addItemForm.secUnitName} 
                      onChange={(e) => setAddItemForm({ ...addItemForm, secUnitName: e.target.value })} 
                      placeholder="e.g., Piece, Slice, Gram (Free text)" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Multiplier</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0.01" 
                      className="w-full border border-gray-300 rounded p-2" 
                      value={addItemForm.secUnitMultiplier} 
                      onChange={(e) => setAddItemForm({ ...addItemForm, secUnitMultiplier: e.target.value })} 
                      placeholder={addItemForm.secUnitName ? `How many ${addItemForm.secUnitName} = 1 ${addItemForm.baseUnit || 'Base'}?` : ""} 
                      required={!!addItemForm.secUnitName} 
                      disabled={!addItemForm.secUnitName} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddItemModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={addItemMutation.isLoading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Create & Select</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}