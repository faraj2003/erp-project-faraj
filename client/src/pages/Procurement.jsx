import React, { useState, useEffect } from 'react';
import { fetchPOs, approvePO, submitGRN, fetchProcurementStats, sendCustomAlert } from '../lib/procurementApi';
import { useAuthStore } from '../store/authStore';

const Procurement = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [pos, setPOs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Forms
  const [grnForm, setGrnForm] = useState({ purchaseOrderId: '', supplierId: '', vehicleRegistration: '', driverName: '', waybillNumber: '' });
  const [alertForm, setAlertForm] = useState({ message: '', targetAudience: 'everyone' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [poData, statsData] = await Promise.all([ fetchPOs(), fetchProcurementStats() ]);
      setPOs(poData.data);
      setStats(statsData.data);
    } catch (err) {
      console.error('Failed to load data', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (poId) => {
    try {
      await approvePO(poId);
      alert('Purchase Order Approved successfully!');
      loadData();
    } catch (err) { alert('Approval failed'); }
  };

  const handleSubmitGRN = async (e) => {
    e.preventDefault();
    try {
      const selectedPO = pos.find(p => p._id === grnForm.purchaseOrderId);
      if (!selectedPO) return alert("Please select a valid PO");

      const payload = {
        purchaseOrderId: selectedPO._id,
        supplierId: selectedPO.supplier._id,
        locationId: 'DEFAULT_LOCATION', // Update if you have dynamic locations
        logistics: {
          vehicleRegistration: grnForm.vehicleRegistration,
          driverName: grnForm.driverName,
          waybillNumber: grnForm.waybillNumber
        },
        receivedItems: selectedPO.items.map(item => ({
          item: item.item, expectedQuantity: item.quantity, receivedQuantity: item.quantity, rejectedQuantity: 0
        }))
      };

      await submitGRN(payload);
      alert('Truck Received! Inventory updated and Batch ID generated.');
      setGrnForm({ purchaseOrderId: '', supplierId: '', vehicleRegistration: '', driverName: '', waybillNumber: '' });
      loadData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to receive truck'); }
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    try {
      await sendCustomAlert(alertForm);
      alert('Alert Broadcasted to Network!');
      setAlertForm({ ...alertForm, message: '' });
    } catch (err) { alert('Failed to send alert'); }
  };

  if (loading) return <div className="p-6">Loading Procurement Hub...</div>;

  const pendingPOs = pos.filter(po => po.status === 'Pending Approval');
  const approvedPOs = pos.filter(po => po.status === 'Approved');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Procurement Manager Hub</h1>
        {error && <span className="text-red-500 bg-red-100 px-3 py-1 rounded">{error}</span>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 space-x-6">
        <button className={`py-2 px-2 font-semibold ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`} onClick={() => setActiveTab('overview')}>
          Dashboard Overview
        </button>
        <button className={`py-2 px-2 font-semibold ${activeTab === 'approvals' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`} onClick={() => setActiveTab('approvals')}>
          Approval Queue ({pendingPOs.length})
        </button>
        <button className={`py-2 px-2 font-semibold ${activeTab === 'receive' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`} onClick={() => setActiveTab('receive')}>
          Receive Truck (GRN)
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ALERTS */}
      {activeTab === 'overview' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-400 md:col-span-3">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Broadcast Custom Alert</h3>
            <form onSubmit={handleSendAlert} className="flex gap-4 items-center">
              <select 
                className="border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                value={alertForm.targetAudience}
                onChange={(e) => setAlertForm({...alertForm, targetAudience: e.target.value})}
              >
                <option value="everyone">All Staff</option>
                <option value="warehouse">Warehouse Only</option>
              </select>
              <input 
                type="text" required placeholder="Type alert message (e.g., Truck 44 is arriving at Dock B...)"
                className="flex-1 border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                value={alertForm.message}
                onChange={(e) => setAlertForm({...alertForm, message: e.target.value})}
              />
              <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded transition-colors">Send Alert</button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500 font-semibold mb-1">Pending Approvals</h3>
            <p className="text-4xl font-bold text-blue-600">{stats.pendingPOsCount}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            <h3 className="text-gray-500 font-semibold mb-3">Critical Low Stock Alerts</h3>
            <ul className="divide-y">
              {stats.lowStockItems.length === 0 ? <li className="text-gray-400">Inventory levels look good.</li> : 
                stats.lowStockItems.map(stock => (
                  <li key={stock._id} className="py-2 flex justify-between items-center">
                    <span className="font-medium text-gray-800">{stock.item?.name} (SKU: {stock.item?.sku})</span>
                    <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded">{stock.quantity} units left</span>
                  </li>
                ))
              }
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: APPROVAL QUEUE */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingPOs.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No POs currently awaiting approval.</td></tr>
              ) : (
                pendingPOs.map((po) => (
                  <tr key={po._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{po.poNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{po.supplier?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">${po.totalAmount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleApprove(po._id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow transition-colors"
                      >
                        Approve Order
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: RECEIVE TRUCK */}
      {activeTab === 'receive' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Log Incoming Shipment</h2>
          <form onSubmit={handleSubmitGRN} className="space-y-5">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Approved PO</label>
              <select 
                required
                className="w-full border border-gray-300 rounded-md shadow-sm p-2.5 focus:ring-blue-500 focus:border-blue-500"
                value={grnForm.purchaseOrderId}
                onChange={(e) => setGrnForm({...grnForm, purchaseOrderId: e.target.value})}
              >
                <option value="">-- Choose an Approved Order --</option>
                {approvedPOs.map(po => (
                  <option key={po._id} value={po._id}>{po.poNumber} - {po.supplier?.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-md border border-gray-100 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">Truck Logistics (For Fault Tracking)</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Registration / Plate</label>
                <input 
                  type="text" required placeholder="e.g. MH-12-AB-1234"
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2.5 focus:ring-blue-500 focus:border-blue-500"
                  value={grnForm.vehicleRegistration}
                  onChange={(e) => setGrnForm({...grnForm, vehicleRegistration: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name (Optional)</label>
                <input 
                  type="text" placeholder="e.g. John Doe"
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2.5 focus:ring-blue-500 focus:border-blue-500"
                  value={grnForm.driverName}
                  onChange={(e) => setGrnForm({...grnForm, driverName: e.target.value})}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Waybill / Tracking Number</label>
                <input 
                  type="text" required placeholder="Tracking # from Supplier"
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2.5 focus:ring-blue-500 focus:border-blue-500"
                  value={grnForm.waybillNumber}
                  onChange={(e) => setGrnForm({...grnForm, waybillNumber: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded shadow transition-colors"
              >
                Receive Goods & Update Inventory
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Procurement;