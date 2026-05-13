import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "../lib/axios";

const TransactionLedger = () => {
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

  // ✅ Switched to React Query so it can be refreshed from the outside!
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await axios.get("/api/inventory/transactions");
      return res.data.data;
    }
  });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === "itemName") {
      aValue = a.itemId?.name || "";
      bValue = b.itemId?.name || "";
    } else if (sortConfig.key === "userName") {
      aValue = a.performedBy?.name || "";
      bValue = b.performedBy?.name || "";
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const getBadgeColor = (type) => {
    switch (type) {
      case "addition": return "bg-green-100 text-green-800";
      case "deduction": return "bg-red-100 text-red-800";
      case "transfer": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) return <div className="p-4 text-gray-500">Loading ledger...</div>;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Inventory Ledger</h3>
        <p className="text-sm text-gray-500">Immutable transaction log of all stock movements.</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            <tr>
              <th onClick={() => handleSort("createdAt")} className="px-6 py-3 cursor-pointer hover:bg-gray-200 transition">
                Date {sortConfig.key === "createdAt" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-6 py-3">Type</th>
              <th onClick={() => handleSort("itemName")} className="px-6 py-3 cursor-pointer hover:bg-gray-200 transition">
                Item
              </th>
              <th onClick={() => handleSort("batchNumber")} className="px-6 py-3 cursor-pointer hover:bg-gray-200 transition">
                Batch No {sortConfig.key === "batchNumber" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-6 py-3">Qty Changed</th>
              <th onClick={() => handleSort("userName")} className="px-6 py-3 cursor-pointer hover:bg-gray-200 transition">
                Performed By
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No transactions found.</td>
              </tr>
            ) : (
              sortedTransactions.map((txn) => (
                <tr key={txn._id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {new Date(txn.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getBadgeColor(txn.type)}`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold">{txn.itemId?.sku}</div>
                    <div className="text-xs text-gray-500">{txn.itemId?.name}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{txn.batchNumber || "N/A"}</td>
                  <td className="px-6 py-4 font-semibold">
                    {txn.type === "deduction" ? "-" : "+"}{txn.quantityChanged}
                  </td>
                  <td className="px-6 py-4">{txn.performedBy?.name || "System"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionLedger;