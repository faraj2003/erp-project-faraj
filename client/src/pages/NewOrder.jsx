// src/pages/NewOrder.jsx
// Dynamic Order Builder
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

// ── Zod schema ──
const objectId = z.string().min(1, 'Select an item');

const newOrderSchema = z.object({
  orderNumber: z
    .string()
    .min(1, 'Order number is required')
    .regex(/^[A-Z0-9-]+$/, 'Use uppercase letters, numbers, and dashes (e.g. PO-2026-001)'),
  
  // ── NEW FIELD: Optional Notes ──
  notes: z.string().optional(),
  // ───────────────────────────────

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
  return data.data;
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
        className="input w-full"
      >
        <option value="">Select item...</option>
        {items.map((item) => (
          <option key={item._id} value={item._id}>
            {item.name} ({item.sku}) — {item.currentStock} {item.unit} available
          </option>
        ))}
      </select>
      {errors?.[itemLabel]?.[index]?.itemId && (
        <p className="err">{errors[itemLabel][index].itemId.message}</p>
      )}
    </div>
    <div className="w-36">
      <input
        type="number"
        step="0.01"
        placeholder="Qty"
        {...register(`${itemLabel}.${index}.${qtyField}`)}
        className="input w-full"
      />
      {errors?.[itemLabel]?.[index]?.[qtyField] && (
        <p className="err">{errors[itemLabel][index][qtyField].message}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => remove(index)}
      className="mt-0.5 text-red-400 hover:text-red-600 text-lg leading-none px-1 transition-colors"
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

  // Fetch raw materials and finished goods in parallel
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ['inventory', { type: 'raw_material' }],
    queryFn: () => fetchItemsByType('raw_material'),
  });

  const { data: finishedGoods = [] } = useQuery({
    queryKey: ['inventory', { type: 'finished_good' }],
    queryFn: () => fetchItemsByType('finished_good'),
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      orderNumber: '',
      notes: '', // ── NEW FIELD DEFAULT ──
      inputs: [{ itemId: '', quantityRequired: '' }],
      outputs: [{ itemId: '', quantityProduced: '' }],
    },
  });

  const {
    fields: inputFields,
    append: appendInput,
    remove: removeInput,
  } = useFieldArray({ control, name: 'inputs' });

  const {
    fields: outputFields,
    append: appendOutput,
    remove: removeOutput,
  } = useFieldArray({ control, name: 'outputs' });

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders');
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
        >
          ← Back to Orders
        </button>
        <h2 className="text-2xl font-extrabold text-gray-800">New Production Order</h2>
        <p className="text-sm text-gray-500 mt-0.5">Define raw material inputs and finished good outputs</p>
      </div>

      {mutation.isError && (
        <div className="mb-5 text-sm bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {mutation.error?.response?.data?.error || 'Failed to create order. Please try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Order Number */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">Order Number *</label>
          <input
            {...register('orderNumber')}
            placeholder="PO-2026-001"
            className="input max-w-sm"
          />
          {errors.orderNumber && <p className="err mt-1">{errors.orderNumber.message}</p>}
        </div>

        {/* ── NEW FIELD: Special Instructions ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">Special Instructions / Notes</label>
          <textarea
            {...register('notes')}
            placeholder="e.g., Rush order for Client X, use Batch #44 first..."
            className="input w-full min-h-[80px] resize-y"
          />
        </div>
        {/* ─────────────────────────────────── */}

        {/* Inputs — Raw Materials */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700">Raw Material Inputs</h3>
              <p className="text-xs text-gray-400 mt-0.5">What gets consumed during production</p>
            </div>
            <button
              type="button"
              onClick={() => appendInput({ itemId: '', quantityRequired: '' })}
              className="btn-secondary text-xs"
            >
              + Add Material
            </button>
          </div>

          <div className="space-y-3">
            {inputFields.map((field, index) => (
              <ItemRow
                key={field.id}
                register={register}
                errors={errors}
                index={index}
                remove={removeInput}
                items={rawMaterials}
                qtyField="quantityRequired"
                itemLabel="inputs"
              />
            ))}
          </div>
          {errors.inputs?.root && <p className="err mt-2">{errors.inputs.root.message}</p>}
          {typeof errors.inputs?.message === 'string' && (
            <p className="err mt-2">{errors.inputs.message}</p>
          )}
        </div>

        {/* Outputs — Finished Goods */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700">Finished Good Outputs</h3>
              <p className="text-xs text-gray-400 mt-0.5">What gets produced and added to stock</p>
            </div>
            <button
              type="button"
              onClick={() => appendOutput({ itemId: '', quantityProduced: '' })}
              className="btn-secondary text-xs"
            >
              + Add Output
            </button>
          </div>

          <div className="space-y-3">
            {outputFields.map((field, index) => (
              <ItemRow
                key={field.id}
                register={register}
                errors={errors}
                index={index}
                remove={removeOutput}
                items={finishedGoods}
                qtyField="quantityProduced"
                itemLabel="outputs"
              />
            ))}
          </div>
          {typeof errors.outputs?.message === 'string' && (
            <p className="err mt-2">{errors.outputs.message}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Creating Order...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewOrder;