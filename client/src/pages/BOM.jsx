import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useAuthStore } from '../store/authStore';

export default function Bom() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((state) => state.getRole());
  const canManageBOM = ['admin', 'manager', 'production_manager'].includes(userRole);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBOMForAssembly, setSelectedBOMForAssembly] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    finishedGoodId: '',
    produceQuantity: 1,
    notes: '',
    rawMaterials: [{ itemId: '', quantityRequired: '', unit: 'Base' }]
  });

  const [assembleForm, setAssembleForm] = useState({
    locationId: '',
    productionRuns: 1,
    batchNumber: ''
  });

  // --- Queries ---
  const { data: boms = [], isLoading: bomsLoading } = useQuery({
    queryKey: ['boms'],
    queryFn: async () => {
      const { data } = await axios.get('/api/inventory/boms');
      return data.data;
    }
  });

  const { data: items = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await axios.get('/api/inventory');
      return data.data;
    }
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await axios.get('/api/locations');
      return data;
    }
  });

  // Filter items for dropdowns
  const finishedGoods = items.filter(i => i.type === 'finished_good');
  const rawMaterialsList = items; // Sometimes FGs are used to build other FGs!

  // --- Mutations ---
  const createBOMMutation = useMutation({
    mutationFn: async (payload) => axios.post('/api/inventory/boms', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      setIsCreateModalOpen(false);
      setCreateForm({ name: '', finishedGoodId: '', produceQuantity: 1, notes: '', rawMaterials: [{ itemId: '', quantityRequired: '', unit: 'Base' }] });
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to create BOM.")
  });

  const assembleBOMMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/boms/${id}/assemble`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); // Update global stock
      setSelectedBOMForAssembly(null);
      setAssembleForm({ locationId: '', productionRuns: 1, batchNumber: '' });
      alert("Assembly successful! Stock updated.");
    },
    onError: (error) => alert(error.response?.data?.message || "Assembly failed.")
  });

  // --- Handlers ---
  const handleAddRawMaterial = () => {
    setCreateForm({
      ...createForm,
      rawMaterials: [...createForm.rawMaterials, { itemId: '', quantityRequired: '', unit: 'Base' }]
    });
  };

  const handleRawMaterialChange = (index, field, value) => {
    const updatedMaterials = [...createForm.rawMaterials];
    updatedMaterials[index][field] = value;
    
    // Auto-fill unit if item is selected
    if (field === 'itemId') {
      const selectedItem = rawMaterialsList.find(i => i._id === value);
      if (selectedItem) updatedMaterials[index].unit = selectedItem.baseUnit;
    }
    
    setCreateForm({ ...createForm, rawMaterials: updatedMaterials });
  };

  const handleRemoveRawMaterial = (index) => {
    const updatedMaterials = createForm.rawMaterials.filter((_, i) => i !== index);
    setCreateForm({ ...createForm, rawMaterials: updatedMaterials });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createBOMMutation.mutate(createForm);
  };

  const handleAssembleSubmit = (e) => {
    e.preventDefault();
    assembleBOMMutation.mutate({ id: selectedBOMForAssembly._id, payload: assembleForm });
  };

  if (bomsLoading) return <div className="p-6 text-gray-500">Loading Manufacturing Data...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manufacturing & Kitting</h1>
          <p className="text-gray-500 text-sm mt-1">Manage Bills of Materials (BOM) and assemble products.</p>
        </div>
        {canManageBOM && (
          <button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium shadow-sm transition-colors"
          >
            + Create New Recipe (BOM)
          </button>
        )}
      </div>

      {/* BOM List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boms.length === 0 && (
          <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
            No Bills of Materials found. Create one to start manufacturing!
          </div>
        )}
        
        {boms.map(bom => (
          <div key={bom._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-indigo-50 p-4 border-b border-indigo-100">
              <h2 className="text-lg font-bold text-indigo-900">{bom.name}</h2>
              <p className="text-sm text-indigo-700 mt-1">
                Produces: <strong className="font-black">{bom.produceQuantity}x {bom.finishedGoodId?.name}</strong>
              </p>
            </div>
            
            <div className="p-4 flex-grow">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Required Raw Materials</h3>
              <ul className="space-y-2">
                {bom.rawMaterials.map((rm, idx) => (
                  <li key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                    <span className="font-medium text-gray-700">{rm.itemId?.name}</span>
                    <span className="font-bold text-gray-900">{rm.quantityRequired} <span className="text-xs text-gray-500 font-normal">{rm.unit}</span></span>
                  </li>
                ))}
              </ul>
              {bom.notes && <p className="text-xs text-gray-500 mt-4 italic">Note: {bom.notes}</p>}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={() => setSelectedBOMForAssembly(bom)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded transition-colors"
              >
                Assemble Production Run
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- CREATE BOM MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Create Production Recipe (BOM)</h2>
            <form onSubmit={handleCreateSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Recipe Name *</label>
                  <input required type="text" placeholder="e.g., Standard Desk Assembly" className="w-full border border-gray-300 rounded p-2" value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Finished Good Produced *</label>
                  <select required className="w-full border border-gray-300 rounded p-2" value={createForm.finishedGoodId} onChange={e => setCreateForm({...createForm, finishedGoodId: e.target.value})}>
                    <option value="">-- Select Finished Good --</option>
                    {finishedGoods.map(fg => <option key={fg._id} value={fg._id}>{fg.name} ({fg.sku})</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">Output Quantity per Run *</label>
                <input required type="number" min="1" className="w-full border border-gray-300 rounded p-2" value={createForm.produceQuantity} onChange={e => setCreateForm({...createForm, produceQuantity: Number(e.target.value)})} />
                <p className="text-xs text-gray-500 mt-1">How many finished goods are created by the materials listed below?</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">Raw Materials Required</h3>
                  <button type="button" onClick={handleAddRawMaterial} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded font-medium">+ Add Item</button>
                </div>
                
                {createForm.rawMaterials.map((rm, index) => (
                  <div key={index} className="flex gap-3 mb-3 items-start">
                    <div className="flex-grow">
                      <select required className="w-full border border-gray-300 rounded p-2 text-sm" value={rm.itemId} onChange={e => handleRawMaterialChange(index, 'itemId', e.target.value)}>
                        <option value="">-- Select Material --</option>
                        {rawMaterialsList.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
                      </select>
                    </div>
                    <div className="w-32">
                      <input required type="number" step="0.01" min="0.01" placeholder="Qty" className="w-full border border-gray-300 rounded p-2 text-sm" value={rm.quantityRequired} onChange={e => handleRawMaterialChange(index, 'quantityRequired', Number(e.target.value))} />
                    </div>
                    <div className="w-24">
                      <input readOnly type="text" className="w-full border border-gray-300 bg-gray-100 text-gray-500 rounded p-2 text-sm" value={rm.unit} />
                    </div>
                    {createForm.rawMaterials.length > 1 && (
                      <button type="button" onClick={() => handleRemoveRawMaterial(index)} className="text-red-500 hover:text-red-700 p-2 font-bold text-xl">&times;</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-bold">Cancel</button>
                <button type="submit" disabled={createBOMMutation.isLoading} className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded font-bold">Save Recipe</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ASSEMBLE MODAL --- */}
      {selectedBOMForAssembly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-t-4 border-indigo-600">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Assemble Product</h2>
            <p className="text-gray-600 mb-6 border-b pb-4">
              Running recipe: <strong className="text-indigo-700">{selectedBOMForAssembly.name}</strong>
            </p>

            <form onSubmit={handleAssembleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Assembly Location *</label>
                <select required className="w-full border border-gray-300 rounded p-2" value={assembleForm.locationId} onChange={e => setAssembleForm({...assembleForm, locationId: e.target.value})}>
                  <option value="">-- Where is this being built? --</option>
                  {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">Raw materials will be deducted from here, and finished goods will be added here.</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Production Runs *</label>
                <input required type="number" min="1" className="w-full border border-gray-300 rounded p-2" value={assembleForm.productionRuns} onChange={e => setAssembleForm({...assembleForm, productionRuns: Number(e.target.value)})} />
                <p className="text-xs font-bold text-indigo-600 mt-1">
                  This will produce: {assembleForm.productionRuns * selectedBOMForAssembly.produceQuantity} {selectedBOMForAssembly.finishedGoodId?.name}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">Output Batch / Lot Number (Optional)</label>
                <input type="text" placeholder="Auto-generated if left blank" className="w-full border border-gray-300 rounded p-2" value={assembleForm.batchNumber} onChange={e => setAssembleForm({...assembleForm, batchNumber: e.target.value})} />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setSelectedBOMForAssembly(null)} className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-bold">Cancel</button>
                <button type="submit" disabled={assembleBOMMutation.isLoading} className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded font-bold">
                  Confirm Assembly
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}