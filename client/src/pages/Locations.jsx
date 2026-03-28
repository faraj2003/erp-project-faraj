// src/pages/Locations.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';

export default function Locations() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('Warehouse');

  // Modals state
  const [zoneModalConfig, setZoneModalConfig] = useState(null); // { locationId, locationName }
  const [rackModalConfig, setRackModalConfig] = useState(null); // { locationId, zoneId, zoneName }
  const [inputName, setInputName] = useState('');

  // Fetch Locations
  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await axios.get('/api/locations');
      return data;
    },
  });

  // Create Location
  const createLocation = useMutation({
    mutationFn: async (newLocation) => {
      const { data } = await axios.post('/api/locations', newLocation);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setName('');
    },
  });

  // Add Zone
  const addZoneMutation = useMutation({
    mutationFn: async ({ locationId, name }) => {
      await axios.post(`/api/locations/${locationId}/zones`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setZoneModalConfig(null);
      setInputName('');
    },
  });

  // Add Rack
  const addRackMutation = useMutation({
    mutationFn: async ({ locationId, zoneId, name }) => {
      await axios.post(`/api/locations/${locationId}/zones/${zoneId}/racks`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setRackModalConfig(null);
      setInputName('');
    },
  });

  const handleCreateLocation = (e) => {
    e.preventDefault();
    if (!name) return;
    createLocation.mutate({ name, type });
  };

  const handleAddZone = (e) => {
    e.preventDefault();
    if (!inputName) return;
    addZoneMutation.mutate({ locationId: zoneModalConfig.locationId, name: inputName });
  };

  const handleAddRack = (e) => {
    e.preventDefault();
    if (!inputName) return;
    addRackMutation.mutate({ locationId: rackModalConfig.locationId, zoneId: rackModalConfig.zoneId, name: inputName });
  };

  if (isLoading) return <div className="p-6 text-gray-500">Loading locations...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Facility & Location Manager</h1>

      {/* Form to create a Location */}
      <form onSubmit={handleCreateLocation} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-sm font-bold text-gray-700 mb-1">New Facility Name</label>
          <input type="text" className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Northside Warehouse" required />
        </div>
        <div className="w-48">
          <label className="block text-sm font-bold text-gray-700 mb-1">Facility Type</label>
          <select className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Warehouse">Warehouse</option>
            <option value="Shop">Shop</option>
            <option value="Scrap">Scrap Yard</option>
          </select>
        </div>
        <button type="submit" className="bg-blue-600 text-white font-medium px-6 py-2 rounded-md hover:bg-blue-700 transition" disabled={createLocation.isPending}>
          {createLocation.isPending ? 'Adding...' : 'Create Facility'}
        </button>
      </form>

      {/* List of Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {locations?.map((loc) => (
          <div key={loc._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className={`p-4 border-b border-gray-200 flex justify-between items-center ${
              loc.type === 'Warehouse' ? 'bg-blue-50' : loc.type === 'Shop' ? 'bg-green-50' : 'bg-orange-50'
            }`}>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{loc.name}</h2>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                  loc.type === 'Warehouse' ? 'bg-blue-200 text-blue-800' : loc.type === 'Shop' ? 'bg-green-200 text-green-800' : 'bg-orange-200 text-orange-800'
                }`}>{loc.type}</span>
              </div>
              <button 
                onClick={() => { setInputName(''); setZoneModalConfig({ locationId: loc._id, locationName: loc.name }); }}
                className="text-sm font-medium bg-white border border-gray-300 px-3 py-1.5 rounded shadow-sm hover:bg-gray-50"
              >
                + Add Zone
              </button>
            </div>

            {/* Zones & Racks */}
            <div className="p-4 flex-1 bg-gray-50/50">
              {loc.zones?.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">No zones configured yet.</p>
              ) : (
                <div className="space-y-4">
                  {loc.zones.map(zone => (
                    <div key={zone._id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                          <span className="text-gray-400">📍</span> {zone.name}
                        </h3>
                        <button 
                          onClick={() => { setInputName(''); setRackModalConfig({ locationId: loc._id, zoneId: zone._id, zoneName: zone.name }); }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Add Rack
                        </button>
                      </div>
                      
                      {zone.racks?.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {zone.racks.map(rack => (
                            <span key={rack._id} className="bg-gray-100 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded flex items-center gap-1">
                              🗄️ {rack.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">No racks in this zone</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- ADD ZONE MODAL --- */}
      {zoneModalConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold mb-2">Add Zone to {zoneModalConfig.locationName}</h2>
            <p className="text-xs text-gray-500 mb-4">Zones help you divide a facility (e.g., "Cold Storage", "Aisle 1").</p>
            <form onSubmit={handleAddZone}>
              <input type="text" autoFocus className="w-full border border-gray-300 rounded p-2 mb-4" placeholder="Zone Name" value={inputName} onChange={(e) => setInputName(e.target.value)} required />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setZoneModalConfig(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Cancel</button>
                <button type="submit" disabled={addZoneMutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">{addZoneMutation.isPending ? 'Saving...' : 'Save Zone'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD RACK MODAL --- */}
      {rackModalConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold mb-2">Add Rack to {rackModalConfig.zoneName}</h2>
            <p className="text-xs text-gray-500 mb-4">Racks/Shelves define the exact placement inside a zone.</p>
            <form onSubmit={handleAddRack}>
              <input type="text" autoFocus className="w-full border border-gray-300 rounded p-2 mb-4" placeholder="Rack Name (e.g. Shelf A-1)" value={inputName} onChange={(e) => setInputName(e.target.value)} required />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setRackModalConfig(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Cancel</button>
                <button type="submit" disabled={addRackMutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">{addRackMutation.isPending ? 'Saving...' : 'Save Rack'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}