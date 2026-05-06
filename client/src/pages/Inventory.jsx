import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import BarcodeScanner from '../components/BarcodeScanner'; // ✅ Imported Scanner

export default function Inventory() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((state) => state.getRole());
  
  const canReceive = ['admin', 'manager', 'procurement_manager'].includes(userRole);
  const canTransfer = ['admin', 'manager', 'dispatch_manager'].includes(userRole);
  const canCreateItem = ['admin', 'manager', 'procurement_manager'].includes(userRole);
  const canIssue = ['admin', 'manager', 'dispatch_manager', 'shop_worker'].includes(userRole);
  
  const [selectedItemForStock, setSelectedItemForStock] = useState(null);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState(null);
  const [selectedItemForIssue, setSelectedItemForIssue] = useState(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  
  // ✅ Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);

  const [addStockForm, setAddStockForm] = useState({ locationId: '', quantityToAdd: '', unit: '', batchNumber: '', expiryDate: '' });
  const [transferForm, setTransferForm] = useState({ sourceLocationId: '', destinationLocationId: '', quantity: '', unit: '' });
  const [issueForm, setIssueForm] = useState({ locationId: '', quantityToIssue: '', unit: '' });
  
  const [addItemForm, setAddItemForm] = useState({
    sku: '', name: '', productCompanyName: '', type: 'raw_material', categoryId: '', 
    costPerUnit: '', shelfLife: '', dimensions: '', 
    alertOrange: '', alertRed: '', alertCritical: '',
    supplierName: '', supplierContact: '',
    baseUnit: '', secUnitName: '', secUnitMultiplier: ''
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await axios.get('/api/inventory');
      return data.data; 
    },
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await axios.get('/api/locations');
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await axios.get('/api/system/categories');
      return data.data;
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data } = await axios.get('/api/system/units');
      return data.data;
    },
  });

  // --- Scanner Handler ---
  const handleScanSuccess = (decodedSku) => {
    setIsScannerOpen(false); // Close camera
    const foundItem = items.find(item => item.sku.toLowerCase() === decodedSku.toLowerCase());
    
    if (foundItem) {
      setScannedItem(foundItem); // Open quick-action modal
    } else {
      alert(`SKU not found in system: ${decodedSku}`);
    }
  };

  const addItemMutation = useMutation({
    mutationFn: async (payload) => axios.post('/api/inventory', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsAddItemModalOpen(false);
      setAddItemForm({
        sku: '', name: '', productCompanyName: '', type: 'raw_material', categoryId: '', 
        costPerUnit: '', shelfLife: '', dimensions: '', 
        alertOrange: '', alertRed: '', alertCritical: '',
        supplierName: '', supplierContact: '',
        baseUnit: '', secUnitName: '', secUnitMultiplier: ''
      });
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to add new product.")
  });

  const addStockMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/${id}/stock`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedItemForStock(null);
      setAddStockForm({ locationId: '', quantityToAdd: '', unit: '', batchNumber: '', expiryDate: '' });
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to receive stock.")
  });

  const transferStockMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/${id}/transfer`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedItemForTransfer(null);
      setTransferForm({ sourceLocationId: '', destinationLocationId: '', quantity: '', unit: '' });
    },
    onError: (error) => alert(error.response?.data?.message || "Transfer failed")
  });

  const issueStockMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/${id}/issue`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedItemForIssue(null);
      setIssueForm({ locationId: '', quantityToIssue: '', unit: '' });
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to issue stock.")
  });

  const handleExportItems = async () => {
    try {
      const response = await axios.get('/api/inventory/export/items', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_catalog_valuation.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to export items.");
      console.error(error);
    }
  };

  const handleAddItemSubmit = (e) => {
    e.preventDefault();
    const payload = { 
      sku: addItemForm.sku,
      name: addItemForm.name,
      productCompanyName: addItemForm.productCompanyName,
      type: addItemForm.type,
      categoryId: addItemForm.categoryId || null,
      costPerUnit: Number(addItemForm.costPerUnit) || 0,
      shelfLife: addItemForm.shelfLife,
      dimensions: addItemForm.dimensions,
      alertLevels: {
        orange: Number(addItemForm.alertOrange),
        red: Number(addItemForm.alertRed),
        critical: Number(addItemForm.alertCritical)
      },
      supplier: {
        name: addItemForm.supplierName,
        contactInfo: addItemForm.supplierContact
      },
      baseUnit: addItemForm.baseUnit,
      secondaryUnits: []
    };
    
    if (addItemForm.secUnitName && addItemForm.secUnitMultiplier) {
      payload.secondaryUnits.push({
        name: addItemForm.secUnitName,
        multiplierToBase: Number(addItemForm.secUnitMultiplier)
      });
    }
    addItemMutation.mutate(payload);
  };

  const handleAddStockSubmit = (e) => {
    e.preventDefault();
    if (!addStockForm.locationId || !addStockForm.quantityToAdd) return;
    const payload = { ...addStockForm, quantityToAdd: Number(addStockForm.quantityToAdd) };
    if (!payload.batchNumber) delete payload.batchNumber;
    if (!payload.expiryDate) delete payload.expiryDate;
    addStockMutation.mutate({ id: selectedItemForStock._id, payload });
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferForm.sourceLocationId || !transferForm.destinationLocationId || !transferForm.quantity) return;
    transferStockMutation.mutate({ 
      id: selectedItemForTransfer._id, 
      payload: { ...transferForm, quantity: Number(transferForm.quantity) } 
    });
  };

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    if (!issueForm.locationId || !issueForm.quantityToIssue) return;
    issueStockMutation.mutate({ 
      id: selectedItemForIssue._id, 
      payload: { ...issueForm, quantityToIssue: Number(issueForm.quantityToIssue) } 
    });
  };

  const renderUnitOptions = (item) => {
    const options = [<option key="base" value={item.baseUnit}>{item.baseUnit} (Base)</option>];
    if (item.secondaryUnits) {
      item.secondaryUnits.forEach(u => {
        options.push(<option key={u.name} value={u.name}>{u.name}</option>);
      });
    }
    return options;
  };

  if (itemsLoading) return <div className="p-4 text-gray-600">Loading Inventory...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* --- HEADER & ACTIONS --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Global Inventory Overview</h1>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setIsScannerOpen(true)} 
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium shadow-sm flex items-center gap-2 transition-colors"
          >
            <span className="text-lg">📷</span> Scan SKU
          </button>
          
          {canCreateItem && (
            <button onClick={handleExportItems} className="bg-gray-100 text-gray-800 border border-gray-300 px-4 py-2 rounded hover:bg-gray-200 font-medium shadow-sm transition-colors">
              📥 Export
            </button>
          )}
          {canCreateItem && (
            <button onClick={() => setIsAddItemModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium shadow-sm transition-colors">
              + New Product
            </button>
          )}
        </div>
      </div>

      {/* --- INVENTORY LIST --- */}
      <div className="grid grid-cols-1 gap-6">
        {items?.map((item) => (
          <div key={item._id} className="bg-white p-6 rounded shadow border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {item.name} <span className="text-sm font-normal text-gray-500">({item.sku})</span>
                </h2>
                {item.productCompanyName && (
                   <p className="text-sm text-gray-600 mt-1">Brand/Mfg: <span className="font-medium">{item.productCompanyName}</span></p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded capitalize">
                    {item.type.replace('_', ' ')}
                  </span>
                  {item.categoryId && item.categoryId.name && (
                     <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                       {item.categoryId.name}
                     </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Total Global Stock</p>
                
                {(() => {
                  let textColor = 'text-green-600';
                  if (item.currentStock <= (item.alertLevels?.critical || 0)) textColor = 'text-red-800 font-black';
                  else if (item.currentStock <= (item.alertLevels?.red || 0)) textColor = 'text-red-600';
                  else if (item.currentStock <= (item.alertLevels?.orange || 0)) textColor = 'text-orange-500';

                  return (
                    <p className={`text-2xl font-bold ${textColor}`}>
                      {item.currentStock} {item.baseUnit}
                    </p>
                  );
                })()}
              </div>
            </div>

            <div className="mt-4 bg-gray-50 p-4 rounded border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Stock by Location & Batch:</h3>
              {item.balances?.length > 0 ? (
                <ul className="space-y-2">
                  {item.balances.map((balance) => (
                    <li key={balance._id} className="flex justify-between items-center text-sm bg-white p-3 rounded border border-gray-200 shadow-sm">
                      <div>
                        <span className="text-gray-800 font-bold">{balance.locationId?.name || 'Unknown'}</span>
                        {balance.batchNumber && balance.batchNumber !== 'DEFAULT-BATCH' && (
                          <div className="flex gap-2 mt-1.5">
                            <span className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-gray-200">
                              Lot: {balance.batchNumber}
                            </span>
                            {balance.expiryDate && (
                              <span className="bg-red-50 text-red-600 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-red-100">
                                Exp: {new Date(balance.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-gray-800 text-lg">{balance.quantity} <span className="text-sm font-normal text-gray-500">{item.baseUnit}</span></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No stock found in any location.</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {canReceive && (
                <button onClick={() => {setSelectedItemForStock(item); setAddStockForm({...addStockForm, unit: item.baseUnit, batchNumber: '', expiryDate: ''});}} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded text-sm font-medium transition-colors">
                  + Receive Stock
                </button>
              )}
              {canIssue && item.balances?.length > 0 && (
                <button onClick={() => {setSelectedItemForIssue(item); setIssueForm({...issueForm, unit: item.baseUnit});}} className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded text-sm font-medium transition-colors border border-red-200">
                  - Issue Stock
                </button>
              )}
              {canTransfer && item.balances?.length > 0 && (
                <button onClick={() => {setSelectedItemForTransfer(item); setTransferForm({...transferForm, unit: item.baseUnit});}} className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded text-sm font-medium transition-colors border border-blue-200">
                  ⇄ Transfer Stock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- SCANNED ITEM QUICK-ACTION MODAL --- */}
      {scannedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full border-t-4 border-indigo-600">
            <div className="text-center mb-6">
              <span className="text-4xl inline-block mb-2">📦</span>
              <h2 className="text-2xl font-bold text-gray-800">{scannedItem.name}</h2>
              <p className="text-sm font-mono text-gray-500 mt-1">{scannedItem.sku}</p>
            </div>
            
            <p className="text-center text-sm text-gray-600 mb-6 border-b pb-6">
              Current Global Stock: <strong className="text-gray-800">{scannedItem.currentStock} {scannedItem.baseUnit}</strong>
            </p>

            <div className="flex flex-col gap-3">
              {canReceive && (
                <button 
                  onClick={() => {
                    setScannedItem(null);
                    setSelectedItemForStock(scannedItem);
                    setAddStockForm({...addStockForm, unit: scannedItem.baseUnit, batchNumber: '', expiryDate: ''});
                  }} 
                  className="bg-gray-100 text-gray-800 font-bold py-3 rounded hover:bg-gray-200"
                >
                  + Receive Stock
                </button>
              )}
              {canIssue && scannedItem.balances?.length > 0 && (
                <button 
                  onClick={() => {
                    setScannedItem(null);
                    setSelectedItemForIssue(scannedItem);
                    setIssueForm({...issueForm, unit: scannedItem.baseUnit});
                  }} 
                  className="bg-red-50 text-red-700 font-bold py-3 rounded hover:bg-red-100 border border-red-200"
                >
                  - Issue Stock
                </button>
              )}
              {canTransfer && scannedItem.balances?.length > 0 && (
                <button 
                  onClick={() => {
                    setScannedItem(null);
                    setSelectedItemForTransfer(scannedItem);
                    setTransferForm({...transferForm, unit: scannedItem.baseUnit});
                  }} 
                  className="bg-blue-50 text-blue-700 font-bold py-3 rounded hover:bg-blue-100 border border-blue-200"
                >
                  ⇄ Transfer Stock
                </button>
              )}
            </div>
            <button onClick={() => setScannedItem(null)} className="mt-6 w-full text-center text-gray-500 hover:text-gray-800 font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- ADD NEW PRODUCT MODAL --- */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto border-t-4 border-green-600">
            <h2 className="text-xl font-bold mb-4">Add New Product to Catalog</h2>
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
                  <label className="block text-sm font-medium mb-1">Product Company (Brand)</label>
                  <input type="text" placeholder="e.g. Acme Corp" className="w-full border border-gray-300 rounded p-2" value={addItemForm.productCompanyName} onChange={(e) => setAddItemForm({ ...addItemForm, productCompanyName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Per Unit</label>
                  <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded p-2" value={addItemForm.costPerUnit} onChange={(e) => setAddItemForm({ ...addItemForm, costPerUnit: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shelf Life</label>
                  <input type="text" placeholder="e.g. 12 months" className="w-full border border-gray-300 rounded p-2" value={addItemForm.shelfLife} onChange={(e) => setAddItemForm({ ...addItemForm, shelfLife: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select className="w-full border border-gray-300 rounded p-2" value={addItemForm.type} onChange={(e) => setAddItemForm({ ...addItemForm, type: e.target.value })} required>
                    <option value="raw_material">Raw Material</option>
                    <option value="finished_good">Finished Good</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select className="w-full border border-gray-300 rounded p-2" value={addItemForm.categoryId} onChange={(e) => setAddItemForm({ ...addItemForm, categoryId: e.target.value })}>
                    <option value="">-- No Category --</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.parentId ? `↳ ${c.name}` : c.name} 
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dimensions</label>
                  <input type="text" placeholder="e.g. 10x10x5 cm" className="w-full border border-gray-300 rounded p-2" value={addItemForm.dimensions} onChange={(e) => setAddItemForm({ ...addItemForm, dimensions: e.target.value })} />
                </div>
              </div>

              <div className="bg-orange-50 p-3 rounded border border-orange-200 mb-4">
                <h4 className="text-sm font-bold text-orange-800 mb-2">Stock Alert Thresholds (Base Units)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-orange-700">Orange Alert (Warning)</label>
                    <input type="number" min="0" className="w-full border border-gray-300 rounded p-2" value={addItemForm.alertOrange} onChange={(e) => setAddItemForm({ ...addItemForm, alertOrange: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-red-600">Red Alert (Action Req)</label>
                    <input type="number" min="0" className="w-full border border-gray-300 rounded p-2" value={addItemForm.alertRed} onChange={(e) => setAddItemForm({ ...addItemForm, alertRed: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-red-800">Critical Alert (Outage)</label>
                    <input type="number" min="0" className="w-full border border-gray-300 rounded p-2" value={addItemForm.alertCritical} onChange={(e) => setAddItemForm({ ...addItemForm, alertCritical: e.target.value })} required />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
                <h4 className="text-sm font-bold text-blue-800 mb-2">Supplier Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Supplier Name</label>
                    <input type="text" className="w-full border border-gray-300 rounded p-2" value={addItemForm.supplierName} onChange={(e) => setAddItemForm({ ...addItemForm, supplierName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Supplier Contact Info</label>
                    <input type="text" placeholder="Email, Phone, etc." className="w-full border border-gray-300 rounded p-2" value={addItemForm.supplierContact} onChange={(e) => setAddItemForm({ ...addItemForm, supplierContact: e.target.value })} />
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
                <button type="submit" disabled={addItemMutation.isLoading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Create Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD STOCK MODAL --- */}
      {selectedItemForStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border-t-4 border-gray-800">
            <h2 className="text-xl font-bold mb-4">Receive Stock: {selectedItemForStock.name}</h2>
            <form onSubmit={handleAddStockSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Destination Location</label>
                <select className="w-full border border-gray-300 rounded p-2" value={addStockForm.locationId} onChange={(e) => setAddStockForm({ ...addStockForm, locationId: e.target.value })} required>
                  <option value="">-- Select a Location --</option>
                  {locations?.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Batch / Lot No.</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2" placeholder="Optional" value={addStockForm.batchNumber} onChange={(e) => setAddStockForm({ ...addStockForm, batchNumber: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Expiry Date</label>
                  <input type="date" className="w-full border border-gray-300 rounded p-2" value={addStockForm.expiryDate} onChange={(e) => setAddStockForm({ ...addStockForm, expiryDate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded p-2" value={addStockForm.quantityToAdd} onChange={(e) => setAddStockForm({ ...addStockForm, quantityToAdd: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select className="w-full border border-gray-300 rounded p-2" value={addStockForm.unit} onChange={(e) => setAddStockForm({ ...addStockForm, unit: e.target.value })} required>
                    {renderUnitOptions(selectedItemForStock)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setSelectedItemForStock(null); setAddStockForm({ locationId: '', quantityToAdd: '', unit: '', batchNumber: '', expiryDate: '' }); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={addStockMutation.isLoading} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">Confirm Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ISSUE STOCK MODAL --- */}
      {selectedItemForIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border-t-4 border-red-600">
            <h2 className="text-xl font-bold mb-4">Issue Stock: {selectedItemForIssue.name}</h2>
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded mb-4 border border-red-200">
              <span className="font-bold uppercase tracking-wider">Note:</span> Stock will be automatically deducted using FIFO.
            </div>
            <form onSubmit={handleIssueSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Source Location</label>
                <select className="w-full border border-gray-300 rounded p-2" value={issueForm.locationId} onChange={(e) => setIssueForm({ ...issueForm, locationId: e.target.value })} required>
                  <option value="">-- Select a Location --</option>
                  {selectedItemForIssue.balances.map(b => (
                    <option key={b._id} value={b.locationId._id}>
                      {b.locationId.name} {b.batchNumber !== 'DEFAULT-BATCH' ? `[Lot: ${b.batchNumber}] ` : ''}(Avail: {b.quantity} {selectedItemForIssue.baseUnit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded p-2" value={issueForm.quantityToIssue} onChange={(e) => setIssueForm({ ...issueForm, quantityToIssue: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select className="w-full border border-gray-300 rounded p-2" value={issueForm.unit} onChange={(e) => setIssueForm({ ...issueForm, unit: e.target.value })} required>
                    {renderUnitOptions(selectedItemForIssue)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedItemForIssue(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={issueStockMutation.isLoading} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Confirm Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- TRANSFER STOCK MODAL --- */}
      {selectedItemForTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl border-t-4 border-blue-600">
            <h2 className="text-xl font-bold mb-4">Transfer Stock: {selectedItemForTransfer.name}</h2>
            <form onSubmit={handleTransferSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">From (Source)</label>
                <select className="w-full border border-gray-300 rounded p-2" value={transferForm.sourceLocationId} onChange={(e) => setTransferForm({ ...transferForm, sourceLocationId: e.target.value })} required>
                  <option value="">-- Select Source --</option>
                  {selectedItemForTransfer.balances.map(b => (
                    <option key={b._id} value={b.locationId._id}>
                      {b.locationId.name} {b.batchNumber !== 'DEFAULT-BATCH' ? `[Lot: ${b.batchNumber}] ` : ''}(Avail: {b.quantity} {selectedItemForTransfer.baseUnit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Destination)</label>
                <select className="w-full border border-gray-300 rounded p-2" value={transferForm.destinationLocationId} onChange={(e) => setTransferForm({ ...transferForm, destinationLocationId: e.target.value })} required>
                  <option value="">-- Select Destination --</option>
                  {locations?.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" step="0.01" min="0.01" className="w-full border border-gray-300 rounded p-2" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select className="w-full border border-gray-300 rounded p-2" value={transferForm.unit} onChange={(e) => setTransferForm({ ...transferForm, unit: e.target.value })} required>
                     {renderUnitOptions(selectedItemForTransfer)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedItemForTransfer(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" disabled={transferStockMutation.isLoading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Confirm Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RENDER THE SCANNER COMPONENT --- */}
      {isScannerOpen && (
        <BarcodeScanner 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}
    </div>
  );
}