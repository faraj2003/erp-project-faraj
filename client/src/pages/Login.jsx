import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Factory, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/axios'; // Added the API import

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await api.post('/api/auth/login', { email, password });
      
      // FIX: The backend puts everything directly inside response.data.data
      // We pull out the token, and the rest of the object IS the userData
      const { token, ...userData } = response.data.data;

      // Save to Zustand global store
      login(userData, token);
      
      toast.success('Authentication successful', {
        description: `Welcome back, ${userData.name}`,
      });
      
      navigate('/dashboard');
    } catch (error) {
      toast.error('Access Denied', {
        description: error.response?.data?.message || 'Invalid email or password.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 relative overflow-hidden transition-colors duration-300">
      
      {/* Ambient Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[50%] h-[60%] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[120px]" />
      </div>

      {/* Glassmorphism Login Card */}
      <div className="relative z-10 w-full max-w-[420px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/60 dark:border-gray-800 shadow-2xl rounded-[2rem] p-8 sm:p-10">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30 mb-5 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <Factory size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">FactoryFlow</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 text-center">Secure access to the production ERP</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="email"
                required
                className="input pl-11 py-3.5 bg-white/50 dark:bg-gray-950/50 focus:bg-white dark:focus:bg-gray-900 transition-colors w-full font-medium"
                placeholder="operator@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="password"
                required
                className="input pl-11 py-3.5 bg-white/50 dark:bg-gray-950/50 focus:bg-white dark:focus:bg-gray-900 transition-colors w-full font-medium tracking-widest"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 mt-4 border-0"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Authorize <ArrowRight size={18} strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
            Internal Systems • Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}