# FactoryFlow ERP 🏭

A full-stack, production-grade Enterprise Resource Planning (ERP) system designed for modern factory operations. FactoryFlow centralizes inventory management, manufacturing workflows, procurement processes, and real-time warehouse activity into a single, secure, and scalable platform.

---

## 🌐 Live Demo

* **Frontend:** https://erp-project-faraj.vercel.app
* **Backend API:** https://erp-project-faraj.onrender.com

**Demo Credentials (Super Admin):**

Email: [admin@factoryflow.com](mailto:admin@factoryflow.com)
Password: AdminPassword123

---

## ✨ Core Features

### Smart Inventory & BOM

* Multi-warehouse inventory tracking using strict FIFO logic
* Bill of Materials (BOM) kitting and automated stock deductions
* Cycle count audits for inventory accuracy

### Full Procurement Pipeline

* End-to-end supply chain workflow:
  RFQs → Supplier Bids → Purchase Orders → Goods Receipts → 3-Way Invoice Matching

### ACID-Compliant Manufacturing Orders

* MongoDB session-based transactions ensure data consistency
* Automatic rollback of orders when raw materials are insufficient
* Prevents partial or inconsistent database states

### Real-Time Analytics

* Live dashboards powered by socket-based updates
* Production monitoring, stock valuation trends, and alert systems

---

## 🛡️ Enterprise-Grade Security Architecture

FactoryFlow is built using a zero-trust security model to ensure maximum data protection.

* **Authentication Security:**
  API rate limiting prevents brute-force attacks, and single-session enforcement blocks concurrent logins

* **Data Integrity:**
  Global XSS sanitization and regex-based hardware validation (e.g., barcode scanners) prevent malicious inputs

* **Role-Based Access Control (RBAC):**
  Fine-grained permission system with strict hierarchy to prevent privilege escalation

* **Server-Side Validation:**
  Critical business and financial rules are enforced on the backend, including fraud detection and transaction validation

---

## 🛠️ Tech Stack

### Backend

* Node.js 20
* Express v5
* MongoDB with Mongoose 9
* Socket.io
* JWT Authentication
* Zod Validation
* Helmet & XSS-Clean

### Frontend

* React 19
* Vite
* Zustand
* TanStack Query v5
* Tailwind CSS v4
* Axios

### Testing

* Backend: Jest, Supertest
* Frontend: Vitest, React Testing Library (RTL), MSW

---

## 🔐 Role & Permission Matrix

| Role                  | Access Level                                 |
| --------------------- | -------------------------------------------- |
| super_admin           | Full system control; can create other admins |
| admin                 | Global system access and reporting           |
| manager               | Approves adjustments and purchase orders     |
| procurement_manager   | Handles vendor and procurement workflows     |
| dispatch_manager      | Manages outbound logistics (location-scoped) |
| shop_manager / worker | Restricted to assigned warehouse             |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/faraj2003/erp-project-faraj.git
cd erp-project-faraj
npm run install:all
```

### 2. Environment Setup

* Copy `.env.example` files in both `/server` and `/client`
* Add your MongoDB URI and JWT secrets

### 3. Seed & Run

```bash
cd server
node seed.js
node seed-mock-data.js
node seed-procurement.js

npm run dev
```

---

## 🧪 Automated Testing

FactoryFlow uses an in-memory MongoDB replica set to run full backend integration tests without affecting a real database.

```bash
# Backend Tests
cd server && npm test

# Frontend Tests
cd client && npm test
```

---

**Built for factory life — from raw material to finished goods.**
