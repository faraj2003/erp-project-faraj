// __tests__/auth.test.js
const request = require("supertest");
const {
  connectTestDB, disconnectTestDB, clearCollections,
  getApp, generateToken, authHeader, createUser,
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

// ── POST /api/auth/login ──────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 200 and a JWT token on valid credentials", async () => {
    await createUser({ email: "admin@test.com", password: "password123", role: "admin" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.email).toBe("admin@test.com");
    expect(res.body.data.password).toBeUndefined(); // Never expose password
  });

  it("returns 401 on wrong password", async () => {
    await createUser({ email: "user@test.com", password: "correctpassword" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 401 on non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@test.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 if email is missing (Zod validation)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toBeDefined();
  });

  it("returns 400 if password is missing (Zod validation)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it("returns 400 on invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe("email");
  });
});

// ── POST /api/auth/register ───────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("returns 401 if no token provided", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "New", email: "new@test.com", password: "password123" });

    expect(res.status).toBe(401);
  });

  it("returns 403 if non-admin tries to register a user", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");

    const res = await request(app)
      .post("/api/auth/register")
      .set(authHeader(token))
      .send({ name: "New", email: "new@test.com", password: "password123" });

    expect(res.status).toBe(403);
  });

  it("allows admin to register a new user", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");

    const res = await request(app)
      .post("/api/auth/register")
      .set(authHeader(token))
      .send({ name: "New Staff", email: "newstaff@test.com", password: "password123", role: "staff" });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("newstaff@test.com");
    expect(res.body.data.role).toBe("staff");
  });

  it("returns 400 on duplicate email", async () => {
    const admin = await createUser({ email: "admin2@test.com", role: "admin" });
    const token = generateToken(admin._id, "admin");

    // Register the same email twice
    const payload = { name: "Dup", email: "dup@test.com", password: "password123" };
    await request(app).post("/api/auth/register").set(authHeader(token)).send(payload);
    const res = await request(app).post("/api/auth/register").set(authHeader(token)).send(payload);

    expect(res.status).toBe(400);
  });
});

// ── Protected routes ──────────────────────────────────────────────

describe("JWT protection", () => {
  it("returns 401 with an invalid token", async () => {
    const res = await request(app)
      .get("/api/inventory")
      .set("Authorization", "Bearer totally_fake_token");

    expect(res.status).toBe(401);
  });

  it("returns 401 with an expired token", async () => {
    const expiredToken = require("jsonwebtoken").sign(
      { id: "507f1f77bcf86cd799439011", role: "staff" },
      process.env.JWT_SECRET || "test_jwt_secret_for_testing_only",
      { expiresIn: "0s" }
    );

    const res = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });
});
