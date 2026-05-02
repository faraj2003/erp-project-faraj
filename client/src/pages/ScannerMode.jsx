import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/axios';

export default function ScannerMode() {
  const [sku, setSku] = useState('');
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionQuantity, setActionQuantity] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState('');
  
  const scannerInputRef = useRef(null);

  // Keep focus on input so hardware scanners always register
  useEffect(() => {
    scannerInputRef.current?.focus();
  }, [scannedData]);

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!sku.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/inventory/scan/${sku}`);
      setScannedData(response.data.data);
      if (response.data.data.stock.length > 0) {
        setSelectedLocation(response.data.data.stock[0].location._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Item not found in system.');
      setScannedData(null);
    } finally {
      setLoading(false);
      setSku(''); 
    }
  };

  const handleQuickAction = async (actionType) => {
    if (!selectedLocation) return alert("Please select a location.");
    
    try {
      const endpoint = actionType === 'receive' ? '/inventory/receive' : '/inventory/issue';
      await api.post(endpoint, {
        itemId: scannedData.item._id,
        locationId: selectedLocation,
        quantity: actionQuantity
      });
      
      alert(`Successfully ${actionType}d ${actionQuantity} ${scannedData.item.baseUnit}!`);
      setScannedData(null); 
      setActionQuantity(1);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${actionType} stock.`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-light text-gray-900">Factory Floor Scanner</h1>
        <p className="text-sm text-gray-500">Awaiting Barcode/QR input...</p>
      </div>

      <div className="bg-gray-900 p-8 rounded-2xl shadow-lg text-center">
        <form onSubmit={handleScanSubmit}>
          <input 
            ref={scannerInputRef}
            type="text" 
            placeholder="Scan Barcode Now..."
            className="w-full text-center text-2xl p-4 rounded-xl border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            autoFocus
            autoComplete="off"
          />
          <button type="submit" className="hidden">Submit Scan</button>
        </form>
        {error && <p className="text-red-400 mt-4 text-sm bg-red-900/20 py-2 rounded">{error}</p>}
      </div>

      {scannedData && (
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-2xl font-medium text-gray-900">{scannedData.item.name}</h2>
            <p className="font-mono text-gray-500 mt-1">SKU: {scannedData.item.sku}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Current Locations</h3>
              {scannedData.stock.length === 0 ? (
                <p className="text-gray-500 text-sm italic">Not in stock.</p>
              ) : (
                <ul className="space-y-2">
                  {scannedData.stock.map(st => (
                    <li key={st._id} className="flex justify-between p-3 bg-gray-50 rounded-lg border">
                      <span className="font-medium text-gray-800">{st.location.name}</span>
                      <span className="font-bold text-blue-600">{st.quantity} {scannedData.item.baseUnit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-sm font-bold text-blue-900 uppercase">Quick Issue/Receive</h3>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Location</label>
                <select className="w-full text-sm border-gray-300 rounded shadow-sm" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                  <option value="">Select Location...</option>
                  {scannedData.stock.map(st => <option key={st.location._id} value={st.location._id}>{st.location.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Quantity</label>
                <input type="number" min="1" className="w-full text-lg font-bold text-center border-gray-300 rounded shadow-sm" value={actionQuantity} onChange={(e) => setActionQuantity(Number(e.target.value))} />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleQuickAction('receive')} className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition">IN</button>
                <button onClick={() => handleQuickAction('issue')} className="flex-1 bg-white border-2 border-gray-900 text-gray-900 py-3 rounded-lg font-medium hover:bg-gray-50 transition">OUT</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}