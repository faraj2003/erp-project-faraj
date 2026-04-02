// src/pages/NewOrder.jsx
// Dynamic Order Builder
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

// ── Zod schema ──
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

// ── API ──
const fetchItemsByType = async (type) => {
  const { data } = await api.get(`/api/inventory?type=${type}`);
  return data.data || data; // Handle both wrapper styles
};

const fetchLocations = async () => {
  const { data } = await api.get('/api/locations');
  return data;
};

const createOrder = async (body) => {
  const { data } = await api.post('/api/orders', body);
  return data.data;
};

// ── Dynamic field row ──
const ItemRow = ({ register, errors, index, remove, items = [], qtyField, itemLabel }) => (
  <div className="flex gap-3 items-start">
    <div className="flex-1">
      <select
        {...register(`${itemLabel}.${index}.itemId`)}
        className="input w-full border border-gray-300 rounded-md p-2"
      >
        <option value="">Select item...</option>
        {items.map((item) => (
          <option key={item._id} value={item._id}>
            {/* UPDATED: Changed item.unit to item.baseUnit */}
            {item.name} ({item.sku}) — {item.currentStock} {item.baseUnit} global stock
          </option>
        ))}
      </select>
      {errors?.[itemLabel]?.[index]?.itemId && (
        <p className="text-red-500 text-xs mt-1">{errors[itemLabel][index].itemId.message}</p>
      )}
    </div>
    <div className="w-36">
      <input
        type="number"
        step="0.01"
        placeholder="Qty"
        {...register(`${itemLabel}.${index}.${qtyField}`)}
        className="input w-full border border-gray-300 rounded-md p-2"
      />
      {errors?.[itemLabel]?.[index]?.[qtyField] && (
        <p className="text-red-500 text-xs mt-1">{errors[itemLabel][index][qtyField].message}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => remove(index)}
      className="mt-1 text-red-400 hover:text-red-600 text-xl font-bold px-2 transition-colors"
      title="Remove row"
    >
      ✕
    </button>
  </div>
);

// ── Main Page ──
const NewOrder = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch raw materials, finished goods, and locations
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ['inventory', { type: 'raw_material' }],
    queryFn: () => fetchItemsByType('raw_material'),
  });

  const { data: finishedGoods = [] } = useQuery({
    queryKey: ['inventory', { type: 'finished_good' }],
    queryFn: () => fetchItemsByType('finished_good'),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
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

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders');
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button onClick={() => navigate('/orders')} className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1 font-medium">
          ← Back to Orders
        </button>
        <h2 className="text-3xl font-extrabold text-gray-800">New Production Order</h2>
        <p className="text-sm text-gray-500 mt-1">Assign a shop, define inputs, and set expected outputs.</p>
      </div>

      {mutation.isError && (
        <div className="mb-6 text-sm bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
          {mutation.error?.response?.data?.message || mutation.error?.response?.data?.error || 'Failed to create order.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
            <textarea {...register('notes')} placeholder="e.g., Rush order, use Batch #44..." className="w-full border border-gray-300 rounded-md p-2 min-h-[80px]" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm border-t-4 border-t-orange-400">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Raw Material Inputs</h3>
              <p className="text-xs text-gray-500 mt-0.5">Materials requested from inventory</p>
            </div>
            <button type="button" onClick={() => appendInput({ itemId: '', quantityRequired: '' })} className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-orange-200 transition">
              + Add Material
            </button>
          </div>
          <div className="space-y-4">
            {inputFields.map((field, index) => (
              <ItemRow key={field.id} register={register} errors={errors} index={index} remove={removeInput} items={rawMaterials} qtyField="quantityRequired" itemLabel="inputs" />
            ))}
          </div>
          {typeof errors.inputs?.message === 'string' && <p className="text-red-500 text-xs mt-2">{errors.inputs.message}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm border-t-4 border-t-blue-500">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Finished Good Outputs</h3>
              <p className="text-xs text-gray-500 mt-0.5">Items produced and added to shop inventory</p>
            </div>
            <button type="button" onClick={() => appendOutput({ itemId: '', quantityProduced: '' })} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-blue-200 transition">
              + Add Output
            </button>
          </div>
          <div className="space-y-4">
            {outputFields.map((field, index) => (
              <ItemRow key={field.id} register={register} errors={errors} index={index} remove={removeOutput} items={finishedGoods} qtyField="quantityProduced" itemLabel="outputs" />
            ))}
          </div>
          {typeof errors.outputs?.message === 'string' && <p className="text-red-500 text-xs mt-2">{errors.outputs.message}</p>}
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={() => navigate('/orders')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={isSubmitting || mutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? 'Creating Order...' : 'Create Production Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewOrder;