FactoryFlow ERP 🏭
A full-stack, production-grade Enterprise Resource Planning system built to manage inventory, manufacturing orders, procurement, users, and analytics for factory operations.

Built with a modern JavaScript stack — real-time WebSockets, JWT auth, ACID-compliant transactions, role-based access control, and a fully automated CI test suite.

🚀 Live Features
📦 Inventory Management

Multi-location stock tracking across warehouses and shop floors
FIFO-based stock issuance and transfers between locations
Low-stock alerts with configurable minStockLevel thresholds
Inventory adjustments with an approval workflow (draft → pending → approved/rejected)
Full inventory ledger — every stock movement logged as an immutable transaction
CSV export for items, transactions, and adjustments
Barcode scanner support via html5-qrcode

🏗️ Manufacturing Orders

Create production orders with multi-item inputs and outputs
ACID-compliant order completion — stock deductions and audit log writes happen atomically inside a MongoDB session. If any input has insufficient stock, the entire transaction rolls back — no partial state
Full status history tracking per order

🛒 Procurement

Supplier management with multi-supplier pricing and price history
Request for Quotation (RFQ) workflow
Purchase Orders with Goods Receipt confirmation
Vendor Invoice management and Return Orders

📊 Analytics & Reporting

Real-time dashboard with total valuation, low-stock count, and recent transactions
Recharts-powered data visualization
Bill of Materials (BOM) with assembly tracking
Cycle Count auditing

👥 User & Access Management

Role-based access control (RBAC) across 7 roles: admin, manager, staff, shop_worker, shop_manager, procurement_manager, dispatch_manager
Admin-only user provisioning and role promotion/demotion
Location-scoped data visibility — staff only see stock for their assigned facility

🔐 Security

JWT authentication with bcrypt password hashing
API rate limiting to prevent brute-force attacks
Helmet for HTTP header hardening
Request validation on every endpoint via Zod schemas

⚡ Real-Time

Socket.io WebSocket integration for live inventory updates across all connected clients

🧪 Testing
The backend has a comprehensive automated test suite covering authentication, inventory, orders, and users — 52 tests across 4 test suites, all passing.
Test Suites: 4 passed, 4 total
Tests: 52 passed, 52 total
Tests are written with Jest + Supertest against an isolated MongoDB in-memory replica set (no external DB needed). Key test coverage includes:

✅ JWT auth — login, registration, token expiry, invalid tokens
✅ RBAC enforcement — role-based 401/403 responses on every protected route
✅ Inventory CRUD — create, update, delete, filters, search, low-stock
✅ ACID transaction rollback — verifies that insufficient-stock orders leave zero DB side effects (no stock changes, no audit log entries)
✅ Multi-item rollback — if any input in a multi-item order fails, all previous deductions are also reversed
✅ User management — create, get, role promotion, self-role change prevention

CI runs on every push and PR via GitHub Actions.

🛠️ Tech Stack
Backend
LayerTechnologyRuntimeNode.jsFrameworkExpress.js v5DatabaseMongoDB + MongooseAuthJWT + bcryptjsValidationZodReal-TimeSocket.ioLoggingWinston + MorganSecurityHelmet, CORS, express-rate-limitTestingJest, Supertest, mongodb-memory-server
Frontend
LayerTechnologyFrameworkReact 19 + ViteStateZustand + TanStack React QueryRoutingReact Router v7StylingTailwind CSS v4ChartsRechartsFormsReact Hook Form + ZodAPIAxios + Socket.io-clientNotificationsSonnerTestingVitest, React Testing Library, MSW

