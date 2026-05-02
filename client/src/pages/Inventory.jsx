import React, { useState, useEffect } from 'react';
import api from '../lib/axios';

export default function Inventory() {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        // Assumes you have a GET route that returns populated stock balances
        const response = await api.get('/inventory/stock').catch(() => ({ data: { data: [] } }));
        setStockData(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch inventory', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // Helper to determine the alert color based on thresholds
  const getStatusBadge = (quantity, alerts) => {
    if (!alerts) return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">UNKNOWN</span>;
    if (quantity <= alerts.redThreshold) return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">CRITICAL</span>;
    if (quantity <= alerts.orangeThreshold) return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">LOW</span>;
    if (quantity <= alerts.yellowThreshold) return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">WARNING</span>;
    return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">HEALTHY</span>;
  };

  const filteredStock = stockData.filter(stock => 
    stock.item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.item?.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-light text-gray-900">Live Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time stock balances across all locations.</p>
        </div>
        <div className="w-full md:w-72">
          <input 
            type="text" 
            placeholder="Search by SKU or Name..." 
            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading inventory data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">SKU</th>
                  <th className="px-6 py-3 font-medium">Item Name</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Batch</th>
                  <th className="px-6 py-3 font-medium text-right">Quantity</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No stock records found.</td>
                  </tr>
                ) : (
                  filteredStock.map((stock) => (
                    <tr key={stock._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{stock.item?.sku}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{stock.item?.name}</td>
                      <td className="px-6 py-4">{stock.location?.name} ({stock.location?.zone})</td>
                      <td className="px-6 py-4 text-gray-500">{stock.batchNumber !== 'N/A' ? stock.batchNumber : '-'}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {stock.quantity} <span className="text-xs font-normal text-gray-500">{stock.item?.baseUnit}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(stock.quantity, stock.item?.alerts)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}