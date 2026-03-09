// schemas/user.schema.js
const { z } = require("zod");

const updateRoleSchema = z.object({
  role: z.enum(["staff", "manager", "admin"], {
    errorMap: () => ({
      message: "Role must be one of: staff, manager, admin",
    }),
  }),
});

// ── NEW: Schema for Admins creating new users ──
const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["staff", "manager", "admin"]).default("staff"),
});

module.exports = { updateRoleSchema, createUserSchema };
