// __tests__/users.test.js
const request = require("supertest");
const {
  connectTestDB,
  disconnectTestDB,
  clearCollections,
  getApp,
  generateToken,
  authHeader,
  createUser,
} = require("./helpers/setup");

let app;

beforeAll(async () => {
  await connectTestDB();
  app = getApp();
});

afterAll(async () => {
  await disconnectTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// ── GET /api/users ────────────────────────────────────────────────

describe("GET /api/users", () => {
  it("returns 401 if unauthenticated", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  it("returns 403 if staff tries to access user list", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    const res = await request(app).get("/api/users").set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it("returns 403 if manager tries to access user list", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");

    const res = await request(app).get("/api/users").set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it("returns all users for admin", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");
    await createUser({ role: "staff" });
    await createUser({ role: "manager" });

    const res = await request(app).get("/api/users").set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3); // admin + staff + manager
    // Password must never be returned
    res.body.data.forEach((u) => expect(u.password).toBeUndefined());
  });

  it("filters by role", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");
    await createUser({ role: "staff" });
    await createUser({ role: "staff" });
    await createUser({ role: "manager" });

    const res = await request(app)
      .get("/api/users?role=staff")
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    res.body.data.forEach((u) => expect(u.role).toBe("staff"));
  });
});

// ── GET /api/users/:id ────────────────────────────────────────────

describe("GET /api/users/:id", () => {
  it("returns a single user by ID", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");
    const staff = await createUser({ name: "Jane Doe", role: "staff" });

    const res = await request(app)
      .get(`/api/users/${staff._id}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Jane Doe");
    expect(res.body.data.password).toBeUndefined();
  });

  it("returns 404 for non-existent user", async () => {
    const mongoose = require("mongoose");
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/users/${fakeId}`)
      .set(authHeader(token));

    expect(res.status).toBe(404);
  });

  it("returns 400 for malformed ObjectId (CastError → errorHandler)", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");

    const res = await request(app)
      .get("/api/users/not-a-real-id")
      .set(authHeader(token));

    expect(res.status).toBe(400);
  });
});

// ── POST /api/users ───────────────────────────────────────────────

describe("POST /api/users", () => {
  it("allows admin to create a new user", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");

    const newUser = {
      name: "New Worker",
      email: "worker@factoryflow.com",
      password: "password123",
      role: "staff",
    };

    const res = await request(app)
      .post("/api/users")
      .set(authHeader(token))
      .send(newUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("worker@factoryflow.com");
    expect(res.body.data.password).toBeUndefined();
  });

  it("returns 403 if manager tries to create a user", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");

    const res = await request(app)
      .post("/api/users")
      .set(authHeader(token))
      .send({
        name: "Hacker",
        email: "hack@me.com",
        password: "pwd",
        role: "admin",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not authorized/i);
  });
});

// ── PATCH /api/users/:id/role ─────────────────────────────────────

describe("PATCH /api/users/:id/role", () => {
  it("admin can promote staff to manager", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");
    const staff = await createUser({ role: "staff" });

    const res = await request(app)
      .patch(`/api/users/${staff._id}/role`)
      .set(authHeader(token))
      .send({ role: "manager" });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("manager");
  });

  it("returns 400 if admin tries to change their own role", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");

    const res = await request(app)
      .patch(`/api/users/${admin._id}/role`)
      .set(authHeader(token))
      .send({ role: "staff" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot change your own role/i);
  });

  it("returns 400 on invalid role (Zod)", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");
    const staff = await createUser({ role: "staff" });

    const res = await request(app)
      .patch(`/api/users/${staff._id}/role`)
      .set(authHeader(token))
      .send({ role: "superuser" }); // invalid

    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it("returns 403 if non-admin tries to update a role", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");
    const staff = await createUser({ role: "staff" });

    const res = await request(app)
      .patch(`/api/users/${staff._id}/role`)
      .set(authHeader(token))
      .send({ role: "manager" });

    expect(res.status).toBe(403);
  });
});
