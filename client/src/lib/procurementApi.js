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

export const fetchRejectedGRNs = async () => {
  const response = await axios.get("/api/procurement/grn/rejections");
  return response.data;
};

export const fetchReturns = async () => {
  const response = await axios.get("/api/procurement/rtv");
  return response.data;
};

export const createReturn = async (returnData) => {
  const response = await axios.post("/api/procurement/rtv", returnData);
  return response.data;
};

export const fetchAllGRNs = async () => {
  const response = await axios.get("/api/procurement/grn");
  return response.data;
};

export const fetchInvoices = async () => {
  const response = await axios.get("/api/procurement/invoice");
  return response.data;
};

export const submitInvoice = async (invoiceData) => {
  const response = await axios.post("/api/procurement/invoice", invoiceData);
  return response.data;
};

export const fetchProcurementItems = async () => {
  const response = await axios.get("/api/procurement/items");
  return response.data;
};

export const fetchRFQs = async () => {
  const response = await axios.get("/api/procurement/rfq");
  return response.data;
};

export const createRFQ = async (data) => {
  const response = await axios.post("/api/procurement/rfq", data);
  return response.data;
};

export const submitSupplierBid = async (data) => {
  const response = await axios.post("/api/procurement/rfq/bid", data);
  return response.data;
};

export const awardBid = async (rfqId, bidId) => {
  const response = await axios.put("/api/procurement/rfq/award", {
    rfqId,
    bidId,
  });
  return response.data;
};
