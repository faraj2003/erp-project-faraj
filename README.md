# 🏭 FactoryFlow ERP

A **full-stack, production-grade Enterprise Resource Planning (ERP) system** built for modern factory operations.
FactoryFlow helps manage **inventory, manufacturing orders, procurement, users, analytics, and real-time warehouse activity** from a single platform.

Built with a modern JavaScript stack featuring:

- ⚡ Real-time updates with WebSockets
- 🔐 JWT authentication & RBAC
- 🧾 ACID-compliant MongoDB transactions
- 🧪 Comprehensive automated testing
- 📊 Advanced analytics dashboards
- 🏗️ Multi-location inventory architecture

---

![CI](https://github.com/faraj2003/erp-project-faraj/actions/workflows/test.yml/badge.svg)

---

# ✨ Features

---

## 📦 Inventory Management

- Multi-location stock tracking across warehouses and shop floors
- FIFO-based stock issuance and inventory transfers
- Low-stock alerts using configurable `minStockLevel`
- Inventory adjustment workflow:
  - Draft → Pending → Approved / Rejected

- Immutable inventory transaction ledger
- CSV export support for:
  - Items
  - Transactions
  - Adjustments

- Barcode scanning integration using `html5-qrcode`

---

## 🏗️ Manufacturing Orders

- Create production orders with multiple input and output items
- Full order status history tracking
- ACID-compliant manufacturing completion flow

### 🔒 Transaction Safety

When a manufacturing order is completed:

- Input stock is deducted
- Output stock is added
- Audit log entries are created

All operations execute inside a **single MongoDB transaction session**.

If any input item has insufficient stock:

- `abortTransaction()` is triggered
- All changes are rolled back
- No partial state remains in the database

---

## 🛒 Procurement Management

- Supplier management
- Multi-supplier pricing support
- Historical supplier price tracking
- RFQ (Request for Quotation) workflow
- Purchase Orders & Goods Receipt handling
- Vendor Invoice management
- Return Order support

---

## 📊 Analytics & Reporting

- Real-time operational dashboard
- Inventory valuation metrics
- Low-stock monitoring
- Recent transaction feed
- Recharts-powered visual analytics
- Bill of Materials (BOM) tracking
- Cycle Count auditing

---

## 👥 User & Access Management

### Supported Roles

- `admin`
- `manager`
- `staff`
- `shop_worker`
- `shop_manager`
- `procurement_manager`
- `dispatch_manager`

### Features

- Role-Based Access Control (RBAC)
- Admin-only user provisioning
- Role promotion & demotion
- Location-scoped data visibility
- Facility-based access restrictions

---

## 🔐 Security

- JWT authentication
- bcrypt password hashing
- API rate limiting
- Helmet security headers
- CORS protection
- Request validation using Zod schemas
- Centralized error handling middleware

---

## ⚡ Real-Time Features

FactoryFlow uses **Socket.io** to provide:

- Live inventory updates
- Real-time stock synchronization
- Instant UI refresh across connected clients

---

# 🧪 Automated Testing

The backend includes a comprehensive automated test suite covering:

- Authentication
- Inventory
- Orders
- Users
- RBAC enforcement
- ACID transaction rollback behavior

## ✅ Test Results

```txt
Test Suites: 4 passed, 4 total
Tests:       52 passed, 52 total
```

---

## Backend Testing Stack

- Jest
- Supertest
- mongodb-memory-server

Tests run against an isolated in-memory MongoDB replica set.

---

## Covered Scenarios

### Authentication

- JWT login flow
- Registration
- Invalid token handling
- Token expiration

### RBAC

- Route authorization
- Role-based 401/403 enforcement

### Inventory

- CRUD operations
- Filters & search
- Low-stock queries

### Transaction Rollback

- Insufficient stock rollback
- Multi-item rollback integrity
- Audit log rollback validation

### User Management

- User creation
- Role updates
- Self-role modification prevention

---

## 🔄 Continuous Integration

GitHub Actions automatically runs the full test suite on:

- Every push
- Every pull request

---

# 🛠️ Tech Stack

---

## Backend

| Layer          | Technology                             |
| -------------- | -------------------------------------- |
| Runtime        | Node.js                                |
| Framework      | Express.js v5                          |
| Database       | MongoDB + Mongoose                     |
| Authentication | JWT + bcryptjs                         |
| Validation     | Zod                                    |
| Real-Time      | Socket.io                              |
| Logging        | Winston + Morgan                       |
| Security       | Helmet, CORS, express-rate-limit       |
| Testing        | Jest, Supertest, mongodb-memory-server |

---

## Frontend

| Layer            | Technology                         |
| ---------------- | ---------------------------------- |
| Framework        | React 19 + Vite                    |
| State Management | Zustand + TanStack React Query     |
| Routing          | React Router v7                    |
| Styling          | Tailwind CSS v4                    |
| Charts           | Recharts                           |
| Forms            | React Hook Form + Zod              |
| API Client       | Axios + Socket.io-client           |
| Notifications    | Sonner                             |
| Testing          | Vitest, React Testing Library, MSW |

---

# 📁 Project Structure

```bash
erp-project-faraj/
│
├── client/                        # React 19 + Vite frontend
│   └── src/
│       ├── components/            # Reusable UI components
│       ├── hooks/                 # Custom hooks
│       ├── lib/                   # Axios + API utilities
│       ├── pages/                 # Application pages
│       ├── store/                 # Zustand stores
│       └── __tests__/             # Frontend tests
│
└── server/                        # Express.js backend
    ├── controllers/               # Business logic
    ├── middleware/                # Auth & validation middleware
    ├── models/                    # Mongoose schemas
    ├── routes/                    # API routes
    ├── schemas/                   # Zod schemas
    ├── utils/                     # Utilities & logger
    └── __tests__/                 # Backend tests
```

---

# ⚙️ Getting Started

---

## Prerequisites

- Node.js v18+
- MongoDB local instance or MongoDB Atlas cluster

---

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/faraj2003/erp-project-faraj.git
cd erp-project-faraj
```

---

## 2️⃣ Configure Environment Variables

### Server (`server/.env`)

```env
NODE_ENV=development
PORT=5000

MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/factoryflow

JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173
```

---

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000
```

---

## 3️⃣ Install Dependencies

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd client
npm install
```

---

## 4️⃣ Run the Development Servers

### Backend

```bash
cd server
npm run dev
```

Runs on:

```txt
http://localhost:5000
```

---

### Frontend

```bash
cd client
npm run dev
```

Runs on:

```txt
http://localhost:5173
```

---

# 🧪 Running Tests

---

## Backend Tests

```bash
cd server

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## Frontend Tests

```bash
cd client
npm test
```

---

# 🔑 API Overview

| Method | Endpoint                      | Access                | Description               |
| ------ | ----------------------------- | --------------------- | ------------------------- |
| POST   | `/api/auth/login`             | Public                | Login & receive JWT       |
| POST   | `/api/auth/register`          | Admin                 | Register new user         |
| GET    | `/api/inventory`              | All Roles             | List inventory items      |
| POST   | `/api/inventory`              | Admin, Manager        | Create inventory item     |
| GET    | `/api/inventory/low-stock`    | All Roles             | Get low-stock items       |
| GET    | `/api/inventory/transactions` | Admin, Manager        | Inventory ledger          |
| POST   | `/api/orders`                 | Staff, Manager, Admin | Create production order   |
| PATCH  | `/api/orders/:id/status`      | Manager, Admin        | Complete production order |
| GET    | `/api/orders`                 | All Roles             | Paginated order list      |
| GET    | `/api/users`                  | Admin                 | List users                |
| PATCH  | `/api/users/:id/role`         | Admin                 | Update user role          |

---

# 🏗️ Architecture Highlights

---

## 🔒 ACID Order Completion

Production order completion uses MongoDB transactions via:

```js
session.startTransaction();
```

Operations performed atomically:

- Deduct input stock
- Add output stock
- Create audit logs
- Update order status

If any step fails:

```js
abortTransaction();
```

ensures the database remains unchanged.

---

## 📦 Multi-Location Inventory Model

Stock quantities are stored separately from items using:

```txt
StockBalance
```

This allows:

- Multiple warehouses
- Shop floor tracking
- Location-specific quantities
- Scalable inventory architecture

---

## 👀 Location-Scoped Visibility

### Global Roles

Can view all locations:

- admin
- manager
- procurement_manager

### Location-Bound Roles

Restricted to assigned facilities:

- staff
- shop_worker

Enforced directly at the query layer.

---

## 🧩 Validation & Error Handling

Every route passes through:

- Zod validation middleware
- Authentication middleware
- Centralized error handler

Consistent API error response:

```json
{
  "success": false,
  "error": "Validation Error",
  "details": []
}
```

---

# 🚀 Future Improvements

- Multi-tenant organization support
- Advanced warehouse routing
- Email notifications
- Demand forecasting
- PDF invoice generation
- Kubernetes deployment support
- Redis caching layer
- Event-driven architecture with queues

---

# 📜 License

Licensed under the **MIT License**.
