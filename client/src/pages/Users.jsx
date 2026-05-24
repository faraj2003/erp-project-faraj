import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import { toast } from 'sonner';
import { Users as UsersIcon, Shield, MapPin, Mail, UserPlus } from 'lucide-react';

export default function Users() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'staff', locationId: '', 
  });

  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['users'], queryFn: async () => (await axios.get('/api/users')).data });
  const { data: locations, isLoading: locationsLoading } = useQuery({ queryKey: ['locations'], queryFn: async () => (await axios.get('/api/locations')).data });

  const createUser = useMutation({
    mutationFn: async (newUser) => (await axios.post('/api/users', newUser)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setFormData({ name: '', email: '', password: '', role: 'staff', locationId: '' });
      toast.success('Team Member Added', { description: 'User account has been provisioned successfully.' });
    },
    onError: (error) => {
      toast.error('Creation Failed', { description: error.response?.data?.message || "Failed to create user" });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.locationId) delete payload.locationId; 
    createUser.mutate(payload);
  };

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  if (usersLoading || locationsLoading) return <div className="p-10 text-center font-medium text-gray-400 animate-pulse">Loading team data...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
          <UsersIcon className="text-blue-600" size={32} /> Manage Team Members
        </h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Provision accounts and manage role-based access</p>
      </div>

      {/* ── CREATE USER FORM ── */}
      <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-200/60 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-end">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} className="input" placeholder="Jane Doe" required />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="input pl-9" placeholder="jane@company.com" required />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Temporary Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} className="input tracking-widest" placeholder="••••••••" required />
        </div>
        
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Assigned Role</label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select name="role" value={formData.role} onChange={handleChange} className="input pl-9 cursor-pointer font-medium text-gray-700">
              <option value="staff">General Staff</option>
              <option value="manager">System Manager</option>
              <option value="admin">System Admin</option>
              <option value="shop_manager">Shop Manager</option>
              <option value="shop_worker">Shop Worker</option>
              <option value="procurement_manager">Procurement Manager</option>
              <option value="dispatch_manager">Dispatch Manager</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Primary Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select name="locationId" value={formData.locationId} onChange={handleChange} className="input pl-9 cursor-pointer font-medium text-gray-700">
              <option value="">Global / Office (No Location)</option>
              {locations?.map((loc) => <option key={loc._id} value={loc._id}>{loc.name} ({loc.type})</option>)}
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 shadow-blue-500/30" disabled={createUser.isPending}>
          {createUser.isPending ? 'Provisioning...' : <><UserPlus size={18} /> Create Member</>}
        </button>
      </form>

      {/* ── USERS TABLE ── */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200/60">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Role Level</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Facility Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {users?.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-medium">No users found.</td></tr>
              ) : users?.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-gray-900 font-bold">{user.name}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                      user.role.includes('manager') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.locationId ? (
                      <span className="font-semibold text-gray-700 flex items-center gap-1.5"><MapPin size={14} className="text-gray-400"/> {user.locationId.name}</span>
                    ) : (
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Global</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}