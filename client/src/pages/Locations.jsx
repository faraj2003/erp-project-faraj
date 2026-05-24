import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import { toast } from 'sonner';
import { MapPin, Plus, Building2, Layers, Server, X } from 'lucide-react';

export default function Locations() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('Warehouse');

  const [zoneModalConfig, setZoneModalConfig] = useState(null); 
  const [rackModalConfig, setRackModalConfig] = useState(null); 
  const [inputName, setInputName] = useState('');

  const { data: locations, isLoading } = useQuery({ queryKey: ['locations'], queryFn: async () => (await axios.get('/api/locations')).data });

  const createLocation = useMutation({
    mutationFn: async (newLocation) => (await axios.post('/api/locations', newLocation)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setName('');
      toast.success('Facility Created', { description: 'New location has been added to the network.' });
    },
    onError: () => toast.error('Creation Failed')
  });

  const addZoneMutation = useMutation({
    mutationFn: async ({ locationId, name }) => await axios.post(`/api/locations/${locationId}/zones`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setZoneModalConfig(null); setInputName('');
      toast.success('Zone Added');
    }
  });

  const addRackMutation = useMutation({
    mutationFn: async ({ locationId, zoneId, name }) => await axios.post(`/api/locations/${locationId}/zones/${zoneId}/racks`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setRackModalConfig(null); setInputName('');
      toast.success('Rack Added');
    }
  });

  const handleCreateLocation = (e) => { e.preventDefault(); if (name) createLocation.mutate({ name, type }); };
  const handleAddZone = (e) => { e.preventDefault(); if (inputName) addZoneMutation.mutate({ locationId: zoneModalConfig.locationId, name: inputName }); };
  const handleAddRack = (e) => { e.preventDefault(); if (inputName) addRackMutation.mutate({ locationId: rackModalConfig.locationId, zoneId: rackModalConfig.zoneId, name: inputName }); };

  if (isLoading) return <div className="p-10 text-center font-medium text-gray-400 animate-pulse">Loading facility network...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
          <Building2 className="text-blue-600" size={32} /> Facility Network
        </h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Manage physical warehouses, shops, and storage zones</p>
      </div>

      {/* ── CREATE LOCATION FORM ── */}
      <form onSubmit={handleCreateLocation} className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 mb-8 flex flex-col sm:flex-row gap-4 sm:items-end">
        <div className="flex-1">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">New Facility Name</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" className="input pl-9" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Northside Warehouse" required />
          </div>
        </div>
        <div className="w-full sm:w-56">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Facility Type</label>
          <select className="input cursor-pointer font-medium" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Warehouse">Warehouse</option>
            <option value="Shop">Shop Floor</option>
            <option value="Scrap">Scrap Yard</option>
          </select>
        </div>
        <button type="submit" className="btn-primary flex items-center justify-center gap-2 shadow-blue-500/30" disabled={createLocation.isPending}>
          {createLocation.isPending ? 'Adding...' : <><Plus size={18} /> Create Facility</>}
        </button>
      </form>

      {/* ── LOCATIONS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {locations?.map((loc) => (
          <div key={loc._id} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">{loc.name}</h2>
                <span className={`inline-block mt-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  loc.type === 'Warehouse' ? 'bg-blue-100 text-blue-700' : loc.type === 'Shop' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}>{loc.type}</span>
              </div>
              <button 
                onClick={() => { setInputName(''); setZoneModalConfig({ locationId: loc._id, locationName: loc.name }); }}
                className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs border-gray-200"
              >
                <Plus size={14} /> Add Zone
              </button>
            </div>

            <div className="p-5 flex-1">
              {loc.zones?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 py-6">
                  <Layers size={32} className="mb-2" />
                  <p className="text-sm font-medium">No zones configured.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loc.zones.map(zone => (
                    <div key={zone._id} className="bg-gray-50/50 border border-gray-200/60 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Layers size={16} className="text-gray-400" /> {zone.name}
                        </h3>
                        <button 
                          onClick={() => { setInputName(''); setRackModalConfig({ locationId: loc._id, zoneId: zone._id, zoneName: zone.name }); }}
                          className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                          <Plus size={12} strokeWidth={3} /> Add Rack
                        </button>
                      </div>
                      
                      {zone.racks?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {zone.racks.map(rack => (
                            <span key={rack._id} className="bg-white border border-gray-200 shadow-sm text-gray-600 text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                              <Server size={12} className="text-gray-400" /> {rack.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Empty Zone</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── ADD ZONE MODAL ── */}
      {zoneModalConfig && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Add Zone</h2>
              <button onClick={() => setZoneModalConfig(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"><X size={16} /></button>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-5">Creating a zone in <span className="font-bold text-gray-800">{zoneModalConfig.locationName}</span>.</p>
            <form onSubmit={handleAddZone}>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Zone Name</label>
              <input type="text" autoFocus className="input mb-6" placeholder="e.g. Cold Storage" value={inputName} onChange={(e) => setInputName(e.target.value)} required />
              <button type="submit" disabled={addZoneMutation.isPending} className="btn-primary w-full bg-blue-600 hover:bg-blue-700 border-0">{addZoneMutation.isPending ? 'Saving...' : 'Save Zone'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD RACK MODAL ── */}
      {rackModalConfig && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Add Rack</h2>
              <button onClick={() => setRackModalConfig(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1"><X size={16} /></button>
            </div>
            <p className="text-xs font-medium text-gray-500 mb-5">Creating rack in <span className="font-bold text-gray-800">{rackModalConfig.zoneName}</span>.</p>
            <form onSubmit={handleAddRack}>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Rack/Shelf Name</label>
              <input type="text" autoFocus className="input mb-6" placeholder="e.g. Shelf A-1" value={inputName} onChange={(e) => setInputName(e.target.value)} required />
              <button type="submit" disabled={addRackMutation.isPending} className="btn-primary w-full bg-blue-600 hover:bg-blue-700 border-0">{addRackMutation.isPending ? 'Saving...' : 'Save Rack'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}