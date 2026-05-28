# FactoryFlow ERP 🏭

A full-stack, production-grade Enterprise Resource Planning system built for modern factory operations. FactoryFlow manages inventory, manufacturing orders, procurement, users, and real-time warehouse activity from a single platform.

[![CI](https://github.com/faraj2003/erp-project-faraj/actions/workflows/test.yml/badge.svg)](https://github.com/faraj2003/erp-project-faraj/actions)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socketdotio&logoColor=white)

---

## 🌐 Live Demo

| | URL |
|---|---|
| **Frontend** | https://erp-project-faraj.vercel.app |
| **Backend API** | https://erp-project-faraj.onrender.com |

**Demo credentials** (admin account):
```
Email:    admin@factoryflow.com
Password: AdminPassword123
```

> The admin account has full access — inventory, orders, procurement, analytics, user management, and all warehouse locations. You can also create additional users from the app and assign different roles to explore permission levels.

---

## Features

### Inventory Management

Stock is tracked per location, not globally. The `StockBalance` collection stores quantity per `(item, location, zone, rack, batch)` — meaning the same item can exist in multiple warehouses and batch lots simultaneously. Stock operations (add, issue, transfer) all use a FIFO algorithm sorted by expiry date and creation time, so oldest batches are consumed first.

Three-tier alert levels (orange / red / critical) are configurable per item. A dedicated alerts endpoint returns items breaching their thresholds, sorted by severity. Items with transaction history can't be hard-deleted — the system enforces archiving to preserve the audit trail.

Other inventory features: barcode scanning via `html5-qrcode`, CSV export for items / transactions / adjustments, and a full adjustment workflow (draft → pending → approved/rejected) where approvals atomically update stock and log a transaction.

### Manufacturing Orders

Production orders consume raw material inputs and produce finished good outputs. When an order is completed, all stock mutations — deducting inputs, crediting outputs, logging scrapped material to a scrap location — execute inside a single MongoDB transaction session. If any input has insufficient stock, `abortTransaction()` fires and the database stays unchanged. No partial state, no inconsistent balances.

Each order also stores `statusHistory[]` — every status change is stamped with the user who made it and the exact timestamp, forming a built-in audit log.

### Procurement Pipeline

The full supply chain flow across four stages:

**1. RFQ & Bidding** — raise a Request for Quotation with a target quantity and deadline. Suppliers submit bids with a quoted price and promised delivery date. If a supplier updates their bid, the existing entry is replaced rather than duplicated. A manager awards the winning bid, which auto-generates a Purchase Order.

**2. Purchase Order Workflow** — POs move through six states: `Draft → Pending Approval → Approved → Partially Received → Fulfilled → Cancelled`. The smart auto-ordering engine (`POST /api/procurement/auto-order`) scans all items against their reorder points, groups shortfalls by supplier, and creates Draft POs — a manager must approve before anything is issued to a supplier.

**3. Goods Receipt (GRN)** — records vehicle registration, driver name, waybill number, and received vs. rejected quantities per line item. Logistics costs (freight, insurance, customs) are entered and prorated across line items proportionally by their value weight to calculate a true landed cost per unit. The entire GRN submission — stock balance update, transaction log, PO status change — runs inside a MongoDB session.

**4. 3-Way Invoice Matching** — vendor invoices are submitted and matched against both the originating PO and the GRN. If billed quantities exceed received quantities, the invoice is flagged as `Discrepancy` and marked as disputed. A clean match sets the status to `Matched`.

Return to Vendor (RTV) orders are also supported for rejected or faulty goods.

### Cycle Count Audits

Managers schedule physical stock audits for a location. The system generates a count sheet pre-populated with expected quantities from current `StockBalance` records. Workers enter actual counted quantities and the system calculates variance per item. The audit cannot be marked complete until every item has been counted.

### Analytics & Reporting

Production metrics and stock movement data are computed via MongoDB aggregation pipelines. The dashboard surfaces total inventory valuation, low-stock alert count, pending adjustments, and recent transactions — all scoped to the requesting user's role and location.

### Real-Time Updates

Socket.io is initialised in `server.js` and stored on the Express app instance (`app.set('io', io)`). Any controller can emit events without importing the socket server directly. Stock changes broadcast live to all connected clients. Procurement alerts are pushed as named socket events and rendered as toast notifications in the UI.

---

## Tech Stack

**Backend**

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | MongoDB + Mongoose 9 |
| Authentication | JWT + bcryptjs |
| Validation | Zod |
| Real-Time | Socket.io 4 |
| Logging | Winston + Morgan |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Jest, Supertest, mongodb-memory-server |

**Frontend**

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

## Role & Permission System

| Role | Access |
|---|---|
| `admin` | Full access — user management, all data, all locations |
| `manager` | Global inventory and order visibility, approves adjustments and POs |
| `procurement_manager` | Global visibility, manages the full procurement pipeline |
| `dispatch_manager` | Location-scoped, manages outbound transfers |
| `shop_manager` | Location-scoped, manages their assigned facility |
| `shop_worker` | Location-scoped, logs consumption and counts stock |
| `staff` | Default role, limited read access |

Location-scoped roles only see inventory and transactions for their assigned facility. This is enforced at the query layer via a `getLocationScope(user)` helper — global roles return an empty filter, location-bound roles return `{ locationId: user.locationId }`. The same role checks are enforced on the frontend via `ProtectedRoute`.

---

## Automated Testing

```
Test Suites: 4 passed, 4 total
Tests:       52 passed, 52 total
```

Tests run against an isolated in-memory MongoDB replica set via `mongodb-memory-server` — no real database needed.

**Covered scenarios:**
- JWT login flow, registration, invalid/expired token handling
- Role-based 401/403 enforcement across all protected routes
- Inventory CRUD, type filters, low-stock queries
- ACID transaction rollback — insufficient stock, multi-item rollback, audit log integrity
- User creation, role updates, self-role modification prevention

---

## API Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login & receive JWT |
| POST | `/api/auth/register` | Admin | Register new user |
| GET | `/api/inventory` | All roles | List inventory items |
| POST | `/api/inventory` | Manager, Admin | Create inventory item |
| GET | `/api/inventory/alerts` | All roles | Items breaching alert thresholds |
| GET | `/api/inventory/transactions` | All roles | Full transaction ledger |
| POST | `/api/inventory/:id/transfer` | Manager, Admin | Transfer stock between locations |
| POST | `/api/orders` | All roles | Create production order |
| PATCH | `/api/orders/:id/status` | Manager, Admin | Complete order (ACID transaction) |
| GET | `/api/procurement/rfq` | All roles | List RFQs |
| POST | `/api/procurement/rfq/bid` | All roles | Submit supplier bid |
| PUT | `/api/procurement/rfq/award` | Manager, Admin | Award bid & generate PO |
| POST | `/api/procurement/grn` | All roles | Submit goods receipt |
| POST | `/api/procurement/invoice` | All roles | Submit vendor invoice (3-way match) |
| POST | `/api/procurement/auto-order` | Manager, Admin | Trigger smart auto-ordering |
| GET | `/api/users` | Admin | List users |
| PATCH | `/api/users/:id/role` | Admin | Update user role |

---

## Project Structure

```
erp-project-faraj/
├── client/
│   └── src/
│       ├── components/     # AppShell, ProtectedRoute, BarcodeScanner, TransactionLedger
│       ├── hooks/          # useInventorySocket
│       ├── lib/            # Axios instance, API helpers
│       ├── pages/          # Dashboard, Inventory, Orders, Procurement, BOM, CycleCounts...
│       └── store/          # Zustand stores (auth, socket)
│
└── server/
    ├── controllers/        # 17 controllers
    ├── middleware/         # JWT protect + authorize, error handler, Zod validator, upload
    ├── models/             # 18 Mongoose models
    ├── routes/             # auth, users, inventory, orders, analytics, locations, procurement, system
    ├── schemas/            # Zod validation schemas
    └── utils/              # AppError, Winston logger
```

---

## Getting Started

**Prerequisites:** Node.js v18+, MongoDB

```bash
git clone https://github.com/faraj2003/erp-project-faraj.git
cd erp-project-faraj

cd server && npm install
cd ../client && npm install
```

```bash
# server/.env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# client/.env
VITE_API_URL=http://localhost:5000
```

```bash
cd server && npm run dev    # → http://localhost:5000
cd client && npm run dev    # → http://localhost:5173

# Seed demo data
cd server && node seed.js
```

---

## Running Tests

```bash
# Backend
cd server && npm test
cd server && npm run test:coverage

# Frontend
cd client && npm test
```

---

## License

MIT
