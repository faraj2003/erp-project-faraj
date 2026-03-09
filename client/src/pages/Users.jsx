// src/pages/Users.jsx
// Admin-only user directory with role promotion/demotion and user creation.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

// ── Zod schema for new user ──
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['staff', 'manager', 'admin']),
});

// ── API ──
const fetchUsers = async (role) => {
  const params = role ? `?role=${role}` : '';
  const { data } = await api.get(`/api/users${params}`);
  return data.data;
};

const updateRole = async ({ id, role }) => {
  const { data } = await api.patch(`/api/users/${id}/role`, { role });
  return data.data;
};

const createUser = async (body) => {
  const { data } = await api.post('/api/users', body);
  return data.data;
};

// ── Role badge ──
const roleBadge = {
  admin:   'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  staff:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

const RoleBadge = ({ role }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize transition-colors duration-200 ${roleBadge[role] || 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
    {role}
  </span>
);

// ── Role dropdown ──
const RoleDropdown = ({ user, currentUserId }) => {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(user.role);
  const isSelf = user._id === currentUserId;

  const mutation = useMutation({
    mutationFn: updateRole,
    onSuccess: (updated) => {
      setValue(updated.role);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => alert(err?.response?.data?.error || 'Failed to update role'),
  });

  const handleChange = (e) => {
    const newRole = e.target.value;
    if (newRole === value) return;
    if (window.confirm(`Change ${user.name}'s role to "${newRole}"?`)) {
      setValue(newRole);
      mutation.mutate({ id: user._id, role: newRole });
    }
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={isSelf || mutation.isPending}
      title={isSelf ? "You can't change your own role" : ''}
      className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
    >
      <option value="staff">Staff</option>
      <option value="manager">Manager</option>
      <option value="admin">Admin</option>
    </select>
  );
};

// ── NEW: Add User Modal ──
const AddUserModal = ({ onClose }) => {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ 
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'staff' }
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-transparent dark:border-gray-700 transition-colors">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Add New User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none transition-colors">✕</button>
        </div>

        {mutation.isError && (
          <div className="mb-4 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg transition-colors">
            {mutation.error?.response?.data?.error || 'Failed to create user'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Full Name *</label>
            <input {...register('name')} placeholder="Jane Doe" className="input" />
            {errors.name && <p className="err">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Email Address *</label>
            <input type="email" {...register('email')} placeholder="jane@factoryflow.com" className="input" />
            {errors.email && <p className="err">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Temporary Password *</label>
              <input type="password" {...register('password')} placeholder="••••••••" className="input" />
              {errors.password && <p className="err">{errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Initial Role *</label>
              <select {...register('role')} className="input">
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role && <p className="err">{errors.role.message}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="flex-1 btn-primary">
              {mutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ──
const Users = () => {
  const [roleFilter, setRoleFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false); // ── NEW STATE ──
  const { user: currentUser } = useAuthStore();

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => fetchUsers(roleFilter),
  });

  // Stats
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    managers: users.filter((u) => u.role === 'manager').length,
    staff: users.filter((u) => u.role === 'staff').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white transition-colors">User Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-colors">View and manage system user roles</p>
        </div>
        
        {/* ── NEW: Add User Button ── */}
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          + Add User
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats.total, color: 'border-l-gray-400' },
          { label: 'Admins', value: stats.admins, color: 'border-l-purple-500' },
          { label: 'Managers', value: stats.managers, color: 'border-l-blue-500' },
          { label: 'Staff', value: stats.staff, color: 'border-l-green-500' },
        ].map((s) => (
          <div key={s.label} className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${s.color} p-4 shadow-sm transition-colors duration-200`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1 transition-colors">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input max-w-[180px]"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors duration-200">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-sm animate-pulse">Loading users...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500 dark:text-red-400 text-sm">Failed to load users.</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No users found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-left transition-colors">
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Role</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((user) => (
                <tr
                  key={user._id}
                  className={`transition-colors duration-150 ${
                    user._id === currentUser?._id 
                      ? 'bg-blue-50/50 dark:bg-blue-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200 transition-colors">{user.name}</p>
                        {user._id === currentUser?._id && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">You</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{user.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs transition-colors">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <RoleDropdown user={user} currentUserId={currentUser?._id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── NEW: Render Modal ── */}
      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
};

export default Users;