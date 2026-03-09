// schemas/inventory.schema.js
const { z } = require("zod");

const createItemSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU is required")
    .regex(/^[A-Z0-9-]+$/, "SKU must be uppercase alphanumeric with dashes"),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["raw_material", "finished_good"], {
    errorMap: () => ({ message: "Type must be 'raw_material' or 'finished_good'" }),
  }),
  currentStock: z.number().min(0, "Stock cannot be negative").optional(),
  minStockLevel: z.number().min(0, "Minimum stock level cannot be negative"),
  unit: z.string().min(1, "Unit is required (e.g. kg, units, liters)"),
});

module.exports = { createItemSchema };
