// schemas/user.schema.js
const { z } = require("zod");

// Define all valid roles in one place to keep both schemas consistent
const VALID_ROLES = [
  "staff",
  "manager",
  "admin",
  "shop_manager",
  "shop_worker",
  "procurement_manager",
  "dispatch_manager",
];

const updateRoleSchema = z.object({
  role: z.enum(VALID_ROLES, {
    errorMap: () => ({
      message: `Role must be one of: ${VALID_ROLES.join(", ")}`,
    }),
  }),
});

// Schema for Admins creating new users
const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(VALID_ROLES).default("staff"),
});

module.exports = { updateRoleSchema, createUserSchema };
