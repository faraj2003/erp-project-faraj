# 🏭 FactoryFlow ERP

A modern full-stack ERP platform for factory and warehouse operations.

FactoryFlow centralizes inventory, manufacturing, procurement, analytics, and user management into a single real-time system built with a scalable JavaScript stack.

---

## 🤝 Collaboration & Credits

This project was developed collaboratively with:

* Tejas Lahade
* Karan Kamble
* Hrithik Rayapati

### 📂 Original Repository

This repository was copied and adapted from the original repository:

* [Original Repository (Symbi-Eat)](https://github.com/tejas2912/Symbi-Eat?utm_source=chatgpt.com)

GitHub Profile:

* [Tejas Lahade GitHub](https://github.com/tejas2912?utm_source=chatgpt.com)

### 👨‍💻 My Contribution

My primary contributions included:

* Payment integration
* Backend development
* API integration and server-side functionality
* Backend feature implementation

---

## 🌐 Live Demo

* Frontend: [FactoryFlow Frontend](https://erp-project-faraj.vercel.app?utm_source=chatgpt.com)
* Backend API: [FactoryFlow Backend API](https://erp-project-faraj.onrender.com?utm_source=chatgpt.com)

---

## ✨ Core Features

### 📦 Inventory Management

* Multi-location inventory tracking
* FIFO-based stock issuance
* Inventory transfers between facilities
* Low-stock alerts using configurable thresholds
* Inventory adjustment workflow:

  * Draft
  * Pending
  * Approved / Rejected
* Immutable inventory transaction ledger
* CSV export support
* Barcode scanning using `html5-qrcode`

### 🏗️ Manufacturing Orders

* Multi-input and output production orders
* Order status history tracking
* ACID-compliant manufacturing completion flow
* Automatic stock deduction and output stock creation
* Transaction rollback protection on insufficient inventory

### 🛒 Procurement Management

* Supplier management
* RFQ workflow
* Purchase Orders
* Goods Receipt handling
* Vendor invoice support
* Return Orders
* Historical supplier pricing

### 📊 Analytics & Reporting

* Real-time operational dashboard
* Inventory valuation metrics
* Low-stock monitoring
* BOM tracking
* Cycle count auditing
* Recharts-powered visual analytics

### 👥 User & Access Management

Supported roles:

* `admin`
* `manager`
* `staff`
* `shop_worker`
* `shop_manager`
* `procurement_manager`
* `dispatch_manager`

Features include:

* JWT authentication
* Role-Based Access Control (RBAC)
* Location-scoped visibility
* Admin-only user provisioning
* Role promotion & demotion

### ⚡ Real-Time Features

Powered by Socket.io:

* Live inventory updates
* Real-time stock synchronization
* Instant UI refresh across connected clients

---

## 🔐 Security

* JWT authentication
* bcrypt password hashing
* Helmet security headers
* API rate limiting
* Zod request validation
* Centralized error handling middleware
* CORS protection

---

## 🧪 Automated Testing

Comprehensive backend test coverage using:

* Jest
* Supertest
* mongodb-memory-server

### ✅ Covered Areas

* Authentication
* RBAC authorization
* Inventory workflows
* Transaction rollback integrity
* User management
* Manufacturing order completion

### ✅ Test Results

```txt
Test Suites: 4 passed, 4 total
Tests:       52 passed, 52 total
```

GitHub Actions automatically runs tests on every push and pull request.

---

## 🛠️ Tech Stack

### Backend

| Layer          | Technology                       |
| -------------- | -------------------------------- |
| Runtime        | Node.js                          |
| Framework      | Express.js v5                    |
| Database       | MongoDB + Mongoose               |
| Authentication | JWT + bcryptjs                   |
| Validation     | Zod                              |
| Real-Time      | Socket.io                        |
| Logging        | Winston + Morgan                 |
| Security       | Helmet, CORS, express-rate-limit |
| Testing        | Jest, Supertest                  |

### Frontend

| Layer            | Technology               |
| ---------------- | ------------------------ |
| Framework        | React 19 + Vite          |
| State Management | Zustand + React Query    |
| Routing          | React Router v7          |
| Styling          | Tailwind CSS v4          |
| Charts           | Recharts                 |
| Forms            | React Hook Form + Zod    |
| API Client       | Axios + Socket.io-client |
| Testing          | Vitest + RTL + MSW       |

---

## 📁 Project Structure

```bash
erp-project-faraj/
│
├── client/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── pages/
│       ├── store/
│       └── __tests__/
│
└── server/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── schemas/
    ├── utils/
    └── __tests__/
```

---

## ⚙️ Getting Started

### Prerequisites

* Node.js v18+
* MongoDB local instance or MongoDB Atlas

### 1️⃣ Clone Repository

```bash
git clone https://github.com/faraj2003/erp-project-faraj.git
cd erp-project-faraj
```

### 2️⃣ Configure Environment Variables

#### Server (`server/.env`)

```env
NODE_ENV=development
PORT=5000

MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/factoryflow

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173
```

#### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000
```

### 3️⃣ Install Dependencies

#### Backend

```bash
cd server
npm install
```

#### Frontend

```bash
cd client
npm install
```

### 4️⃣ Run Development Servers

#### Backend

```bash
cd server
npm run dev
```

Runs on:

```txt
http://localhost:5000
```

#### Frontend

```bash
cd client
npm run dev
```

Runs on:

```txt
http://localhost:5173
```

---

## 🚀 Deployment

### Frontend (Vercel)

```txt
https://erp-project-faraj.vercel.app
```

Environment variable:

```env
VITE_API_URL=https://erp-project-faraj.onrender.com
```

### Backend (Render)

```txt
https://erp-project-faraj.onrender.com
```

Environment variables:

```env
NODE_ENV=production
MONGO_URI=your_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=https://erp-project-faraj.vercel.app
```

---

## 🔑 Demo Credentials

```txt
Email:    admin@factoryflow.com
Password: AdminPassword123
```

The admin account allows:

* Inventory management
* Manufacturing order creation
* Analytics access
* Procurement management
* User management
* Role assignment

⚠️ Demo credentials are intended only for evaluation purposes.

---

## 🔑 API Overview

| Method | Endpoint                      | Access                | Description               |
| ------ | ----------------------------- | --------------------- | ------------------------- |
| POST   | `/api/auth/login`             | Public                | Login                     |
| POST   | `/api/auth/register`          | Admin                 | Register user             |
| GET    | `/api/inventory`              | All Roles             | Inventory list            |
| POST   | `/api/inventory`              | Admin, Manager        | Create inventory item     |
| GET    | `/api/inventory/low-stock`    | All Roles             | Low-stock items           |
| GET    | `/api/inventory/transactions` | Admin, Manager        | Inventory ledger          |
| POST   | `/api/orders`                 | Staff, Manager, Admin | Create production order   |
| PATCH  | `/api/orders/:id/status`      | Manager, Admin        | Complete production order |
| GET    | `/api/orders`                 | All Roles             | Paginated orders          |
| GET    | `/api/users`                  | Admin                 | User list                 |
| PATCH  | `/api/users/:id/role`         | Admin                 | Update role               |

---

## 🏗️ Architecture Highlights

### 🔒 ACID Transaction Safety

Manufacturing order completion runs inside MongoDB transactions:

```js
session.startTransaction();
```

Operations handled atomically:

* Deduct input stock
* Add output stock
* Create audit logs
* Update order status

If any step fails:

```js
abortTransaction();
```

ensures rollback consistency.

### 📦 Multi-Location Inventory Model

Inventory quantities are separated using:

```txt
StockBalance
```

This supports:

* Multiple warehouses
* Shop floor tracking
* Location-based inventory visibility
* Scalable inventory architecture

---

## 🚀 Future Improvements

* Multi-tenant support
* Redis caching layer
* Event-driven architecture
* Email notifications
* Demand forecasting
* PDF invoice generation
* Kubernetes deployment

---

## 📜 License

Licensed under the MIT License.
