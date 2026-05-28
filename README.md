# FactoryFlow ERP 🏭

A full-stack, production-grade Enterprise Resource Planning system built for modern factory operations. FactoryFlow manages inventory, manufacturing orders, bill of materials, procurement, warehouse locations, and real-time activity from a single platform.

![CI](https://img.shields.io/github/actions/workflow/status/faraj2003/erp-project-faraj/test.yml?label=CI)
![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Express](https://img.shields.io/badge/Express-v5-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-green)
![React](https://img.shields.io/badge/React-19-blue)
![Socket.io](https://img.shields.io/badge/Socket.io-4-black)

---

## 🌐 Live Demo

| | URL |
|---|---|
| Frontend | https://erp-project-faraj.vercel.app |
| Backend API | https://erp-project-faraj.onrender.com |

**Demo credentials (admin account):**
```
Email:    admin@factoryflow.com
Password: AdminPassword123
```

The admin account has full access — inventory, orders, procurement, analytics, user management, and all warehouse locations. You can create additional users from the app and assign different roles to explore permission levels.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Role & Permission System](#-role--permission-system)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Seeding the Database](#-seeding-the-database)
- [API Overview](#-api-overview)
- [Automated Testing](#-automated-testing)
- [License](#-license)

---

## ✨ Features

### Inventory Management

Stock is tracked per location, not globally. The `StockBalance` collection stores quantity per `(item, location, zone, rack, batch)` — meaning the same item can exist in multiple warehouses and batch lots simultaneously. All stock operations (add, issue, transfer) use a FIFO algorithm sorted by expiry date and creation time, so oldest batches are consumed first.

Three-tier alert levels (orange / red / critical) are configurable per item. A dedicated alerts endpoint returns items breaching their thresholds, sorted by severity. Items with transaction history cannot be hard-deleted — the system enforces archiving to preserve the audit trail.

Other inventory features: barcode scanning via `html5-qrcode`, image uploads per item, CSV export for items / transactions / adjustments, and a full adjustment workflow (draft → pending → approved/rejected) where approvals atomically update stock and log a transaction.

### Bill of Materials (BOM) & Kitting

BOMs define the recipe for a finished good — which raw materials are needed and in what quantities per production run. The `assembleBOM` endpoint verifies that sufficient stock exists for every raw material before touching any balance. If all checks pass, raw materials are deducted using FIFO and the finished good is credited to inventory, with a batch number auto-generated if not supplied. Every deduction and addition is logged as a transaction.

### Manufacturing Orders

Production orders consume raw material inputs and produce finished good outputs. When an order is completed, all stock mutations — deducting inputs, crediting outputs, and logging scrapped material to a scrap location — execute inside a single MongoDB transaction session. If any input has insufficient stock, `abortTransaction()` fires and the database stays unchanged. No partial state, no inconsistent balances.

Each order also stores a `statusHistory[]` array — every status change is stamped with the user who made it and the exact timestamp, forming a built-in audit log.

### Procurement Pipeline

The full supply chain flow across four stages:

**1. RFQ & Bidding** — raise a Request for Quotation with a target quantity and deadline. Suppliers submit bids with a quoted price and promised delivery date. If a supplier updates their bid, the existing entry is replaced rather than duplicated. A manager awards the winning bid, which auto-generates a Purchase Order.

**2. Purchase Order Workflow** — POs move through six states: Draft → Pending Approval → Approved → Partially Received → Fulfilled → Cancelled. The smart auto-ordering engine (`POST /api/procurement/auto-order`) scans all items against their reorder points, groups shortfalls by supplier, and creates Draft POs — a manager must approve before anything is issued to a supplier.

**3. Goods Receipt (GRN)** — records vehicle registration, driver name, waybill number, and received vs. rejected quantities per line item. Logistics costs (freight, insurance, customs) are entered and prorated across line items proportionally by their value weight to calculate a true landed cost per unit. The entire GRN submission — stock balance update, transaction log, PO status change — runs inside a MongoDB session.

**4. 3-Way Invoice Matching** — vendor invoices are matched against both the originating PO and the GRN. If billed quantities exceed received quantities, the invoice is flagged as `Discrepancy` and marked as disputed. A clean match sets the status to `Matched`.

Return to Vendor (RTV) orders are also supported for rejected or faulty goods.

### Supplier Management

Suppliers can be created and linked to the inventory items they supply. Items store a reference to their preferred supplier, which is used by the auto-ordering engine when generating Draft POs.

### Warehouse Locations

Locations represent physical facilities (warehouses, shops). Each location can have zones, and each zone can have racks, giving a three-tier physical hierarchy. Location-scoped roles only see inventory and transactions for their assigned facility.

### Cycle Count Audits

Managers schedule physical stock audits for a location. The system generates a count sheet pre-populated with expected quantities from current `StockBalance` records. Workers enter actual counted quantities and the system calculates variance per item. The audit cannot be marked complete until every item has been counted.

### Analytics & Reporting

Production metrics and stock movement data are computed via MongoDB aggregation pipelines across three endpoints: production output by item, stock movement trends, and inventory valuation trends. The dashboard surfaces total inventory valuation, low-stock alert count, pending adjustments, and recent transactions — all scoped to the requesting user's role and location.

### Real-Time Updates

Socket.io is initialised in `server.js` and stored on the Express app instance via `app.set('io', io)`. Any controller can emit events without importing the socket server directly. Stock changes broadcast live to all connected clients. Procurement alerts are pushed as `custom_alert` socket events and rendered as toast notifications in the UI.

---

## 🛠️ Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express.js v5 |
| Database | MongoDB + Mongoose 9 |
| Authentication | JWT + bcryptjs |
| Validation | Zod |
| Real-Time | Socket.io 4 |
| File Uploads | Multer |
| Logging | Winston + Morgan |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Jest, Supertest, mongodb-memory-server |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| State Management | Zustand + TanStack Query v5 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| API Client | Axios + Socket.io-client |
| Notifications | Sonner |
| Testing | Vitest, React Testing Library, MSW |

---

## 🔐 Role & Permission System

| Role | Access |
|---|---|
| `admin` | Full access — user management, all data, all locations |
| `manager` | Global inventory and order visibility, approves adjustments and POs |
| `procurement_manager` | Global visibility, manages the full procurement pipeline |
| `dispatch_manager` | Location-scoped, manages outbound transfers |
| `shop_manager` | Location-scoped, manages their assigned facility |
| `shop_worker` | Location-scoped, logs consumption and counts stock |
| `staff` | Default role, limited read access; can create orders |

Location-scoped roles only see inventory and transactions for their assigned facility. This is enforced at the query layer via a `getLocationScope(user)` helper in `inventoryController.js` — global roles return an empty filter, location-bound roles return `{ locationId: user.locationId }`. The same role checks are enforced on the frontend via `ProtectedRoute`.

> **Note:** The codebase references an `inventory_controller` role in two route guards (`/api/inventory/transactions` and the adjustments CSV export endpoint). This role is not yet defined in the `User` model's enum. If you intend to use it, add `"inventory_controller"` to the `role` enum in `models/User.js`.

---

## 📁 Project Structure

```
erp-project-faraj/
├── .github/
│   └── workflows/
│       └── test.yml            # CI: runs backend (Jest) + frontend (Vitest) on push
│
├── client/
│   └── src/
│       ├── __tests__/          # Vitest + RTL tests (Login, NewOrder, authStore)
│       │   └── mocks/          # MSW handlers and server setup
│       ├── components/
│       │   ├── layout/         # AppShell (nav, sidebar)
│       │   ├── BarcodeScanner.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── TransactionLedger.jsx
│       ├── hooks/
│       │   └── useInventorySocket.js
│       ├── lib/
│       │   ├── axios.js        # Axios instance with auth interceptors
│       │   └── procurementApi.js
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Inventory.jsx
│       │   ├── Adjustments.jsx
│       │   ├── BOM.jsx
│       │   ├── CycleCounts.jsx
│       │   ├── Orders.jsx
│       │   ├── NewOrder.jsx
│       │   ├── Procurement.jsx
│       │   ├── Locations.jsx
│       │   ├── Categories.jsx
│       │   ├── Units.jsx
│       │   ├── Users.jsx
│       │   └── Login.jsx
│       └── store/
│           ├── authStore.js    # Zustand auth store
│           └── socketStore.js  # Zustand socket store
│
└── server/
    ├── __tests__/              # Jest + Supertest tests (4 suites)
    │   └── helpers/
    │       └── setup.js        # In-memory MongoDB replica set setup
    ├── config/
    │   └── db.js
    ├── controllers/            # 17 controllers
    ├── middleware/
    │   ├── authMiddleware.js   # JWT protect + authorize
    │   ├── errorHandler.js
    │   ├── upload.js           # Multer image upload
    │   └── validateRequest.js  # Zod validation wrapper
    ├── models/                 # 19 Mongoose models
    ├── routes/                 # auth, users, inventory, orders, analytics,
    │                           # locations, procurement, system
    ├── schemas/                # Zod validation schemas
    ├── utils/
    │   ├── AppError.js
    │   └── logger.js           # Winston logger
    ├── app.js                  # Express app factory (createApp)
    ├── server.js               # HTTP server + Socket.io initialisation
    ├── seed.js                 # Core setup (company, admin, units, locations)
    ├── seed-mock-data.js       # Demo items, stock balances, and orders
    ├── seed-procurement.js     # Demo suppliers, RFQs, and purchase orders
    └── seed-procurement-volume.js  # High-volume procurement data for analytics
```

---

## 🚀 Getting Started

**Prerequisites:** Node.js 20+, MongoDB (local or Atlas)

```bash
git clone https://github.com/faraj2003/erp-project-faraj.git
cd erp-project-faraj

cd server && npm install
cd ../client && npm install
```

Copy the example env files and fill in your values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Start both servers (in separate terminals):

```bash
cd server && npm run dev    # → http://localhost:5000
cd client && npm run dev    # → http://localhost:5173
```

---

## 🔐 Environment Variables

**`server/.env`**

```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**`client/.env`**

```env
VITE_API_URL=http://localhost:5000
```

---

## 🌱 Seeding the Database

There are four seed scripts intended to be run in order. Each depends on data created by the previous.

```bash
# 1. Core setup — creates the company, admin user, default units, locations, and categories
cd server && node seed.js

# 2. Mock inventory data — items, stock balances, and production orders
node seed-mock-data.js

# 3. Procurement data — suppliers, RFQs, and purchase orders
node seed-procurement.js

# 4. (Optional) High-volume procurement data for realistic analytics charts
node seed-procurement-volume.js
```

After running `seed.js`, the local admin credentials are:

```
Email:    admin@test.com
Password: 16122003
```

> **Note:** The console output from `seed.js` incorrectly prints `password123` — the actual stored password hashed into the database is `16122003`. This is a known bug in the seed script.

---

## 📡 API Overview

All routes require a `Bearer <token>` header unless marked Public. "All roles" means any authenticated user.

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login and receive JWT (rate-limited: 10 attempts per 15 min) |
| POST | `/api/auth/register` | Admin | Register a new user |

### Users

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/users` | Admin | List all users (supports `?role=` filter) |
| POST | `/api/users` | Admin | Create a new user |
| GET | `/api/users/:id` | Admin | Get a single user |
| PATCH | `/api/users/:id/role` | Admin | Update a user's role |

### Inventory

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/inventory` | All roles | List items (location-scoped) |
| POST | `/api/inventory` | Manager, Admin, Procurement Manager | Create item |
| PUT | `/api/inventory/:id` | Manager, Admin | Update item |
| DELETE | `/api/inventory/:id` | Admin | Hard-delete (blocked if item has transactions) |
| PATCH | `/api/inventory/:id/archive` | Manager, Admin | Archive item |
| POST | `/api/inventory/:id/image` | Manager, Admin | Upload item image |
| POST | `/api/inventory/:id/stock` | Manager, Admin, Procurement Manager | Add stock |
| POST | `/api/inventory/:id/issue` | Manager, Admin, Dispatch Manager, Shop Worker | Issue stock |
| POST | `/api/inventory/:id/transfer` | Manager, Admin, Dispatch Manager | Transfer stock between locations |
| GET | `/api/inventory/alerts` | All roles | Items breaching alert thresholds (sorted by severity) |
| GET | `/api/inventory/low-stock` | All roles | Items below reorder point |
| GET | `/api/inventory/transactions` | Manager, Admin | Full transaction ledger (location-scoped) |
| GET | `/api/inventory/adjustments` | Manager, Admin | List adjustments |
| POST | `/api/inventory/adjustments` | Manager, Admin, Dispatch Manager, Shop Worker | Create adjustment (draft) |
| PATCH | `/api/inventory/adjustments/:id/review` | Admin | Approve or reject an adjustment |
| GET | `/api/inventory/dashboard` | Manager, Admin | Dashboard metrics |
| GET | `/api/inventory/export/transactions` | Manager, Admin | Export transactions as CSV |
| GET | `/api/inventory/export/items` | Manager, Admin, Procurement Manager | Export items as CSV |
| GET | `/api/inventory/export/adjustments` | Manager, Admin | Export adjustments as CSV |

### Bill of Materials

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/inventory/boms` | All roles | List BOMs |
| POST | `/api/inventory/boms` | All roles | Create a BOM |
| POST | `/api/inventory/boms/:id/assemble` | All roles | Run assembly (FIFO deduction + finished good credit) |

### Cycle Counts

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/inventory/cycle-counts` | All roles | List cycle counts |
| POST | `/api/inventory/cycle-counts` | All roles | Schedule a cycle count |
| PUT | `/api/inventory/cycle-counts/:id/count` | All roles | Enter counted quantities |
| POST | `/api/inventory/cycle-counts/:id/complete` | All roles | Mark complete (requires all items counted) |

### Manufacturing Orders

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/orders` | All roles | List orders (paginated; supports `?status=` filter) |
| POST | `/api/orders` | Staff, Manager, Admin | Create a production order |
| PATCH | `/api/orders/:id/status` | Manager, Admin | Complete order (ACID transaction) |

### Procurement

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/procurement/suppliers` | All roles | List active suppliers |
| POST | `/api/procurement/suppliers` | All roles | Create a supplier |
| GET | `/api/procurement/po` | All roles | List purchase orders |
| POST | `/api/procurement/po` | All roles | Create a PO manually |
| PUT | `/api/procurement/po/:id/approve` | All roles | Approve a PO |
| GET | `/api/procurement/rfq` | All roles | List RFQs |
| POST | `/api/procurement/rfq` | All roles | Create an RFQ |
| POST | `/api/procurement/rfq/bid` | All roles | Submit a supplier bid |
| PUT | `/api/procurement/rfq/award` | All roles | Award bid and auto-generate PO |
| POST | `/api/procurement/grn` | All roles | Submit a goods receipt |
| GET | `/api/procurement/grn` | All roles | List all GRNs |
| GET | `/api/procurement/grn/rejections` | All roles | List GRNs with rejected quantities |
| POST | `/api/procurement/rtv` | All roles | Create a Return to Vendor order |
| GET | `/api/procurement/rtv` | All roles | List RTV orders |
| POST | `/api/procurement/invoice` | All roles | Submit vendor invoice (triggers 3-way match) |
| GET | `/api/procurement/invoice` | All roles | List vendor invoices |
| POST | `/api/procurement/auto-order` | All roles | Trigger smart auto-ordering |
| GET | `/api/procurement/stats` | All roles | Procurement statistics |
| POST | `/api/procurement/alert` | All roles | Send a custom Socket.io procurement alert |

### Analytics

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/analytics/production` | Manager, Admin | Production output metrics by item |
| GET | `/api/analytics/stock-movement` | Manager, Admin | Stock movement trends |
| GET | `/api/analytics/trends` | Manager, Admin | Inventory valuation trends |

### Locations & System

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/locations` | All roles | List warehouse locations |
| POST | `/api/locations` | Manager, Admin | Create a location |
| POST | `/api/locations/:id/zones` | Manager, Admin | Add a zone to a location |
| POST | `/api/locations/:id/zones/:zoneId/racks` | Manager, Admin | Add a rack to a zone |
| GET | `/api/system/categories` | All roles | List item categories |
| POST | `/api/system/categories` | Manager, Admin | Create a category |
| DELETE | `/api/system/categories/:id` | Admin | Delete a category |
| GET | `/api/system/units` | All roles | List units of measure |
| POST | `/api/system/units` | Manager, Admin | Create a unit |
| DELETE | `/api/system/units/:id` | Admin | Delete a unit |
| GET | `/api/system/types` | All roles | List item types |
| POST | `/api/system/types` | Manager, Admin | Create an item type |

---

## 🧪 Automated Testing

Tests run against an isolated in-memory MongoDB replica set via `mongodb-memory-server` — no real database needed. The CI pipeline (`.github/workflows/test.yml`) runs both suites on every push and PR to `main`, using Node.js 20.

### Backend (Jest + Supertest)

```
Test Suites: 4 passed, 4 total
Tests:       52 passed, 52 total
```

| Suite | Tests | Scenarios covered |
|---|---|---|
| `auth.test.js` | 12 | JWT login flow, registration, invalid/expired token handling |
| `inventory.test.js` | 14 | CRUD, type filters, low-stock queries |
| `orders.test.js` | 12 | ACID rollback (insufficient stock, multi-item rollback, audit log integrity), pagination, role enforcement |
| `users.test.js` | 14 | User creation, role updates, self-role modification prevention, 401/403 enforcement |

### Frontend (Vitest + React Testing Library + MSW)

```
Test Suites: 3 passed, 3 total
Tests:       22 passed, 22 total
```

| Suite | Tests | Scenarios covered |
|---|---|---|
| `Login.test.jsx` | 4 | Form render, submission, error states |
| `NewOrder.test.jsx` | 10 | Order form interactions and validation |
| `authStore.test.js` | 8 | Zustand auth store state transitions |

### Running Tests

```bash
# Backend
cd server && npm test
cd server && npm run test:coverage

# Frontend
cd client && npm test
cd client && npm run test:coverage
```

---

## 📜 License

MIT

---

*Built for factory life — from raw material to finished good.*
