// server/schemas/inventory.schema.js
const { z } = require("zod");

const createItemSchema = z
  .object({
    sku: z
      .string()
      .min(1, "SKU is required")
      .regex(/^[A-Z0-9-]+$/, "SKU must be uppercase alphanumeric with dashes"),
    name: z.string().min(1, "Name is required"),
    type: z.enum(["raw_material", "finished_good"], {
      errorMap: () => ({
        message: "Type must be 'raw_material' or 'finished_good'",
      }),
    }),
    currentStock: z.number().min(0, "Stock cannot be negative").optional(),
    minStockLevel: z.number().min(0, "Minimum stock level cannot be negative"),
    unit: z.string().min(1, "Unit is required (e.g. kg, units, liters)"),

    // New Secondary Unit fields
    secondaryUnit: z.string().optional(),
    conversionFactor: z
      .number()
      .min(0, "Conversion factor must be a positive number")
      .optional(),
  })
  .refine(
    (data) => {
      // Ensure that if one secondary unit field is provided, the other is as well
      const hasSecondaryUnit = !!data.secondaryUnit;
      const hasConversionFactor =
        data.conversionFactor !== undefined && data.conversionFactor !== null;

      if (hasSecondaryUnit && !hasConversionFactor) return false;
      if (!hasSecondaryUnit && hasConversionFactor) return false;

      return true;
    },
    {
      message:
        "Both secondaryUnit and conversionFactor must be provided together if using secondary units.",
      path: ["conversionFactor"],
    },
  );

module.exports = { createItemSchema };
