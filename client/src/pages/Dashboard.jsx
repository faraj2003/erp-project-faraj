import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Assuming you are using react-router
import api from '../lib/axios';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    criticalAlerts: 0,
    pendingAdjustments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you might have a dedicated /dashboard/stats endpoint.
    // For now, we simulate fetching the aggregates.
    const fetchStats = async () => {
      try {
        const [itemsRes, adjRes] = await Promise.all([
          api.get('/inventory/items').catch(() => ({ data: { data: [] } })),
          api.get('/inventory/adjustments?status=Pending_Review').catch(() => ({ data: { data: [] } }))
        ]);
        
        setStats({
          totalItems: itemsRes.data.data?.length || 0,
          criticalAlerts: 3, // Mocked: You would calculate this based on stock levels
          pendingAdjustments: adjRes.data.data?.length || 0
        });
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      <div className="border-b pb-4">
        <h1 className="text-3xl font-light text-gray-900">FactoryFlow Command Center</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back. Here is your inventory overview.</p>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Items Managed</h3>
          <div className="mt-2 text-4xl font-light text-gray-900">
            {loading ? '...' : stats.totalItems}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between border-l-4 border-l-red-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Critical Stock Alerts</h3>
          <div className="mt-2 text-4xl font-light text-red-600">
            {loading ? '...' : stats.criticalAlerts}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between border-l-4 border-l-yellow-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Adjustments</h3>
          <div className="mt-2 text-4xl font-light text-yellow-600">
            {loading ? '...' : stats.pendingAdjustments}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-gray-50 border rounded-xl hover:bg-gray-100 hover:shadow-sm transition-all text-left flex flex-col gap-2">
            <span className="text-2xl">📥</span>
            <span className="font-medium text-gray-900">Receive Stock</span>
          </button>
          <button className="p-4 bg-gray-50 border rounded-xl hover:bg-gray-100 hover:shadow-sm transition-all text-left flex flex-col gap-2">
            <span className="text-2xl">📤</span>
            <span className="font-medium text-gray-900">Issue Stock</span>
          </button>
          <button className="p-4 bg-gray-50 border rounded-xl hover:bg-gray-100 hover:shadow-sm transition-all text-left flex flex-col gap-2">
            <span className="text-2xl">🔄</span>
            <span className="font-medium text-gray-900">Transfer</span>
          </button>
          <Link to="/adjustments" className="p-4 bg-gray-50 border rounded-xl hover:bg-gray-100 hover:shadow-sm transition-all text-left flex flex-col gap-2">
            <span className="text-2xl">⚖️</span>
            <span className="font-medium text-gray-900">Adjustments</span>
          </Link>
        </div>
      </div>

    </div>
  );
}