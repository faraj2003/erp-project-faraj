import React, { useState, useEffect } from 'react';
import { fetchPOs, approvePO, submitGRN, fetchProcurementStats, sendCustomAlert, fetchRejectedGRNs, fetchReturns, createReturn, fetchAllGRNs, fetchInvoices, submitInvoice, fetchSuppliers, fetchProcurementItems, fetchRFQs, createRFQ, submitSupplierBid, awardBid } from '../lib/procurementApi';
import axios from '../lib/axios'; 
import { useAuthStore } from '../store/authStore';

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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [poData, statsData, rejectionsData, rtvData, grnData, invData, supData, itemData, rfqData] = await Promise.all([ 
        fetchPOs(), fetchProcurementStats(), fetchRejectedGRNs(), fetchReturns(), fetchAllGRNs(), fetchInvoices(), fetchSuppliers(), fetchProcurementItems(), fetchRFQs()
      ]);
      setPOs(poData.data); setStats(statsData.data);
      setRejectedGRNs(rejectionsData.data); setReturns(rtvData.data);
      setAllGRNs(grnData.data); setInvoices(invData.data);
      setSuppliers(supData.data); setItems(itemData.data); setRfqs(rfqData.data);
    } catch (err) { console.error('Failed to load data', err); } 
    finally { setLoading(false); }
  };

  const handleApprove = async (poId) => { try { await approvePO(poId); alert('Approved!'); loadData(); } catch (err) { alert('Approval failed'); } };
  
  const handleSmartScan = async () => { 
      try { setLoading(true); const res = await axios.post('/api/procurement/auto-order'); alert(`🤖 ${res.data.draftsCreated} new orders drafted.`); loadData(); } 
      catch (err) { alert('Failed scan.'); } finally { setLoading(false); } 
  };
  
  const handleSubmitGRN = async (e) => {
    e.preventDefault();
    try {
      const selectedPO = pos.find(p => p._id === grnForm.purchaseOrderId);
      if (!selectedPO) return alert("Select a PO");

      const payload = {
        purchaseOrderId: selectedPO._id, 
        // BULLETPROOF FIX 2: Safely extract supplier ID regardless of population depth
        supplierId: selectedPO.supplier?._id || selectedPO.supplier, 
        locationId: 'DEFAULT_LOCATION', 
        logisticsCosts: { freight: Number(grnForm.freight), customs: Number(grnForm.customs) },
        logistics: { vehicleRegistration: grnForm.vehicleRegistration, waybillNumber: grnForm.waybillNumber },
        receivedItems: selectedPO.items.map((item) => ({ item: item.item, expectedQuantity: item.quantity, receivedQuantity: item.quantity, rejectedQuantity: 0 }))
      };
      await submitGRN(payload); 
      alert('Truck Received! Landed Costs Calculated.'); 
      setGrnForm({ purchaseOrderId: '', vehicleRegistration: '', waybillNumber: '', freight: 0, customs: 0 }); 
      loadData();
    } catch (err) { 
      // BULLETPROOF FIX 3: Display the exact backend error message!
      console.error("GRN Error Details:", err.response?.data || err);
      alert(`Failed to receive: ${err.response?.data?.message || err.message}`); 
    }
  };

  const handleInitiateRTV = async (grn) => {
    try {
      const payload = {
        goodsReceiptId: grn._id, supplierId: grn.supplier._id, totalCreditExpected: 100, 
        returnedItems: grn.receivedItems.filter(i => i.rejectedQuantity > 0).map(i => ({ item: i.item._id, quantity: i.rejectedQuantity, reason: 'Damaged in transit' }))
      };
      await createReturn(payload); alert('Return to Vendor Initiated!'); loadData();
    } catch (err) { alert('Failed to initiate return'); }
  };

  const handleVerifyInvoice = async (e) => {
    e.preventDefault();
    try {
      const selectedGRN = allGRNs.find(g => g._id === invoiceForm.goodsReceiptId);
      const mockBilledItems = selectedGRN.receivedItems.map(ri => ({ item: ri.item._id, quantity: ri.receivedQuantity, unitPrice: ri.unitPrice }));
      await submitInvoice({ invoiceNumber: invoiceForm.invoiceNumber, goodsReceiptId: selectedGRN._id, billedItems: mockBilledItems });
      alert('Invoice Processed!'); setInvoiceForm({ invoiceNumber: '', goodsReceiptId: '' }); loadData();
    } catch (err) { alert('Invoice failed.'); }
  };

  const handleCreateRFQ = async (e) => {
    e.preventDefault();
    try { await createRFQ(rfqForm); alert('RFQ Broadcasted to Vendors!'); setRfqForm({ itemId: '', targetQuantity: '', deadline: '' }); loadData(); } 
    catch (err) { alert('Failed to create RFQ'); }
  };

  const simulateVendorBid = async (rfqId) => {
    try {
      if (suppliers.length === 0) return alert('No suppliers in system!');
      const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      const mockPrice = Math.floor(Math.random() * 50) + 10; 
      await submitSupplierBid({ rfqId, supplierId: randomSupplier._id, quotedPrice: mockPrice, promisedDeliveryDate: new Date(Date.now() + 604800000) }); 
      alert(`${randomSupplier.name} bid $${mockPrice}!`); loadData();
    } catch (err) { alert('Bid simulation failed'); }
  };

  const handleAwardBid = async (rfqId, bidId) => {
    try { await awardBid(rfqId, bidId); alert('🎉 Vendor Awarded! Purchase Order generated.'); loadData(); } 
    catch (err) { alert('Failed to award bid'); }
  };

  if (loading) return <div className="p-6">Loading Procurement Hub...</div>;

  const pendingPOs = pos.filter(po => po.status === 'Pending Approval');
  const approvedPOs = pos.filter(po => po.status === 'Approved');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Procurement Manager Hub</h1>

      <div className="flex border-b border-gray-200 mb-6 space-x-6 overflow-x-auto pb-2">
        {['overview', 'approvals', 'receive', 'returns', 'invoices', 'bidding'].map(tab => (
          <button key={tab} className={`py-2 px-2 font-semibold capitalize whitespace-nowrap ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`} onClick={() => setActiveTab(tab)}>
            {tab === 'invoices' ? '🧾 Invoices' : tab === 'bidding' ? '🤝 Bidding' : tab} {tab === 'approvals' && `(${pendingPOs.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-lg shadow text-white md:col-span-3 flex flex-col md:flex-row justify-between items-center gap-4">
             <div><h3 className="text-xl font-bold mb-1">🤖 Smart Inventory Engine</h3><p className="text-indigo-100 text-sm">Scan warehouse levels and auto-generate Purchase Orders.</p></div>
             <button onClick={handleSmartScan} className="bg-white text-indigo-600 font-bold py-3 px-6 rounded-lg shadow whitespace-nowrap hover:scale-105 transition-transform">Run Stock Scan</button>
           </div>
           
           <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400 md:col-span-3">
             <h3 className="text-lg font-bold text-gray-800 mb-2">Broadcast Custom Alert</h3>
             <form onSubmit={async (e) => { e.preventDefault(); await sendCustomAlert(alertForm); alert('Sent!'); setAlertForm({...alertForm, message:''}); }} className="flex gap-4 items-center">
               <select className="border p-2 rounded focus:ring-blue-500" value={alertForm.targetAudience} onChange={(e) => setAlertForm({...alertForm, targetAudience: e.target.value})}>
                 <option value="everyone">All Staff</option>
                 <option value="warehouse">Warehouse Only</option>
               </select>
               <input type="text" required placeholder="Type alert message..." className="flex-1 border p-2 rounded" value={alertForm.message} onChange={(e) => setAlertForm({...alertForm, message: e.target.value})} />
               <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded">Send</button>
             </form>
           </div>

           <div className="bg-white p-6 rounded shadow"><h3 className="text-gray-500 font-semibold mb-1">Pending Approvals</h3><p className="text-4xl font-bold text-blue-600">{stats.pendingPOsCount}</p></div>
           <div className="bg-white p-6 rounded shadow md:col-span-2"><h3 className="text-gray-500 font-semibold mb-3">Critical Low Stock Alerts</h3>
             <ul className="divide-y">{stats.lowStockItems.length === 0 ? <p className="text-sm text-gray-500">Inventory levels are healthy.</p> : stats.lowStockItems.map(s => <li key={s._id} className="py-2 flex justify-between"><span className="font-medium text-gray-800">{s.item?.name}</span><span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded">{s.quantity} units left</span></li>)}</ul>
           </div>
         </div>
      )}

      {activeTab === 'approvals' && (
        <div className="bg-white rounded shadow p-6">
           <h2 className="text-xl font-bold mb-4">Approval Queue</h2>
           {pendingPOs.length === 0 ? <p className="text-gray-500">No orders awaiting approval.</p> : pendingPOs.map(po => (
             <div key={po._id} className="flex justify-between items-center border-b py-4">
                <div>
                  <p className="font-bold text-gray-800">{po.poNumber} - ${po.totalAmount}</p>
                  <p className="text-sm text-gray-500 mb-1">Supplier: {po.supplier?.name}</p>
                  {po.poNumber.startsWith('AUTO') && <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-1 rounded-full">🤖 Auto-Draft</span>}
                  {po.poNumber.startsWith('PO-RFQ') && <span className="text-xs bg-green-100 text-green-800 font-bold px-2 py-1 rounded-full">🏆 Winning Bid</span>}
                </div>
                <button onClick={() => handleApprove(po._id)} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-bold shadow">Approve</button>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'receive' && (
         <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
         <h2 className="text-xl font-bold text-gray-800 mb-6">Log Shipment & Landed Costs</h2>
         <form onSubmit={handleSubmitGRN} className="space-y-6">
           <div>
             <label className="block text-sm font-bold text-gray-700 mb-1">Select Approved Order</label>
             <select required className="w-full border p-2.5 rounded focus:ring-blue-500" value={grnForm.purchaseOrderId} onChange={(e) => setGrnForm({...grnForm, purchaseOrderId: e.target.value})}>
               <option value="">-- Choose Approved Order --</option>
               {approvedPOs.map(po => <option key={po._id} value={po._id}>{po.poNumber} ({po.supplier?.name})</option>)}
             </select>
             {approvedPOs.length === 0 && <p className="text-xs text-red-500 mt-1">You must approve a Purchase Order before you can receive a truck.</p>}
           </div>

           <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border">
             <h3 className="col-span-2 font-semibold text-gray-700">Logistics (Truck Details)</h3>
             <input type="text" required placeholder="Truck Plate #" className="border p-2 rounded" value={grnForm.vehicleRegistration} onChange={e => setGrnForm({...grnForm, vehicleRegistration: e.target.value})} />
             <input type="text" required placeholder="Waybill #" className="border p-2 rounded" value={grnForm.waybillNumber} onChange={e => setGrnForm({...grnForm, waybillNumber: e.target.value})} />
           </div>

           <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded border border-blue-100">
              <h3 className="col-span-2 font-semibold text-blue-800">Additional Landed Costs ($)</h3>
              <div><label className="text-xs font-bold text-gray-600">Freight Bill</label><input type="number" min="0" className="w-full border p-2 rounded" value={grnForm.freight} onChange={e => setGrnForm({...grnForm, freight: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-600">Customs / Duty</label><input type="number" min="0" className="w-full border p-2 rounded" value={grnForm.customs} onChange={e => setGrnForm({...grnForm, customs: e.target.value})} /></div>
            </div>

           <button type="submit" disabled={approvedPOs.length === 0} className="w-full bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 rounded shadow">Receive Goods & Calculate True Cost</button>
         </form>
       </div>
      )}

      {activeTab === 'returns' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded shadow p-6 border-t-4 border-red-500">
            <h2 className="text-lg font-bold text-red-600 mb-4">Flagged for Return (QC Issues)</h2>
            {rejectedGRNs.length === 0 ? <p className="text-gray-500">No damaged goods reported from warehouse.</p> : 
              rejectedGRNs.map(grn => (
                <div key={grn._id} className="border p-4 rounded mb-3 border-red-100 bg-red-50">
                  <p className="font-bold text-gray-900">{grn.grnNumber}</p>
                  <p className="text-sm text-gray-600 mb-2">Supplier: {grn.supplier?.name}</p>
                  <ul className="text-sm text-red-700 font-medium mb-3">
                    {grn.receivedItems.filter(i => i.rejectedQuantity > 0).map(i => (
                      <li key={i._id}>• {i.rejectedQuantity} units of {i.item?.name} broken</li>
                    ))}
                  </ul>
                  <button onClick={() => handleInitiateRTV(grn)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-bold w-full shadow">Initiate Formal RTV Shipment</button>
                </div>
              ))
            }
          </div>

          <div className="bg-white rounded shadow p-6 border-t-4 border-gray-300">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Active RTV Shipments</h2>
            {returns.length === 0 ? <p className="text-gray-500">No active returns.</p> : 
              returns.map(rtv => (
                <div key={rtv._id} className="border-b py-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">{rtv.rtvNumber}</p>
                    <p className="text-xs text-gray-500 mb-1">To: {rtv.supplier?.name}</p>
                    <span className="text-xs bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded-full">{rtv.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Awaiting Credit:</p>
                    <span className="font-bold text-red-600">${rtv.totalCreditExpected}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded shadow p-6 md:col-span-1 border-t-4 border-purple-500">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Verify Vendor Invoice</h2>
            <form onSubmit={handleVerifyInvoice} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Invoice Bill Number</label>
                <input type="text" required placeholder="e.g., INV-99281" className="w-full border p-2 rounded" value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({...invoiceForm, invoiceNumber: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Match to Delivery (GRN)</label>
                <select required className="w-full border p-2 rounded" value={invoiceForm.goodsReceiptId} onChange={e => setInvoiceForm({...invoiceForm, goodsReceiptId: e.target.value})}>
                  <option value="">-- Select Arrival Record --</option>
                  {allGRNs.map(grn => <option key={grn._id} value={grn._id}>{grn.grnNumber} ({grn.supplier?.name})</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded shadow">Run 3-Way Match Engine</button>
            </form>
          </div>

          <div className="bg-white rounded shadow p-6 md:col-span-2 border-t-4 border-gray-300">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Accounts Payable Queue</h2>
            <div className="space-y-3">
              {invoices.length === 0 ? <p className="text-gray-500">No invoices processed yet.</p> :
                invoices.map(inv => (
                  <div key={inv._id} className={`border p-4 rounded flex justify-between items-center ${inv.matchStatus === 'Matched' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div>
                      <p className="font-bold text-gray-900">{inv.invoiceNumber} <span className="text-sm font-normal text-gray-500">from {inv.supplier?.name}</span></p>
                      <p className="text-sm text-gray-600 mt-1">Total Billed: <span className="font-bold">${inv.totalBilledAmount}</span></p>
                      {inv.matchStatus === 'Discrepancy' && <p className="text-xs text-red-600 font-bold mt-2">⚠️ {inv.discrepancyNotes}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${inv.matchStatus === 'Matched' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{inv.matchStatus}</span>
                      {inv.matchStatus === 'Matched' && <button className="block mt-3 text-xs bg-gray-800 text-white px-3 py-1 rounded">Send to Finance</button>}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bidding' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded shadow p-6 md:col-span-1 border-t-4 border-blue-500">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Create RFQ (Ask for Bids)</h2>
            <form onSubmit={handleCreateRFQ} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Item Required</label>
                <select required className="w-full border p-2 rounded" value={rfqForm.itemId} onChange={e => setRfqForm({...rfqForm, itemId: e.target.value})}>
                  <option value="">-- Select Material --</option>
                  {items.map(item => <option key={item._id} value={item._id}>{item.name} ({item.sku})</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Target Quantity</label><input type="number" min="1" required className="w-full border p-2 rounded" value={rfqForm.targetQuantity} onChange={e => setRfqForm({...rfqForm, targetQuantity: e.target.value})} /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Bidding Deadline</label><input type="date" required className="w-full border p-2 rounded" value={rfqForm.deadline} onChange={e => setRfqForm({...rfqForm, deadline: e.target.value})} /></div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow">Broadcast to Vendors</button>
            </form>
          </div>

          <div className="bg-white rounded shadow p-6 md:col-span-2 border-t-4 border-gray-300">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Active Bidding Wars</h2>
            <div className="space-y-6">
              {rfqs.length === 0 ? <p className="text-gray-500">No active RFQs.</p> :
                rfqs.map(rfq => (
                  <div key={rfq._id} className="border p-4 rounded bg-gray-50">
                    <div className="flex justify-between items-center mb-3 border-b pb-2">
                      <div>
                        <p className="font-bold text-lg text-gray-900">{rfq.item?.name} <span className="text-gray-500 text-sm">({rfq.targetQuantity} units)</span></p>
                        <p className="text-sm text-blue-600">{rfq.rfqNumber} • Ends: {new Date(rfq.deadline).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${rfq.status === 'Open' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>{rfq.status}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {rfq.bids.length === 0 ? <p className="text-sm text-gray-500 italic">Waiting for supplier quotes...</p> : 
                        rfq.bids.map(bid => (
                          <div key={bid._id} className={`flex justify-between items-center p-3 border rounded ${bid.isWinner ? 'bg-yellow-50 border-yellow-400 border-2' : 'bg-white'}`}>
                            <span className="font-medium text-sm text-gray-800">{bid.supplier?.name}</span>
                            <div className="text-right flex items-center gap-4">
                              <span className="font-bold text-green-700 text-lg">${bid.quotedPrice}</span>
                              {rfq.status === 'Open' && (<button onClick={() => handleAwardBid(rfq._id, bid._id)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded shadow font-bold">Award & Create PO</button>)}
                              {bid.isWinner && <span className="text-xs font-bold text-yellow-800 bg-yellow-200 px-3 py-1 rounded-full shadow-sm">🏆 WINNER</span>}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                    {rfq.status === 'Open' && (<button onClick={() => simulateVendorBid(rfq._id)} className="w-full text-sm bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 py-2 rounded font-medium shadow-sm transition-colors">Test: Simulate Vendor Quote</button>)}
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