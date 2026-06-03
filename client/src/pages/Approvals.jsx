// client/src/pages/Approvals.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { CheckCircle, XCircle, AlertTriangle, Clock, ShieldAlert, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function Approvals() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // State for the review modal
  const [activeReview, setActiveReview] = useState(null); // { adjustment: object, action: 'approve' | 'reject' }
  const [reviewNotes, setReviewNotes] = useState('');

  // 1. Fetch Pending Adjustments
  const { data: adjustments, isLoading } = useQuery({
    queryKey: ['adjustments', 'pending'],
    queryFn: async () => {
      const res = await axios.get('/api/inventory/adjustments');
      // Filter strictly for pending to keep the inbox clean
      return res.data.filter(adj => adj.status === 'pending');
    }
  });

  // 2. Review Mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      return axios.patch(`/api/inventory/adjustments/${id}/review`, payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(res.data.message);
      setActiveReview(null);
      setReviewNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to process review.");
    }
  });

  const submitReview = (e) => {
    e.preventDefault();
    if (!activeReview) return;
    
    reviewMutation.mutate({
      id: activeReview.adjustment._id,
      payload: {
        action: activeReview.action,
        reviewNotes
      }
    });
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500 font-medium animate-pulse">Loading Approval Inbox...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Approvals Inbox</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Review and authorize pending inventory adjustments.</p>
      </div>

      {adjustments?.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/60 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800">You're all caught up!</h3>
          <p className="text-gray-500 mt-2">There are no pending adjustments requiring your approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adjustments?.map((adj) => {
            const isTier3 = adj.requiredApprovalLevel === 'admin';
            const canApprove = isAdmin || !isTier3;

            return (
              <div key={adj._id} className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border p-6 flex flex-col relative overflow-hidden transition-all hover:shadow-lg ${isTier3 ? 'border-red-200' : 'border-gray-200/60'}`}>
                {/* Visual Indicator for Tier */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${isTier3 ? 'bg-red-500' : 'bg-amber-400'}`} />

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 ${isTier3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isTier3 ? <ShieldAlert size={12}/> : <Clock size={12}/>}
                      {isTier3 ? 'Tier 3: Admin Req' : 'Tier 2: Manager Req'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{adj.itemId?.name}</h3>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">{adj.itemId?.sku}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100 flex-grow">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adjustment</p>
                      <p className={`text-xl font-black ${adj.quantityChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {adj.quantityChange > 0 ? `+${adj.quantityChange}` : adj.quantityChange} <span className="text-xs text-gray-500">{adj.itemId?.baseUnit}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Financial Impact</p>
                      <p className="text-xl font-black text-gray-800">${(adj.totalValueImpact || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><FileText size={12}/> Reason</p>
                    <p className="text-sm font-medium text-gray-700 italic">"{adj.reason}"</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Requested by <span className="font-bold text-gray-700">{adj.requestedBy?.name}</span> • {adj.locationId?.name}</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-auto">
                  <button 
                    onClick={() => setActiveReview({ adjustment: adj, action: 'reject' })}
                    className="flex-1 bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={16}/> Reject
                  </button>
                  
                  {canApprove ? (
                    <button 
                      onClick={() => setActiveReview({ adjustment: adj, action: 'approve' })}
                      className="flex-1 bg-green-600 text-white hover:bg-green-700 shadow-green-500/30 shadow-sm py-2 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={16}/> Approve
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs font-bold text-red-400 bg-red-50 rounded-lg border border-red-100 cursor-not-allowed text-center px-2">
                      Admin Access Required
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── REVIEW MODAL ── */}
      {activeReview && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-4">
              {activeReview.action === 'approve' ? (
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><CheckCircle size={20}/></div>
              ) : (
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><XCircle size={20}/></div>
              )}
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  {activeReview.action === 'approve' ? 'Confirm Approval' : 'Reject Adjustment'}
                </h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{activeReview.adjustment.itemId?.name}</p>
              </div>
            </div>

            <form onSubmit={submitReview}>
              <div className="mb-6">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Review Notes (Optional)</label>
                <textarea 
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  rows="3"
                  placeholder="Add any comments or reasons for your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                ></textarea>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setActiveReview(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={reviewMutation.isLoading}
                  className={`flex-1 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors ${
                    activeReview.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewMutation.isLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}