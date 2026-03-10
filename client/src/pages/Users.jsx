// src/pages/Users.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

// ── Zod Schema for New User ──
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['staff', 'manager', 'admin'], { errorMap: () => ({ message: 'Select a valid role' }) }),
});

// ── API Fetchers ──
const fetchUsers = async () => {
  const { data } = await api.get('/api/users');
  return data.data; // Assumes your API returns { success: true, data: [...] }
};

const createUserAPI = async (body) => {
  const { data } = await api.post('/api/users', body);
  return data.data;
};

const updateUserRoleAPI = async ({ id, role }) => {
  const { data } = await api.patch(`/api/users/${id}/role`, { role });
  return data.data;
};

// ── Subcomponents ──
const RoleBadge = ({ role }) => {
  const styles = {
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    staff: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${styles[role] || styles.staff}`}>
      {role}
    </span>
  );
};

// ── Add User Modal ──
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
    mutationFn: createUserAPI,
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
            {mutation.error?.response?.data?.error || 'Failed to create user. Email might be taken.'}
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

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Temporary Password *</label>
            <input type="password" {...register('password')} placeholder="••••••••" className="input" />
            {errors.password && <p className="err">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">System Role *</label>
            <select {...register('role')} className="input">
              <option value="staff">Staff (Limited Access)</option>
              <option value="manager">Manager (Operations Access)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
            {errors.role && <p className="err">{errors.role.message}</p>}
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
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore(); // So we can prevent the admin from demoting themselves

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const roleMutation = useMutation({
    mutationFn: updateUserRoleAPI,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => alert(err?.response?.data?.error || 'Failed to update role'),
  });

  const handleRoleChange = (userId, newRole) => {
    if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      roleMutation.mutate({ id: userId, role: newRole });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white transition-colors duration-200">User Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-colors duration-200">
            {users.length} registered user{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Add User
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors duration-200">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500 text-sm animate-pulse">Loading directory...</div>
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
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-left transition-colors duration-200">
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Role</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Update Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => {
                const isSelf = u._id === currentUser?._id;

                return (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150">
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                      {u.name} {isSelf && <span className="ml-2 text-xs text-gray-400 font-normal">(You)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        disabled={isSelf || roleMutation.isPending}
                        className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <AddUserModal onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default Users;