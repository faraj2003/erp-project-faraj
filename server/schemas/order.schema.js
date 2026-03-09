// schemas/order.schema.js
const { z } = require("zod");

// Reusable ObjectId string validator
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId format");

const createOrderSchema = z.object({
  orderNumber: z
    .string()
    .min(1, "Order number is required")
    .regex(
      /^[A-Z0-9-]+$/,
      "Order number must be uppercase alphanumeric with dashes (e.g. PO-2026-001)",
    ),

  // ── NEW FIELD: Allow optional notes ──
  notes: z.string().optional(),
  // ─────────────────────────────────────

  inputs: z
    .array(
      z.object({
        itemId: objectId,
        quantityRequired: z
          .number({ invalid_type_error: "quantityRequired must be a number" })
          .min(0.01, "Quantity required must be greater than 0"),
      }),
    )
    .min(1, "At least one input (raw material) is required"),

  outputs: z
    .array(
      z.object({
        itemId: objectId,
        quantityProduced: z
          .number({ invalid_type_error: "quantityProduced must be a number" })
          .min(0.01, "Quantity produced must be greater than 0"),
      }),
    )
    .min(1, "At least one output (finished good) is required"),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled"], {
    errorMap: () => ({
      message:
        "Status must be one of: Pending, In Progress, Completed, Cancelled",
    }),
  }),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
