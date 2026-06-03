// client/src/components/TransactionLedger.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
// 1. FIXED IMPORTS FOR VITE
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { FileDown, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function TransactionLedger() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await axios.get('/api/inventory/transactions');
      return res.data.data;
    }
  });

  const exportToPDF = () => {
    if (!transactions || transactions.length === 0) {
      return toast.error("No data to export");
    }

    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("Inventory Transaction Ledger", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      const tableColumn = ["Date", "Type", "Item Name", "Qty", "Performed By", "Location"];
      
      // 2. ADDED BULLETPROOF SAFE-CHECKS
      const tableRows = transactions.map(tx => [
        tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A',
        tx.type ? tx.type.toUpperCase() : 'UNKNOWN',
        tx.itemId?.name || 'Unknown Item',
        tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity || 0,
        tx.userId?.name || 'System',
        tx.locationId?.name || 'Global'
      ]);

      // 3. FIXED AUTOTABLE FUNCTION CALL
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      doc.save(`Transaction_Ledger_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF Exported Successfully");
      
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to generate PDF. Check console.");
    }
  };

  const filteredTransactions = transactions?.filter(tx => 
    tx.itemId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="p-8 text-center animate-pulse text-gray-500 font-medium">Loading ledger data...</div>;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200/60 p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800">Transaction History</h2>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search item or type..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <FileDown size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200/60">
              <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
              <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Type</th>
              <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Item</th>
              <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Qty</th>
              <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/80">
            {filteredTransactions?.length === 0 ? (
              <tr><td colSpan="5" className="p-6 text-center text-gray-500">No transactions found.</td></tr>
            ) : filteredTransactions?.map((tx) => (
              <tr key={tx._id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-600 font-medium">{new Date(tx.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    tx.type === 'receipt' ? 'bg-green-100 text-green-700' : 
                    tx.type === 'dispatch' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-800">{tx.itemId?.name || 'Unknown'}</td>
                <td className={`px-4 py-3 text-sm font-black ${tx.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-medium">{tx.userId?.name || 'System'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}