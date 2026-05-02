import React, { useState, useEffect } from 'react';
import api from '../lib/axios';

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await api.get('/analytics/reports');
        setReportData(response.data.data);
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Compiling Analytics...</div>;
  if (!reportData) return <div className="p-8 text-center text-red-500">Failed to load reports.</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-fade-in">
      
      <div className="border-b pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-gray-900">Analytics & Reporting</h1>
          <p className="text-sm text-gray-500 mt-1">Automated insights on valuation, velocity, and trends.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
        >
          Print Report
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-6 rounded-xl border shadow-sm text-white">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Warehouse Volume</h3>
          <div className="mt-2 text-5xl font-light">
            {reportData.overview.totalStockVolume.toLocaleString()} <span className="text-xl text-gray-500">units</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Storage Zones</h3>
          <div className="mt-2 text-5xl font-light text-blue-600">
            {reportData.overview.activeLocations}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Fast Moving Items */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <span className="text-green-500">↑</span> Fast-Moving Items (30 Days)
            </h2>
          </div>
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-white text-gray-400 text-xs uppercase border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Item</th>
                <th className="px-6 py-3 font-medium text-right">Qty Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.velocity.fastMoving.length === 0 ? (
                <tr><td colSpan="2" className="p-4 text-center">No movement data available.</td></tr>
              ) : (
                reportData.velocity.fastMoving.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name} <span className="text-gray-400 text-xs font-mono ml-2">{item.sku}</span></td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">{item.totalIssued}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Slow Moving Items */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <span className="text-red-500">↓</span> Slow-Moving Items (30 Days)
            </h2>
          </div>
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-white text-gray-400 text-xs uppercase border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Item</th>
                <th className="px-6 py-3 font-medium text-right">Qty Issued</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reportData.velocity.slowMoving.length === 0 ? (
                <tr><td colSpan="2" className="p-4 text-center">No movement data available.</td></tr>
              ) : (
                reportData.velocity.slowMoving.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name} <span className="text-gray-400 text-xs font-mono ml-2">{item.sku}</span></td>
                    <td className="px-6 py-4 text-right font-bold text-red-600">{item.totalIssued}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Historical Movement Trends (CSS Bar Chart) */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-lg font-medium text-gray-900 mb-6">7-Day Transaction Volume</h2>
        
        {reportData.trends.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No transaction history in the last 7 days.</div>
        ) : (
          <div className="flex items-end justify-between gap-2 h-64 pt-4 border-b border-gray-200">
            {reportData.trends.map((day, idx) => {
              // Calculate a relative height percentage based on the maximum volume in the dataset
              const maxVolume = Math.max(...reportData.trends.map(d => d.volumeHandled));
              const heightPct = maxVolume > 0 ? (day.volumeHandled / maxVolume) * 100 : 0;
              
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {day.volumeHandled}
                  </div>
                  <div 
                    className="w-full max-w-[40px] bg-blue-500 rounded-t-sm group-hover:bg-blue-400 transition-colors"
                    style={{ height: `${heightPct}%`, minHeight: '4px' }}
                  ></div>
                  <div className="mt-2 text-xs text-gray-500 rotate-45 md:rotate-0 transform origin-left">
                    {day._id.split('-').slice(1).join('/')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}