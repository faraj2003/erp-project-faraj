// client/src/pages/Inventory.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import BarcodeScanner from '../components/BarcodeScanner'; 
import TransactionLedger from '../components/TransactionLedger';
import { 
  Search, LayoutGrid, List as ListIcon, ScanBarcode, Download, Plus, 
  ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, X 
} from 'lucide-react';

export default function Inventory() {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((state) => state.getRole());
  
  const canReceive = ['admin', 'manager', 'procurement_manager', 'shop_manager'].includes(userRole);
  const canTransfer = ['admin', 'manager', 'dispatch_manager', 'shop_manager'].includes(userRole);
  const canCreateItem = ['admin', 'manager', 'procurement_manager'].includes(userRole);
  const canIssue = ['admin', 'manager', 'dispatch_manager', 'shop_worker', 'shop_manager'].includes(userRole);
  
  const [selectedItemForStock, setSelectedItemForStock] = useState(null);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState(null);
  const [selectedItemForIssue, setSelectedItemForIssue] = useState(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);

  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [addStockForm, setAddStockForm] = useState({ locationId: '', quantityToAdd: '', unit: '', batchNumber: '', expiryDate: '' });
  const [transferForm, setTransferForm] = useState({ sourceLocationId: '', destinationLocationId: '', quantity: '', unit: '' });
  const [issueForm, setIssueForm] = useState({ locationId: '', quantityToIssue: '', unit: '' });
  
  const [addItemForm, setAddItemForm] = useState({
    sku: '', name: '', productCompanyName: '', typeId: '', categoryId: '', 
    costPerUnit: '', shelfLife: '', 
    dimLength: '', dimBreadth: '', dimHeight: '', 
    alertOrange: '', alertRed: '', alertCritical: '',
    suppliers: [{ supplierId: '', contact: '', baseRate: '' }], 
    baseUnit: '', secUnitName: '', secUnitMultiplier: ''
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await axios.get('/api/inventory');
      return data.data; 
    },
  });

  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: async () => (await axios.get('/api/locations')).data });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: async () => (await axios.get('/api/system/categories')).data.data });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: async () => (await axios.get('/api/system/units')).data.data });
  const { data: itemTypes = [] } = useQuery({ queryKey: ['itemTypes'], queryFn: async () => (await axios.get('/api/system/types')).data.data });

  // Mutations (Logic identical to previous version)
  const createTypeMutation = useMutation({
    mutationFn: async (name) => axios.post('/api/system/types', { name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['itemTypes'] });
      setAddItemForm({ ...addItemForm, typeId: res.data.data._id });
      setIsAddingNewType(false);
      setNewTypeName('');
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to create type.")
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name) => axios.post('/api/system/categories', { name, parentId: null }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setAddItemForm({ ...addItemForm, categoryId: res.data.data._id });
      setIsAddingNewCategory(false);
      setNewCategoryName('');
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to create category.")
  });

  const handleScanSuccess = (decodedSku) => {
    setIsScannerOpen(false); 
    const foundItem = items.find(item => item.sku.toLowerCase() === decodedSku.toLowerCase());
    if (foundItem) setScannedItem(foundItem); 
    else alert(`SKU not found in system: ${decodedSku}`);
  };

  const addItemMutation = useMutation({
    mutationFn: async (payload) => axios.post('/api/inventory', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsAddItemModalOpen(false);
      setAddItemForm({
        sku: '', name: '', productCompanyName: '', typeId: '', categoryId: '', 
        costPerUnit: '', shelfLife: '', dimLength: '', dimBreadth: '', dimHeight: '',
        alertOrange: '', alertRed: '', alertCritical: '',
        suppliers: [{ supplierId: '', contact: '', baseRate: '' }],
        baseUnit: '', secUnitName: '', secUnitMultiplier: ''
      });
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to add new product.")
  });

  const addStockMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/${id}/stock`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'transactions'] });
      setSelectedItemForStock(null);
      setAddStockForm({ locationId: '', quantityToAdd: '', unit: '', batchNumber: '', expiryDate: '' });
    },
    onError: (error) => alert(error.response?.data?.message || "Failed to receive stock.")
  });

  const transferStockMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/${id}/transfer`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'transactions'] });
      setSelectedItemForTransfer(null);
      setTransferForm({ sourceLocationId: '', destinationLocationId: '', quantity: '', unit: '' });
    },
    onError: (error) => alert(error.response?.data?.message || "Transfer failed")
  });

  const issueStockMutation = useMutation({
    mutationFn: async ({ id, payload }) => axios.post(`/api/inventory/${id}/issue`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'transactions'] });
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
      link.href = url; link.setAttribute('download', 'inventory_catalog.csv');
      document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) { alert("Failed to export items."); }
  };

  const handleSupplierChange = (index, field, value) => {
    const updatedSuppliers = [...addItemForm.suppliers];
    updatedSuppliers[index][field] = value;
    setAddItemForm({ ...addItemForm, suppliers: updatedSuppliers });
  };

  const handleAddItemSubmit = (e) => {
    e.preventDefault();
    const payload = { 
      sku: addItemForm.sku, name: addItemForm.name, productCompanyName: addItemForm.productCompanyName,
      type: addItemForm.typeId, categoryId: addItemForm.categoryId || null, costPerUnit: Number(addItemForm.costPerUnit) || 0,
      shelfLife: addItemForm.shelfLife,
      dimensions: { length: Number(addItemForm.dimLength) || 0, breadth: Number(addItemForm.dimBreadth) || 0, height: Number(addItemForm.dimHeight) || 0 },
      alertLevels: { orange: Number(addItemForm.alertOrange), red: Number(addItemForm.alertRed), critical: Number(addItemForm.alertCritical) },
      baseUnit: addItemForm.baseUnit, secondaryUnits: [], suppliers: []
    };
    if (addItemForm.secUnitName && addItemForm.secUnitMultiplier) payload.secondaryUnits.push({ name: addItemForm.secUnitName, multiplierToBase: Number(addItemForm.secUnitMultiplier) });
    payload.suppliers = addItemForm.suppliers.filter(s => s.supplierId && s.baseRate).map(s => ({
      supplierId: s.supplierId, baseRate: Number(s.baseRate), history: [{ rate: Number(s.baseRate), date: new Date() }]
    }));
    addItemMutation.mutate(payload);
  };

  const filteredItems = items?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderUnitOptions = (item) => {
    const options = [<option key="base" value={item.baseUnit}>{item.baseUnit} (Base)</option>];
    if (item.secondaryUnits) item.secondaryUnits.forEach(u => options.push(<option key={u.name} value={u.name}>{u.name}</option>));
    return options;
  };

  if (itemsLoading) return <div className="p-10 text-center font-medium text-gray-400 animate-pulse">Loading Inventory...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-12">
      {/* ── HEADER & TOOLBAR ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Global Inventory</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage stock, catalogs, and locations</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Search name or SKU..." 
              className="input pl-9"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-gray-100/80 p-1 rounded-lg border border-gray-200/60 shadow-inner">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><ListIcon size={18} /></button>
          </div>

          <button onClick={() => setIsScannerOpen(true)} className="btn-secondary flex items-center gap-2">
            <ScanBarcode size={18} /> Scan
          </button>
          
          {canCreateItem && (
            <>
              <button onClick={handleExportItems} className="btn-secondary flex items-center gap-2">
                <Download size={18} /> Export
              </button>
              <button onClick={() => setIsAddItemModalOpen(true)} className="btn-primary flex items-center gap-2 shadow-blue-500/30">
                <Plus size={18} /> Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── INVENTORY GRID ── */}
      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex flex-col gap-4"}>
        {filteredItems?.map((item) => {
          let stockColor = 'text-emerald-600';
          if (item.currentStock <= (item.alertLevels?.critical || 0)) stockColor = 'text-red-600 font-black';
          else if (item.currentStock <= (item.alertLevels?.red || 0)) stockColor = 'text-rose-600';
          else if (item.currentStock <= (item.alertLevels?.orange || 0)) stockColor = 'text-amber-500';

          return (
            <div key={item._id} className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    {item.name} <span className="text-xs font-mono font-bold text-gray-400 ml-2 uppercase bg-gray-100 px-2 py-1 rounded">{item.sku}</span>
                  </h2>
                  {item.productCompanyName && <p className="text-xs text-gray-500 mt-1.5 uppercase tracking-widest font-bold">{item.productCompanyName}</p>}
                  
                  <div className="flex items-center gap-2 mt-3">
                    <span className="inline-block bg-blue-50/50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {item.type?.name || item.type?.replace('_', ' ') || "Standard"}
                    </span>
                    {item.categoryId?.name && (
                      <span className="inline-block bg-purple-50/50 border border-purple-100 text-purple-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {item.categoryId.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Stock</p>
                  <p className={`text-2xl font-black tracking-tight ${stockColor}`}>
                    {item.currentStock} <span className="text-xs font-bold text-gray-500 uppercase ml-0.5">{item.baseUnit}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Stock by Location</h3>
                {item.balances?.length > 0 ? (
                  <ul className="space-y-2">
                    {item.balances.map((balance) => (
                      <li key={balance._id} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-gray-200/60 shadow-sm">
                        <div>
                          <span className="text-gray-800 font-bold">{balance.locationId?.name || 'Unknown'}</span>
                          {balance.batchNumber && balance.batchNumber !== 'DEFAULT-BATCH' && (
                            <div className="flex gap-2 mt-1.5">
                              <span className="text-[9px] uppercase font-bold tracking-wider text-gray-500">Lot: {balance.batchNumber}</span>
                              {balance.expiryDate && <span className="text-[9px] uppercase font-bold tracking-wider text-red-500">Exp: {new Date(balance.expiryDate).toLocaleDateString()}</span>}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-gray-800 text-base">{balance.quantity} <span className="text-[10px] text-gray-400 uppercase">{item.baseUnit}</span></span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs font-medium text-gray-400 italic">No stock found in permitted locations.</p>}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {canReceive && (
                  <button onClick={() => {setSelectedItemForStock(item); setAddStockForm({...addStockForm, unit: item.baseUnit});}} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5">
                    <ArrowDownToLine size={14} /> Receive
                  </button>
                )}
                {canIssue && item.balances?.length > 0 && (
                  <button onClick={() => {setSelectedItemForIssue(item); setIssueForm({...issueForm, unit: item.baseUnit});}} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5">
                    <ArrowUpFromLine size={14} /> Issue
                  </button>
                )}
                {canTransfer && item.balances?.length > 0 && (
                  <button onClick={() => {setSelectedItemForTransfer(item); setTransferForm({...transferForm, unit: item.baseUnit});}} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5">
                    <ArrowRightLeft size={14} /> Transfer
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredItems?.length === 0 && <div className="text-center py-16 text-gray-400 font-medium w-full col-span-2">No items found matching your search.</div>}
      </div>

      <div className="mt-12">
        <TransactionLedger />
      </div>

      {/* ── TRANSACTION MODALS ── */}
      {selectedItemForStock && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Receive Stock</h2>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">{selectedItemForStock.name}</p>
              </div>
              <button onClick={() => setSelectedItemForStock(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addStockMutation.mutate({ id: selectedItemForStock._id, payload: { ...addStockForm, quantityToAdd: Number(addStockForm.quantityToAdd) } }); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Destination</label>
                  <select className="input" value={addStockForm.locationId} onChange={(e) => setAddStockForm({ ...addStockForm, locationId: e.target.value })} required>
                    <option value="">Select a Location</option>
                    {locations?.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Batch / Lot</label>
                    <input type="text" className="input" placeholder="Optional" value={addStockForm.batchNumber} onChange={(e) => setAddStockForm({ ...addStockForm, batchNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Expiry</label>
                    <input type="date" className="input" value={addStockForm.expiryDate} onChange={(e) => setAddStockForm({ ...addStockForm, expiryDate: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Quantity</label>
                    <input type="number" step="0.01" min="0.01" className="input font-mono font-bold" value={addStockForm.quantityToAdd} onChange={(e) => setAddStockForm({ ...addStockForm, quantityToAdd: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Unit</label>
                    <select className="input font-bold" value={addStockForm.unit} onChange={(e) => setAddStockForm({ ...addStockForm, unit: e.target.value })} required>
                      {renderUnitOptions(selectedItemForStock)}
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={addStockMutation.isLoading} className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 border-0">Confirm Receipt</button>
            </form>
          </div>
        </div>
      )}

      {selectedItemForIssue && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all">
             <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Issue Stock</h2>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mt-1">{selectedItemForIssue.name}</p>
              </div>
              <button onClick={() => setSelectedItemForIssue(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); issueStockMutation.mutate({ id: selectedItemForIssue._id, payload: { ...issueForm, quantityToIssue: Number(issueForm.quantityToIssue) } }); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Source Location</label>
                  <select className="input" value={issueForm.locationId} onChange={(e) => setIssueForm({ ...issueForm, locationId: e.target.value })} required>
                    <option value="">Select Source Location</option>
                    {selectedItemForIssue.balances.map(b => (
                      <option key={b._id} value={b.locationId._id}>
                        {b.locationId.name} {b.batchNumber !== 'DEFAULT-BATCH' ? `[Lot: ${b.batchNumber}] ` : ''}(Avail: {b.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Quantity</label>
                    <input type="number" step="0.01" min="0.01" className="input font-mono font-bold" value={issueForm.quantityToIssue} onChange={(e) => setIssueForm({ ...issueForm, quantityToIssue: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Unit</label>
                    <select className="input font-bold" value={issueForm.unit} onChange={(e) => setIssueForm({ ...issueForm, unit: e.target.value })} required>
                      {renderUnitOptions(selectedItemForIssue)}
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={issueStockMutation.isLoading} className="btn-primary w-full bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 border-0">Confirm Issue</button>
            </form>
          </div>
        </div>
      )}

      {selectedItemForTransfer && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all">
             <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Transfer Stock</h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{selectedItemForTransfer.name}</p>
              </div>
              <button onClick={() => setSelectedItemForTransfer(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); transferStockMutation.mutate({ id: selectedItemForTransfer._id, payload: { ...transferForm, quantity: Number(transferForm.quantity) } }); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">From Location</label>
                  <select className="input" value={transferForm.sourceLocationId} onChange={(e) => setTransferForm({ ...transferForm, sourceLocationId: e.target.value })} required>
                    <option value="">Select Source Location</option>
                    {selectedItemForTransfer.balances.map(b => (
                      <option key={b._id} value={b.locationId._id}>
                        {b.locationId.name} {b.batchNumber !== 'DEFAULT-BATCH' ? `[Lot: ${b.batchNumber}] ` : ''}(Avail: {b.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">To Location</label>
                  <select className="input" value={transferForm.destinationLocationId} onChange={(e) => setTransferForm({ ...transferForm, destinationLocationId: e.target.value })} required>
                    <option value="">Select Destination Location</option>
                    {locations?.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Quantity</label>
                    <input type="number" step="0.01" min="0.01" className="input font-mono font-bold" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Unit</label>
                    <select className="input font-bold" value={transferForm.unit} onChange={(e) => setTransferForm({ ...transferForm, unit: e.target.value })} required>
                       {renderUnitOptions(selectedItemForTransfer)}
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={transferStockMutation.isLoading} className="btn-primary w-full bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 border-0">Confirm Transfer</button>
            </form>
          </div>
        </div>
      )}
      
      {/* ── ADD NEW PRODUCT MODAL ── */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-11/12 max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Add Product to Catalog</h2>
              <button onClick={() => setIsAddItemModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-2"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddItemSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Product Name *</label>
                  <input type="text" className="input" value={addItemForm.name} onChange={(e) => setAddItemForm({ ...addItemForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">SKU *</label>
                  <input type="text" className="input font-mono uppercase" value={addItemForm.sku} onChange={(e) => setAddItemForm({ ...addItemForm, sku: e.target.value.toUpperCase() })} required />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex justify-between">Type * <span onClick={() => setIsAddingNewType(!isAddingNewType)} className="text-blue-500 cursor-pointer">{isAddingNewType ? "Cancel" : "+ New"}</span></label>
                   {isAddingNewType ? (
                    <div className="flex gap-2">
                      <input type="text" className="input" placeholder="New Type" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
                      <button type="button" onClick={() => newTypeName.trim() && createTypeMutation.mutate(newTypeName)} className="btn-primary py-1 px-3">Add</button>
                    </div>
                  ) : (
                    <select className="input cursor-pointer" value={addItemForm.typeId} onChange={(e) => setAddItemForm({ ...addItemForm, typeId: e.target.value })} required>
                      <option value="">-- Select Type --</option>
                      {itemTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  )}
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex justify-between">Category <span onClick={() => setIsAddingNewCategory(!isAddingNewCategory)} className="text-blue-500 cursor-pointer">{isAddingNewCategory ? "Cancel" : "+ New"}</span></label>
                   {isAddingNewCategory ? (
                    <div className="flex gap-2">
                      <input type="text" className="input" placeholder="New Cat" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                      <button type="button" onClick={() => newCategoryName.trim() && createCategoryMutation.mutate(newCategoryName)} className="btn-primary py-1 px-3">Add</button>
                    </div>
                  ) : (
                    <select className="input cursor-pointer" value={addItemForm.categoryId} onChange={(e) => setAddItemForm({ ...addItemForm, categoryId: e.target.value })}>
                      <option value="">-- No Category --</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.parentId ? `↳ ${c.name}` : c.name}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Brand / Mfg</label>
                  <input type="text" className="input" value={addItemForm.productCompanyName} onChange={(e) => setAddItemForm({ ...addItemForm, productCompanyName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Standard Cost/Unit</label>
                  <input type="number" min="0" step="0.01" className="input font-mono" value={addItemForm.costPerUnit} onChange={(e) => setAddItemForm({ ...addItemForm, costPerUnit: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Base Unit *</label>
                  <select className="input cursor-pointer" value={addItemForm.baseUnit} onChange={(e) => setAddItemForm({ ...addItemForm, baseUnit: e.target.value })} required>
                    <option value="">Select Base Unit</option>
                    {units.map(u => <option key={u._id} value={u.name}>{u.name} ({u.abbreviation})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Shelf Life</label>
                  <input type="text" placeholder="e.g. 12 months" className="input" value={addItemForm.shelfLife} onChange={(e) => setAddItemForm({ ...addItemForm, shelfLife: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-200/60">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200/60 pb-2">Dimensions (Meters)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Length</label>
                      <input type="number" step="0.01" min="0" className="input" value={addItemForm.dimLength} onChange={(e) => setAddItemForm({ ...addItemForm, dimLength: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Breadth / Width</label>
                      <input type="number" step="0.01" min="0" className="input" value={addItemForm.dimBreadth} onChange={(e) => setAddItemForm({ ...addItemForm, dimBreadth: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Height</label>
                      <input type="number" step="0.01" min="0" className="input" value={addItemForm.dimHeight} onChange={(e) => setAddItemForm({ ...addItemForm, dimHeight: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50/50 p-5 rounded-xl border border-orange-200/60">
                  <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 border-b border-orange-200/60 pb-2">Stock Alert Thresholds</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-orange-600 mb-1">Orange (Warning)</label>
                      <input type="number" min="0" className="input border-orange-200 focus:border-orange-400" value={addItemForm.alertOrange} onChange={(e) => setAddItemForm({ ...addItemForm, alertOrange: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-rose-600 mb-1">Red (Action Req)</label>
                      <input type="number" min="0" className="input border-rose-200 focus:border-rose-400" value={addItemForm.alertRed} onChange={(e) => setAddItemForm({ ...addItemForm, alertRed: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-red-700 mb-1">Critical (Outage)</label>
                      <input type="number" min="0" className="input border-red-300 bg-red-50 focus:border-red-500 font-bold text-red-700" value={addItemForm.alertCritical} onChange={(e) => setAddItemForm({ ...addItemForm, alertCritical: e.target.value })} required />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddItemModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={addItemMutation.isLoading} className="btn-primary bg-blue-600 hover:bg-blue-700 shadow-blue-500/30">Create Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <BarcodeScanner onScanSuccess={handleScanSuccess} onClose={() => setIsScannerOpen(false)} />
      )}
    </div>
  );
}