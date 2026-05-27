import React, { useState, useEffect } from 'react';
import { fetchPOs, approvePO, submitGRN, fetchProcurementStats, sendCustomAlert, fetchRejectedGRNs, fetchReturns, createReturn, fetchAllGRNs, fetchInvoices, submitInvoice, fetchSuppliers, createSupplier, fetchProcurementItems, fetchRFQs, createRFQ, submitSupplierBid, awardBid } from '../lib/procurementApi';
import axios from '../lib/axios'; 
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { 
  LayoutDashboard, CheckSquare, Truck, RotateCcw, Receipt, Gavel, 
  Zap, Bell, ShieldCheck, AlertTriangle, ArrowRight, DollarSign, Users
} from 'lucide-react';

const Procurement = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [pos, setPOs] = useState([]);
  const [stats, setStats] = useState(null);
  const [rejectedGRNs, setRejectedGRNs] = useState([]);
  const [returns, setReturns] = useState([]);
  const [allGRNs, setAllGRNs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [grnForm, setGrnForm] = useState({ purchaseOrderId: '', vehicleRegistration: '', waybillNumber: '', freight: 0, customs: 0 });
  const [alertForm, setAlertForm] = useState({ message: '', targetAudience: 'everyone' });
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNumber: '', goodsReceiptId: '' });
  const [rfqForm, setRfqForm] = useState({ itemId: '', targetQuantity: '', deadline: '' });
  
  // Added for Vendor Directory
  const [supplierForm, setSupplierForm] = useState({ name: '', contactPerson: '', email: '', phone: '', suppliedItems: [] });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // We wrap the Promise.all in a try-catch, but let's log which one specifically fails
      const [poData, statsData, rejectionsData, rtvData, grnData, invData, supData, itemData, rfqData] = await Promise.all([ 
        fetchPOs().catch(e => { console.error("PO Error:", e); return { data: [] }; }), 
        fetchProcurementStats().catch(e => { console.error("Stats Error:", e); return { data: { pendingPOsCount: 0, lowStockItems: [] } }; }), 
        fetchRejectedGRNs().catch(e => { console.error("Rejected GRN Error:", e); return { data: [] }; }), 
        fetchReturns().catch(e => { console.error("Returns Error:", e); return { data: [] }; }), 
        fetchAllGRNs().catch(e => { console.error("All GRNs Error:", e); return { data: [] }; }), 
        fetchInvoices().catch(e => { console.error("Invoices Error:", e); return { data: [] }; }), 
        fetchSuppliers().catch(e => { console.error("Suppliers Error:", e); return { data: [] }; }), 
        fetchProcurementItems().catch(e => { console.error("Items Error:", e); return { data: [] }; }), 
        fetchRFQs().catch(e => { console.error("RFQs Error:", e); return { data: [] }; })
      ]);

      setPOs(poData.data); 
      setStats(statsData.data);
      setRejectedGRNs(rejectionsData.data); 
      setReturns(rtvData.data);
      setAllGRNs(grnData.data); 
      setInvoices(invData.data);
      setSuppliers(supData.data); 
      setItems(itemData.data); 
      setRfqs(rfqData.data);
      
    } catch (err) { 
      toast.error('Data Sync Failed', { description: 'Check console for exact route error.' });
    } finally { 
      setLoading(false); 
    }
  };

  const handleApprove = async (poId) => { 
    try { 
      await approvePO(poId); 
      toast.success('Order Approved', { description: 'The purchase order has been authorized.' }); 
      loadData(); 
    } catch (err) { 
      toast.error('Approval Failed'); 
    } 
  };
  
  const handleSmartScan = async () => { 
      try { 
        setLoading(true); 
        const res = await axios.post('/api/procurement/auto-order'); 
        toast.success('Smart Scan Complete', { description: `🤖 ${res.data.draftsCreated} new orders drafted based on stock levels.` }); 
        loadData(); 
      } catch (err) { 
        toast.error('Scan Failed', { description: 'Engine encountered an error.' }); 
      } finally { setLoading(false); } 
  };
  
  const handleSubmitGRN = async (e) => {
    e.preventDefault();
    try {
      const selectedPO = pos.find(p => p._id === grnForm.purchaseOrderId);
      if (!selectedPO) return toast.warning('Action Required', { description: 'Please select a Purchase Order.' });

      const payload = {
        purchaseOrderId: selectedPO._id, 
        supplierId: selectedPO.supplier?._id || selectedPO.supplier, 
        locationId: 'DEFAULT_LOCATION', 
        logisticsCosts: { freight: Number(grnForm.freight), customs: Number(grnForm.customs) },
        logistics: { vehicleRegistration: grnForm.vehicleRegistration, waybillNumber: grnForm.waybillNumber },
        receivedItems: selectedPO.items.map((item) => ({ item: item.item, expectedQuantity: item.quantity, receivedQuantity: item.quantity, rejectedQuantity: 0 }))
      };
      await submitGRN(payload); 
      toast.success('Goods Received', { description: 'Truck logged and landed costs calculated.' }); 
      setGrnForm({ purchaseOrderId: '', vehicleRegistration: '', waybillNumber: '', freight: 0, customs: 0 }); 
      loadData();
    } catch (err) { 
      toast.error('Receiving Failed', { description: err.response?.data?.message || err.message }); 
    }
  };

  const handleInitiateRTV = async (grn) => {
    try {
      const payload = {
        goodsReceiptId: grn._id, supplierId: grn.supplier._id, totalCreditExpected: 100, 
        returnedItems: grn.receivedItems.filter(i => i.rejectedQuantity > 0).map(i => ({ item: i.item._id, quantity: i.rejectedQuantity, reason: 'Damaged in transit' }))
      };
      await createReturn(payload); 
      toast.success('RTV Initiated', { description: 'Return to Vendor process started.' }); 
      loadData();
    } catch (err) { toast.error('RTV Failed'); }
  };

  const handleVerifyInvoice = async (e) => {
    e.preventDefault();
    try {
      const selectedGRN = allGRNs.find(g => g._id === invoiceForm.goodsReceiptId);
      const mockBilledItems = selectedGRN.receivedItems.map(ri => ({ item: ri.item._id, quantity: ri.receivedQuantity, unitPrice: ri.unitPrice }));
      await submitInvoice({ invoiceNumber: invoiceForm.invoiceNumber, goodsReceiptId: selectedGRN._id, billedItems: mockBilledItems });
      toast.success('Invoice Processed', { description: '3-Way Match executed.' }); 
      setInvoiceForm({ invoiceNumber: '', goodsReceiptId: '' }); 
      loadData();
    } catch (err) { toast.error('Invoice Match Failed'); }
  };

  const handleCreateRFQ = async (e) => {
    e.preventDefault();
    try { 
      await createRFQ(rfqForm); 
      toast.success('RFQ Broadcasted', { description: 'Vendors have been notified.' }); 
      setRfqForm({ itemId: '', targetQuantity: '', deadline: '' }); 
      loadData(); 
    } catch (err) { toast.error('Failed to create RFQ'); }
  };

  const simulateVendorBid = async (rfqId) => {
    try {
      if (suppliers.length === 0) return toast.error('Configuration Error', { description: 'No suppliers in system.'});
      const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      const mockPrice = Math.floor(Math.random() * 50) + 10; 
      await submitSupplierBid({ rfqId, supplierId: randomSupplier._id, quotedPrice: mockPrice, promisedDeliveryDate: new Date(Date.now() + 604800000) }); 
      toast.info('New Bid Received', { description: `${randomSupplier.name} bid $${mockPrice}!` }); 
      loadData();
    } catch (err) { toast.error('Bid simulation failed'); }
  };

  const handleAwardBid = async (rfqId, bidId) => {
    try { 
      await awardBid(rfqId, bidId); 
      toast.success('Vendor Awarded! 🎉', { description: 'Purchase Order has been automatically generated.' }); 
      loadData(); 
    } catch (err) { toast.error('Failed to award bid'); }
  };

  // Added for Vendor Directory
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await createSupplier(supplierForm);
      toast.success('Vendor Onboarded', { description: `${supplierForm.name} and their items are now active.` });
      setSupplierForm({ name: '', contactPerson: '', email: '', phone: '', suppliedItems: [] });
      loadData();
    } catch (err) { toast.error('Failed to add vendor', { description: err.response?.data?.message || err.message }); }
  };

  if (loading) return <div className="p-10 text-center font-medium text-gray-400 animate-pulse">Loading Procurement Data...</div>;

  const pendingPOs = pos.filter(po => po.status === 'Pending Approval');
  const approvedPOs = pos.filter(po => po.status === 'Approved');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'suppliers', label: 'Vendor Directory', icon: <Users size={16} /> },
    { id: 'approvals', label: `Approvals (${pendingPOs.length})`, icon: <CheckSquare size={16} /> },
    { id: 'receive', label: 'Receive Goods', icon: <Truck size={16} /> },
    { id: 'returns', label: 'Returns', icon: <RotateCcw size={16} /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt size={16} /> },
    { id: 'bidding', label: 'Bidding Wars', icon: <Gavel size={16} /> },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
          <Truck className="text-blue-600" size={32} /> Procurement Hub
        </h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Manage vendor relations, purchase orders, and logistics.</p>
      </div>

      {/* ── MODERN TABS ── */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white/50 p-1.5 rounded-xl border border-gray-200/60 shadow-sm w-fit">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && stats && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Smart Inventory Engine */}
           <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-2xl shadow-lg md:col-span-3 flex flex-col md:flex-row justify-between items-center gap-6 group">
             <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
             <div className="relative z-10">
               <h3 className="text-2xl font-black text-white flex items-center gap-2 mb-2">
                 <Zap className="text-yellow-400 fill-yellow-400" size={24} /> Smart Inventory Engine
               </h3>
               <p className="text-indigo-100 text-sm font-medium">Automatically scan warehouse levels and generate draft Purchase Orders.</p>
             </div>
             <button onClick={handleSmartScan} className="relative z-10 bg-white hover:bg-indigo-50 text-indigo-700 font-black py-3.5 px-8 rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2">
               Run Stock Scan <ArrowRight size={18} />
             </button>
           </div>
           
           <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 md:col-span-3 border-l-4 border-l-amber-500">
             <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-4"><Bell size={20} className="text-amber-500"/> Broadcast Alert</h3>
             <form onSubmit={async (e) => { 
                e.preventDefault(); 
                await sendCustomAlert(alertForm); 
                toast.success('Alert Broadcasted'); 
                setAlertForm({...alertForm, message:''}); 
              }} className="flex flex-col sm:flex-row gap-3 items-center">
               <select className="input sm:w-48" value={alertForm.targetAudience} onChange={(e) => setAlertForm({...alertForm, targetAudience: e.target.value})}>
                 <option value="everyone">All Staff</option>
                 <option value="warehouse">Warehouse Only</option>
               </select>
               <input type="text" required placeholder="Type alert message..." className="input flex-1" value={alertForm.message} onChange={(e) => setAlertForm({...alertForm, message: e.target.value})} />
               <button type="submit" className="btn-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 border-0">Send Alert</button>
             </form>
           </div>

           <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending Approvals</h3>
             <p className="text-5xl font-black text-blue-600 tracking-tight">{stats.pendingPOsCount}</p>
           </div>
           <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 md:col-span-2">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14} className="text-rose-500"/> Critical Low Stock</h3>
             <div className="space-y-3">
                {stats.lowStockItems.length === 0 ? <p className="text-sm font-medium text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">Inventory levels are healthy.</p> : stats.lowStockItems.map(s => (
                  <div key={s._id} className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <span className="font-bold text-gray-800">{s.item?.name}</span>
                    <span className="text-xs text-rose-700 font-black bg-rose-100 px-3 py-1 rounded-md border border-rose-200">{s.quantity} units left</span>
                  </div>
                ))}
             </div>
           </div>
         </div>
      )}

      {/* ── VENDOR DIRECTORY TAB ── */}
      {activeTab === 'suppliers' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add Vendor Form */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6 lg:col-span-1 border-t-4 border-t-purple-500 h-fit">
            <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2"><Users className="text-purple-500"/> Onboard Vendor</h2>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Company Name</label>
                <input type="text" required className="input" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} placeholder="e.g. Acme Corp" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Person</label>
                  <input type="text" required className="input" value={supplierForm.contactPerson} onChange={e => setSupplierForm({...supplierForm, contactPerson: e.target.value})} placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone</label>
                  <input type="tel" required className="input" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} placeholder="555-0192" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</label>
                <input type="email" required className="input" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} placeholder="sales@acme.com" />
              </div>

              {/* NEW: Multi-Select Inventory Linker */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assign Inventory Items</label>
                <div className="max-h-40 overflow-y-auto bg-gray-50/80 p-3 rounded-xl border border-gray-200 space-y-2.5">
                  {items.map(item => (
                    <label key={item._id} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer p-1 hover:bg-white rounded transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        checked={supplierForm.suppliedItems.includes(item._id)}
                        onChange={(e) => {
                          const newItems = e.target.checked 
                            ? [...supplierForm.suppliedItems, item._id]
                            : supplierForm.suppliedItems.filter(id => id !== item._id);
                          setSupplierForm({...supplierForm, suppliedItems: newItems});
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 leading-none">{item.name}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{item.sku}</span>
                      </div>
                    </label>
                  ))}
                  {items.length === 0 && <p className="text-xs text-gray-400 italic text-center p-2">No inventory items available.</p>}
                </div>
              </div>

              <button type="submit" className="btn-primary w-full border-0 shadow-purple-500/30 py-3 bg-purple-600 hover:bg-purple-700">Add Supplier</button>
            </form>
          </div>

          {/* Vendor Directory List */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6 lg:col-span-2 border-t-4 border-t-gray-300">
            <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6">Active Vendor Directory</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {suppliers.length === 0 ? <p className="text-sm font-medium text-gray-500 bg-gray-50 p-6 rounded-xl border border-gray-100 col-span-2 text-center">No suppliers onboarded yet.</p> :
                suppliers.map(supplier => (
                  <div key={supplier._id} className="border border-gray-200/60 p-5 rounded-xl bg-gray-50/50 hover:shadow-md transition-shadow">
                    <h3 className="font-black text-lg text-gray-900">{supplier.name}</h3>
                    <p className="text-xs font-bold text-gray-500 mt-1 mb-3">{supplier.email} • {supplier.contactPerson}</p>
                    
                    <div className="pt-3 border-t border-gray-200/60">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Supplies Items:</p>
                      <div className="flex flex-wrap gap-1">
                         {items.filter(i => (i.supplier?._id || i.supplier) === supplier._id).map(item => (
                           <span key={item._id} className="text-[10px] bg-white border border-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded shadow-sm">{item.name}</span>
                         ))}
                         {items.filter(i => (i.supplier?._id || i.supplier) === supplier._id).length === 0 && <span className="text-xs text-gray-400 italic">No linked items</span>}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVALS TAB ── */}
      {activeTab === 'approvals' && (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
           <h2 className="text-xl font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2"><ShieldCheck className="text-emerald-500" /> Approval Queue</h2>
           {pendingPOs.length === 0 ? <p className="text-gray-500 font-medium">No orders awaiting approval.</p> : (
             <div className="space-y-4">
               {pendingPOs.map(po => (
                 <div key={po._id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50/50 border border-gray-200/60 p-5 rounded-xl hover:border-gray-300 transition-colors gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-black text-gray-900 text-lg">{po.poNumber}</p>
                        <p className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1"><DollarSign size={14}/> {po.totalAmount}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Supplier: <span className="font-bold text-gray-700">{po.supplier?.name}</span></p>
                      <div className="flex gap-2">
                        {po.poNumber.startsWith('AUTO') && <span className="text-[10px] bg-indigo-100 text-indigo-800 font-black px-2 py-1 rounded uppercase tracking-widest border border-indigo-200">🤖 Auto-Draft</span>}
                        {po.poNumber.startsWith('PO-RFQ') && <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-1 rounded uppercase tracking-widest border border-amber-200">🏆 Winning Bid</span>}
                      </div>
                    </div>
                    <button onClick={() => handleApprove(po._id)} className="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 border-0 h-10 px-8">Approve Order</button>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

      {/* ── RECEIVE TAB ── */}
      {activeTab === 'receive' && (
         <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-8 max-w-2xl mx-auto">
         <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2 flex items-center gap-2"><Truck className="text-blue-500" /> Log Shipment & Landed Costs</h2>
         <p className="text-sm font-medium text-gray-500 mb-8">Process incoming deliveries against approved purchase orders.</p>
         
         <form onSubmit={handleSubmitGRN} className="space-y-6">
           <div>
             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Approved Order</label>
             <select required className="input font-medium" value={grnForm.purchaseOrderId} onChange={(e) => setGrnForm({...grnForm, purchaseOrderId: e.target.value})}>
               <option value="">-- Choose Approved Order --</option>
               {approvedPOs.map(po => <option key={po._id} value={po._id}>{po.poNumber} ({po.supplier?.name})</option>)}
             </select>
             {approvedPOs.length === 0 && <p className="text-[10px] font-bold text-rose-500 mt-1.5 uppercase tracking-wide">Must approve a PO first.</p>}
           </div>

           <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-200/60">
             <h3 className="text-xs font-black text-gray-600 uppercase tracking-widest mb-4">Logistics (Truck Details)</h3>
             <div className="grid grid-cols-2 gap-4">
              <input type="text" required placeholder="Truck Plate #" className="input" value={grnForm.vehicleRegistration} onChange={e => setGrnForm({...grnForm, vehicleRegistration: e.target.value})} />
              <input type="text" required placeholder="Waybill #" className="input" value={grnForm.waybillNumber} onChange={e => setGrnForm({...grnForm, waybillNumber: e.target.value})} />
             </div>
           </div>

           <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
              <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-4">Additional Landed Costs ($)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5">Freight Bill</label>
                  <input type="number" min="0" className="input border-blue-200 focus:border-blue-400" value={grnForm.freight} onChange={e => setGrnForm({...grnForm, freight: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5">Customs / Duty</label>
                  <input type="number" min="0" className="input border-blue-200 focus:border-blue-400" value={grnForm.customs} onChange={e => setGrnForm({...grnForm, customs: e.target.value})} />
                </div>
              </div>
            </div>

           <button type="submit" disabled={approvedPOs.length === 0} className="btn-primary w-full py-3.5 text-base shadow-blue-500/30 border-0">Receive Goods & Process Entry</button>
         </form>
       </div>
      )}

      {/* ── BIDDING WARS TAB ── */}
      {activeTab === 'bidding' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6 lg:col-span-1 border-t-4 border-t-blue-500 h-fit">
            <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6">Create RFQ (Ask for Bids)</h2>
            <form onSubmit={handleCreateRFQ} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Item Required</label>
                <select required className="input" value={rfqForm.itemId} onChange={e => setRfqForm({...rfqForm, itemId: e.target.value})}>
                  <option value="">-- Select Material --</option>
                  {items.map(item => <option key={item._id} value={item._id}>{item.name} ({item.sku})</option>)}
                </select>
              </div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Target Quantity</label><input type="number" min="1" required className="input" value={rfqForm.targetQuantity} onChange={e => setRfqForm({...rfqForm, targetQuantity: e.target.value})} /></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Bidding Deadline</label><input type="date" required className="input" value={rfqForm.deadline} onChange={e => setRfqForm({...rfqForm, deadline: e.target.value})} /></div>
              <button type="submit" className="btn-primary w-full border-0 shadow-blue-500/30 py-3">Broadcast to Vendors</button>
            </form>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6 lg:col-span-2 border-t-4 border-t-gray-300">
            <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2"><Gavel className="text-gray-500"/> Active Bidding Wars</h2>
            <div className="space-y-6">
              {rfqs.length === 0 ? <p className="text-sm font-medium text-gray-500 bg-gray-50 p-6 rounded-xl border border-gray-100 text-center">No active RFQs.</p> :
                rfqs.map(rfq => (
                  <div key={rfq._id} className="border border-gray-200/60 p-5 rounded-xl bg-gray-50/50 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4 border-b border-gray-200/60 pb-4">
                      <div>
                        <p className="font-black text-xl text-gray-900">{rfq.item?.name} <span className="text-gray-400 text-sm font-bold">({rfq.targetQuantity} units)</span></p>
                        <p className="text-xs font-bold text-blue-600 mt-1">{rfq.rfqNumber} • Ends: {new Date(rfq.deadline).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${rfq.status === 'Open' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>{rfq.status}</span>
                    </div>

                    <div className="space-y-3 mb-5">
                      {rfq.bids.length === 0 ? <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">Waiting for quotes...</p> : 
                        rfq.bids.map(bid => (
                          <div key={bid._id} className={`flex justify-between items-center p-3.5 rounded-lg border ${bid.isWinner ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-gray-200/60'}`}>
                            <span className="font-bold text-sm text-gray-800">{bid.supplier?.name}</span>
                            <div className="text-right flex items-center gap-4">
                              <span className="font-black text-emerald-600 text-lg">${bid.quotedPrice}</span>
                              {rfq.status === 'Open' && (<button onClick={() => handleAwardBid(rfq._id, bid._id)} className="btn-primary bg-gray-900 hover:bg-black border-0 text-[10px] px-3 py-1.5 uppercase tracking-widest shadow-md">Award & Create PO</button>)}
                              {bid.isWinner && <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-3 py-1 rounded-md shadow-sm uppercase tracking-widest">🏆 WINNER</span>}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                    {rfq.status === 'Open' && (<button onClick={() => simulateVendorBid(rfq._id)} className="btn-secondary w-full py-2 text-xs uppercase tracking-widest">Test: Simulate Vendor Quote</button>)}
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ── RETURNS TAB ── */}
      {activeTab === 'returns' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Initiate Return */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6 border-t-4 border-t-rose-500 h-fit">
            <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2"><RotateCcw className="text-rose-500"/> Initiate Return (RTV)</h2>
            <div className="space-y-4">
              {rejectedGRNs.length === 0 ? (
                <p className="text-sm font-medium text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">No rejected goods pending return.</p>
              ) : (
                rejectedGRNs.map(grn => (
                  <div key={grn._id} className="border border-rose-100 bg-rose-50/50 p-4 rounded-xl hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-black text-gray-800 text-sm">GRN: {grn._id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs font-bold text-gray-500 mt-0.5">{grn.supplier?.name}</p>
                      </div>
                      <button onClick={() => handleInitiateRTV(grn)} className="btn-primary bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 border-0 text-[10px] py-1.5 px-3 uppercase tracking-widest">Process Return</button>
                    </div>
                    <div className="text-xs text-rose-700 font-bold space-y-1 bg-white/60 p-2 rounded border border-rose-100/50">
                      {grn.receivedItems.filter(i => i.rejectedQuantity > 0).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1"><AlertTriangle size={12}/> {item.rejectedQuantity}x {item.item?.name} rejected</div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Returns Log */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6 border-t-4 border-t-gray-300">
            <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6">Active Returns Log</h2>
            <div className="space-y-4">
              {returns.length === 0 ? (
                <p className="text-sm font-medium text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">No active returns in the system.</p>
              ) : (
                returns.map(rtv => (
                  <div key={rtv._id} className="flex justify-between items-center border border-gray-200/60 p-4 rounded-xl bg-gray-50/50 hover:bg-white transition-colors">
                    <div>
                      <p className="font-black text-gray-800">RTV-{rtv._id.slice(-6).toUpperCase()}</p>
                      <p className="text-xs font-bold text-gray-500 mt-1">Expected Credit: <span className="font-black text-emerald-600">${rtv.totalCreditExpected}</span></p>
                    </div>
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${rtv.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{rtv.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── INVOICES TAB ── */}
      {activeTab === 'invoices' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 3-Way Match Form */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6 lg:col-span-1 border-t-4 border-t-emerald-500 h-fit">
            <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2"><Receipt className="text-emerald-500"/> Process Invoice</h2>
            <form onSubmit={handleVerifyInvoice} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Received Goods (GRN)</label>
                <select required className="input font-medium" value={invoiceForm.goodsReceiptId} onChange={e => setInvoiceForm({...invoiceForm, goodsReceiptId: e.target.value})}>
                  <option value="">-- Select GRN --</option>
                  {allGRNs.map(grn => <option key={grn._id} value={grn._id}>GRN-{grn._id.slice(-6).toUpperCase()} ({grn.supplier?.name})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Vendor Invoice Number</label>
                <input type="text" required className="input font-medium" value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})} placeholder="INV-2026-..." />
              </div>
              <button type="submit" className="btn-primary w-full border-0 shadow-emerald-500/30 py-3 bg-emerald-600 hover:bg-emerald-700">Run 3-Way Match</button>
            </form>
          </div>

          {/* Invoice History Log */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6 lg:col-span-2 border-t-4 border-t-gray-300">
            <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6">Invoice History</h2>
            <div className="space-y-4">
              {invoices.length === 0 ? <p className="text-sm font-medium text-gray-500 bg-gray-50 p-6 rounded-xl border border-gray-100 text-center">No invoices processed yet.</p> :
                invoices.map(inv => (
                  <div key={inv._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border border-gray-200/60 p-5 rounded-xl bg-gray-50/50 gap-4 hover:shadow-sm transition-shadow">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="font-black text-lg text-gray-900">{inv.invoiceNumber}</p>
                        {inv.isMatched ? 
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 border border-emerald-200"><ShieldCheck size={12}/> Matched</span> : 
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 border border-rose-200"><AlertTriangle size={12}/> Discrepancy</span>
                        }
                      </div>
                      <p className="text-xs font-bold text-gray-500">Supplier: <span className="text-gray-700">{inv.supplier?.name}</span> • Total Billed: <span className="text-emerald-700 font-black">${inv.totalBilled}</span></p>
                    </div>
                    <span className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border ${inv.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{inv.paymentStatus}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Procurement;