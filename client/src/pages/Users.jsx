import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';

export default function Users() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    locationId: '', 
  });

  // Fetch all Users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get('/api/users');
      return data;
    },
  });

  // Fetch all Locations for the dropdown
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await axios.get('/api/locations');
      return data;
    },
  });

  // Create User Mutation
  const createUser = useMutation({
    mutationFn: async (newUser) => {
      const { data } = await axios.post('/api/users', newUser);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Reset form on success
      setFormData({ name: '', email: '', password: '', role: 'staff', locationId: '' });
    },
    onError: (error) => {
      alert(error.response?.data?.message || "Failed to create user");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    
    // If the user left it as "-- No Location --", remove it so Mongoose sets it to null
    if (!payload.locationId) {
      delete payload.locationId; 
    }
    
    createUser.mutate(payload);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (usersLoading || locationsLoading) return <div className="p-4 text-gray-600">Loading data...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Manage Team Members</h1>

      {/* CREATE USER FORM */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        
        {/* ROLE DROPDOWN */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Role</label>
          <select name="role" value={formData.role} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-blue-500 focus:border-blue-500">
            <option value="staff">General Staff</option>
            <option value="manager">System Manager</option>
            <option value="admin">System Admin</option>
            <option value="shop_manager">Shop Manager</option>
            <option value="shop_worker">Shop Worker</option>
            <option value="procurement_manager">Procurement Manager</option>
            <option value="dispatch_manager">Dispatch Manager</option>
          </select>
        </div>

        {/* LOCATION DROPDOWN */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Location</label>
          <select name="locationId" value={formData.locationId} onChange={handleChange} className="w-full border border-gray-300 p-2 rounded focus:ring-blue-500 focus:border-blue-500">
            <option value="">-- No Location (Global / Office) --</option>
            {locations?.map((loc) => (
              <option key={loc._id} value={loc._id}>
                {loc.name} ({loc.type})
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="bg-blue-600 text-white font-medium px-4 py-2 rounded hover:bg-blue-700 transition-colors w-full h-[42px]" disabled={createUser.isLoading}>
          {createUser.isLoading ? 'Creating...' : 'Create Team Member'}
        </button>
      </form>

      {/* USERS TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600">Name</th>
              <th className="p-4 font-semibold text-gray-600">Email</th>
              <th className="p-4 font-semibold text-gray-600">Role</th>
              <th className="p-4 font-semibold text-gray-600">Location</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-4 text-gray-800 font-medium">{user.name}</td>
                <td className="p-4 text-gray-600">{user.email}</td>
                <td className="p-4">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded capitalize font-medium">
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4">
                  {user.locationId ? (
                    <span className="font-medium text-gray-700">{user.locationId.name}</span>
                  ) : (
                    <span className="text-gray-400 italic">Global</span>
                  )}
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}