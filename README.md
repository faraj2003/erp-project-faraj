# FactoryFlow ERP 🏭

FactoryFlow is a **full-stack, production-ready Enterprise Resource Planning (ERP) system** designed to manage **inventory, orders, users, and analytics**. It is built using a modern JavaScript stack and includes **real-time updates, secure authentication, structured logging, and automated testing**.

---

# ✨ Key Features

### Real-Time Inventory Management

Live inventory updates across all connected clients using **Socket.io WebSockets**.

### Secure Authentication

JWT-based authentication with **bcrypt password hashing** and **API rate-limiting** to prevent brute-force attacks.

### Production-Grade Backend

Includes centralized error handling, request validation using **Zod**, and structured logging with **Winston**.

### Modern Frontend Architecture

Frontend built using **React 19 + Vite**, with:

- Zustand for global state
- TanStack React Query for server-state caching
- React Hook Form for performant validation

### Comprehensive Testing

High test coverage using:

- **Jest + Supertest** for backend API testing
- **Vitest + React Testing Library** for frontend components

---

# 🛠️ Tech Stack

## Frontend (`/client`)

### Core

- React 19
- Vite

### State Management

- Zustand
- TanStack Query (React Query)

### Routing

- React Router v7

### Styling & UI

- Tailwind CSS v4
- Recharts (Data Visualization)

### Forms & Validation

- React Hook Form
- Zod

### Real-Time & API

- Axios
- Socket.io-client

### Testing

- Vitest
- React Testing Library
- MSW (Mock Service Worker)

---

## Backend (`/server`)

### Core

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose

### Security

- Helmet
- CORS
- Express Rate Limit

### Validation & Authentication

- Zod
- JSON Web Tokens (JWT)
- bcryptjs

### Logging & Monitoring

- Winston
- Morgan

### Real-Time

- Socket.io

### Testing

- Jest
- Supertest
- MongoDB Memory Server

---

# 🚀 Getting Started

## Prerequisites

Make sure the following are installed:

- Node.js (v18 or higher)
- MongoDB (Local installation or MongoDB Atlas)

Download:

- [https://nodejs.org/](https://nodejs.org/)
- [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

---

# 1️⃣ Clone the Repository

```bash
git clone https://github.com/faraj2003/erp-project-faraj.git
cd erp-project-faraj
```

---

# 2️⃣ Environment Setup

You must configure **environment variables for both server and client**.

---

## Server Setup (`/server`)

Create a `.env` file inside the **server folder**.

```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/factoryflow
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

---

## Client Setup (`/client`)

Create a `.env` file inside the **client folder**.

```
VITE_API_URL=http://localhost:5000
```

---

# 3️⃣ Install Dependencies

Open **two terminals**.

---

### Terminal 1 (Backend)

```bash
cd server
npm install
```

---

### Terminal 2 (Frontend)

```bash
cd client
npm install
```

---

# 4️⃣ Run the Application (Development Mode)

---

## Start Backend

```bash
cd server
npm run dev
```

Backend will run on:

```
http://localhost:5000
```

---

## Start Frontend

```bash
cd client
npm run dev
```

Frontend will run on:

```
http://localhost:5173
```

---

# 🧪 Testing

Both frontend and backend include **automated testing suites**.

---

## Backend Tests

Uses **mongodb-memory-server** to run tests with an isolated in-memory database.

```bash
cd server

npm test
npm run test:watch
npm run test:coverage
```

---

## Frontend Tests

Uses **Vitest + MSW** to mock API responses.

```bash
cd client

npm test
npm run test:coverage
```

---

# 📁 Project Structure

```
erp-project-faraj/
│
├── client/                     # React frontend
│   ├── src/
│   │   ├── assets/             # Static files
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Axios instance & utilities
│   │   ├── pages/              # Route pages (Dashboard, Inventory, etc.)
│   │   ├── store/              # Zustand global stores
│   │   └── __tests__/          # Vitest tests & MSW mocks
│   │
│   └── package.json
│
├── server/                     # Express backend API
│   ├── config/                 # Database & environment configs
│   ├── controllers/            # Business logic
│   ├── middleware/             # Custom middleware
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # Express routes
│   ├── schemas/                # Zod validation schemas
│   ├── utils/                  # Logger, AppError, helpers
│   ├── __tests__/              # Jest + Supertest tests
│   │
│   └── package.json
│
└── README.md
```

---

# 📈 Future Improvements

Possible improvements for the system:

- Role-based admin dashboard
- Advanced analytics
- Production deployment with Docker
- CI/CD pipeline (GitHub Actions)
- Email notifications
- Audit logs

---

# 📜 License

This project is open source and available under the **MIT License**.

---
