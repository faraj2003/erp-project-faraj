import React, { useState, useEffect } from 'react';
import api from '../lib/axios';

export default function BOM() {
  const [boms, setBoms] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for Assembling a Kit
  const [assembleForm, setAssembleForm] = useState({
    bomId: '',
    buildQuantity: 1,
    sourceLocationId: '', // Where parts are taken from
    destinationLocationId: '' // Where the finished good goes
  });

  const fetchData = async () => {
    try {
      const [bomRes, itemRes, locRes] = await Promise.all([
        api.get('/boms').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/items').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/locations').catch(() => ({ data: { data: [] } }))
      ]);
      setBoms(bomRes.data.data || []);
      setItems(itemRes.data.data || []);
      setLocations(locRes.data.data || []);
    } catch (error) {
      console.error("Failed to load BOM data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssemble = async (e) => {
    e.preventDefault();
    try {
      await api.post('/boms/assemble', assembleForm);
      alert(`Successfully assembled ${assembleForm.buildQuantity} units! Inventory updated.`);
      setAssembleForm({ ...assembleForm, buildQuantity: 1 });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to assemble kit. Check raw material stock levels.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      <div className="border-b pb-4">
        <h1 className="text-3xl font-light text-gray-900">Kitting & Bill of Materials</h1>
        <p className="text-sm text-gray-500 mt-1">Manage manufacturing recipes and assemble finished goods.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Assemble Kit Action Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 p-6 rounded-xl border shadow-lg text-white">
            <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
              <span>⚙️</span> Assemble Kit
            </h2>
            <form onSubmit={handleAssemble} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-300">Select Recipe (BOM)</label>
                <select 
                  required className="mt-1 w-full bg-gray-800 border-gray-700 rounded-lg shadow-sm text-white focus:ring-blue-500"
                  value={assembleForm.bomId} onChange={(e) => setAssembleForm({...assembleForm, bomId: e.target.value})}
                >
                  <option value="">Choose...</option>
                  {boms.map(bom => <option key={bom._id} value={bom._id}>{bom.name} ({bom.finishedGood?.name})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Build Quantity</label>
                <input 
                  type="number" min="1" required
                  className="mt-1 w-full bg-gray-800 border-gray-700 rounded-lg shadow-sm text-white font-bold text-center text-lg"
                  value={assembleForm.buildQuantity} onChange={(e) => setAssembleForm({...assembleForm, buildQuantity: Number(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Draw Raw Materials From:</label>
                <select 
                  required className="mt-1 w-full bg-gray-800 border-gray-700 rounded-lg shadow-sm text-white"
                  value={assembleForm.sourceLocationId} onChange={(e) => setAssembleForm({...assembleForm, sourceLocationId: e.target.value})}
                >
                  <option value="">Choose Location...</option>
                  {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Store Finished Goods In:</label>
                <select 
                  required className="mt-1 w-full bg-gray-800 border-gray-700 rounded-lg shadow-sm text-white"
                  value={assembleForm.destinationLocationId} onChange={(e) => setAssembleForm({...assembleForm, destinationLocationId: e.target.value})}
                >
                  <option value="">Choose Location...</option>
                  {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold uppercase tracking-wide transition-colors mt-4">
                Execute Assembly
              </button>
            </form>
          </div>
        </div>

        {/* Existing BOM Recipes List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Active BOM Recipes</h2>
              {/* In a complete app, this button opens a modal to create a new BOM */}
              <button className="text-sm font-medium text-blue-600 hover:text-blue-800">+ New Recipe</button>
            </div>
            
            <div className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading recipes...</div>
              ) : boms.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No BOMs have been created yet.</div>
              ) : (
                <div className="divide-y">
                  {boms.map((bom) => (
                    <div key={bom._id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{bom.name}</h3>
                          <p className="text-sm text-gray-500">Creates: <span className="font-medium text-blue-600">{bom.finishedGood?.name}</span> ({bom.finishedGood?.sku})</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${bom.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {bom.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Required Components (Per 1 Unit)</h4>
                        <ul className="space-y-2">
                          {bom.components.map((comp, idx) => (
                            <li key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700">{comp.item?.name} <span className="text-gray-400 font-mono text-xs">({comp.item?.sku})</span></span>
                              <span className="font-bold text-gray-900">{comp.quantityRequired} <span className="font-normal text-gray-500 text-xs">{comp.item?.baseUnit}</span></span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}