📁 Project Structure
erp-project-faraj/
│
├── client/ # React 19 + Vite frontend
│ └── src/
│ ├── components/ # Reusable UI (BarcodeScanner, ProtectedRoute, etc.)
│ ├── hooks/ # useInventorySocket (WebSocket hook)
│ ├── lib/ # Axios instance, procurement API
│ ├── pages/ # Route pages
│ │ ├── Dashboard.jsx
│ │ ├── Inventory.jsx
│ │ ├── Orders.jsx
│ │ ├── Procurement.jsx
│ │ ├── Users.jsx
│ │ └── ...
│ ├── store/ # Zustand stores (auth, socket)
│ └── **tests**/ # Vitest + MSW tests
│
└── server/ # Express.js backend API
├── controllers/ # Business logic
│ ├── inventoryController.js
│ ├── orderController.js
│ ├── authController.js
│ ├── userController.js
│ ├── purchaseOrderController.js
│ ├── supplierController.js
│ └── ...
├── models/ # Mongoose schemas
│ ├── Item.js
│ ├── Order.js
│ ├── StockBalance.js
│ ├── Transaction.js
│ ├── PurchaseOrder.js
│ └── ...
├── middleware/ # auth, validation, error handler, upload
├── routes/ # Express routers
├── schemas/ # Zod validation schemas
├── utils/ # AppError, Winston logger
└── **tests**/ # Jest + Supertest test suites
├── auth.test.js
├── inventory.test.js
├── orders.test.js
└── users.test.js

⚙️ Getting Started
Prerequisites

Node.js v18+
MongoDB (local) or a MongoDB Atlas cluster

1. Clone the repository
   bashgit clone https://github.com/faraj2003/erp-project-faraj.git
   cd erp-project-faraj
2. Configure environment variables
   Server — create server/.env:
   envNODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/factoryflow
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   Client — create client/.env:
   envVITE_API_URL=http://localhost:5000
3. Install dependencies
   bash# Terminal 1 — Backend
   cd server && npm install

# Terminal 2 — Frontend

cd client && npm install 4. Run in development mode
bash# Backend (http://localhost:5000)
cd server && npm run dev

# Frontend (http://localhost:5173)

cd client && npm run dev

🧪 Running Tests
bash# Backend — runs all 52 tests against an in-memory MongoDB replica set
cd server
npm test

# With watch mode

npm run test:watch

# With coverage report

npm run test:coverage
bash# Frontend — Vitest + MSW
cd client
npm test

🔑 API Overview
MethodEndpointAccessDescriptionPOST/api/auth/loginPublicLogin and receive JWTPOST/api/auth/registerAdminRegister a new userGET/api/inventoryAll rolesList items (supports ?type= and ?search=)POST/api/inventoryAdmin, ManagerCreate inventory itemGET/api/inventory/low-stockAll rolesItems below minStockLevelGET/api/inventory/transactionsAdmin, ManagerFull transaction ledgerPOST/api/ordersStaff, Manager, AdminCreate production orderPATCH/api/orders/:id/statusManager, AdminComplete order (ACID transaction)GET/api/usersAdmin onlyList all usersPATCH/api/users/:id/roleAdmin onlyPromote or demote a userGET/api/ordersAll rolesList orders with pagination

🏗️ Architecture Highlights
ACID Order Completion
When a production order is marked Completed, the entire operation — deducting all input stocks, adding all output stocks, and writing audit log entries — runs inside a single MongoDB session with startTransaction(). If any input item has insufficient stock, abortTransaction() is called and the database is left completely unchanged.
Multi-Location Stock Model
Stock is not stored on the Item document. Instead, a separate StockBalance collection stores quantity per (item, location) pair. This allows the same item to exist across multiple warehouses and shop floors with independent quantities.
Location-Scoped Visibility
Global roles (admin, manager, procurement_manager) see all stock across all locations. Location-bound roles (staff, shop_worker) only see data for their assigned facility, enforced at the query level.
Zod + Centralized Error Handling
Every route runs through a Zod validation middleware before reaching the controller. All errors — Mongoose validation errors, duplicate key errors, JWT errors, Zod errors, and CastErrors — are caught by a single errorHandler middleware and returned in a consistent { success, error, details } shape.

📜 License
MIT
