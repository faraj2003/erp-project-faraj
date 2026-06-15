# FactoryFlow ERP 🏭

A full-stack, production-grade Enterprise Resource Planning (ERP) system designed for modern factory operations. FactoryFlow centralizes inventory, manufacturing, procurement, and warehouse activity into a single, secure, and scalable platform.

---

## 🚀 Highlights

* ACID-compliant manufacturing workflows using MongoDB transactions
* Real-time dashboards powered by WebSockets
* End-to-end procurement pipeline
* Multi-warehouse inventory with FIFO logic
* Zero-trust security with RBAC and XSS protection

---

## 🎯 Problem Solved

FactoryFlow addresses real-world manufacturing challenges such as inventory mismanagement, fragmented procurement systems, and lack of real-time operational visibility. It provides a unified platform to streamline factory workflows and improve decision-making.

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

* Multi-warehouse inventory tracking using FIFO logic
* Bill of Materials (BOM) kitting and automated stock deductions
* Cycle count audits for improved accuracy

### Full Procurement Pipeline

* Complete workflow:
  RFQs → Supplier Bids → Purchase Orders → Goods Receipts → 3-Way Invoice Matching

### ACID-Compliant Manufacturing Orders

* MongoDB session-based transactions ensure consistency
* Automatic rollback if raw materials are insufficient
* Prevents partial or corrupted data states

### Real-Time Analytics

* Live dashboards with socket-based updates
* Production tracking, stock valuation, and alerts

---

## 🛡️ Security Architecture

Built with a zero-trust approach:

* API rate limiting and single-session enforcement
* Global XSS sanitization and input validation
* Strict Role-Based Access Control (RBAC)
* Backend-enforced financial and business rules

---

## 🛠️ Tech Stack

### Backend

* Node.js 20
* Express v5
* MongoDB + Mongoose 9
* Socket.io
* JWT Authentication
* Zod Validation
* Helmet, XSS-Clean

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

| Role                  | Access Level                                |
| --------------------- | ------------------------------------------- |
| super_admin           | Full system control; creates other admins   |
| admin                 | Global access and reporting                 |
| manager               | Approves adjustments and purchase orders    |
| procurement_manager   | Manages vendor and procurement workflows    |
| dispatch_manager      | Handles outbound logistics (location-based) |
| shop_manager / worker | Restricted to assigned warehouse            |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/faraj2003/erp-project-faraj.git
cd erp-project-faraj
npm run install:all
```

### 2. Environment Setup

* Copy `.env.example` files in `/server` and `/client`
* Add MongoDB URI and JWT secrets

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

Uses an in-memory MongoDB replica set for safe integration testing.

```bash
# Backend Tests
cd server && npm test

# Frontend Tests
cd client && npm test
```

---

**Built for factory life — from raw material to finished goods.**
