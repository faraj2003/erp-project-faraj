import axios from "./axios"; // Uses your existing configured axios instance

// --- Supplier Endpoints ---
export const fetchSuppliers = async () => {
  const response = await axios.get("/api/procurement/suppliers");
  return response.data;
};

export const createSupplier = async (supplierData) => {
  const response = await axios.post("/api/procurement/suppliers", supplierData);
  return response.data;
};

// --- Purchase Order Endpoints ---
export const fetchPOs = async () => {
  const response = await axios.get("/api/procurement/po");
  return response.data;
};

export const createPO = async (poData) => {
  const response = await axios.post("/api/procurement/po", poData);
  return response.data;
};

// Manager Approval - Point 5
export const approvePO = async (poId) => {
  const response = await axios.put(`/api/procurement/po/${poId}/approve`);
  return response.data;
};

// --- Goods Receipt (Truck Entry) - Points 2 & 6 ---
export const submitGRN = async (grnData) => {
  const response = await axios.post("/api/procurement/grn", grnData);
  return response.data;
};

export const fetchProcurementStats = async () => {
  const response = await axios.get("/api/procurement/stats");
  return response.data;
};

export const sendCustomAlert = async (alertData) => {
  const response = await axios.post("/api/procurement/alert", alertData);
  return response.data;
};
