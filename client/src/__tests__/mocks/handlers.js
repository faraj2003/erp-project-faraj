// src/__tests__/mocks/handlers.js
// MSW (Mock Service Worker) request handlers.
// These intercept axios calls in the jsdom environment so tests
// never make real HTTP requests — they get predictable fake responses.

import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:5173'; // Vite dev server default

export const handlers = [

  // ── Auth ─────────────────────────────────────────────────────────

  http.post('*/api/auth/login', async ({ request }) => {
    const body = await request.json();

    if (body.email === 'admin@test.com' && body.password === 'password123') {
      return HttpResponse.json({
        success: true,
        data: {
          _id: 'user_123',
          name: 'Test Admin',
          email: 'admin@test.com',
          role: 'admin',
          token: 'fake.jwt.token.for.testing',
        },
      });
    }

    return HttpResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 }
    );
  }),

  // ── Inventory ─────────────────────────────────────────────────────

  http.get('*/api/inventory', () => {
    return HttpResponse.json({
      success: true,
      count: 2,
      data: [
        { _id: 'item_1', sku: 'RAW-STL-01', name: 'Steel Rods', type: 'raw_material', currentStock: 80, minStockLevel: 50, unit: 'kg' },
        { _id: 'item_2', sku: 'FIN-GEAR-01', name: 'Gear Assembly', type: 'finished_good', currentStock: 5, minStockLevel: 20, unit: 'units' },
      ],
    });
  }),

  http.get('*/api/inventory/low-stock', () => {
    return HttpResponse.json({
      success: true,
      count: 1,
      data: [
        { _id: 'item_2', sku: 'FIN-GEAR-01', name: 'Gear Assembly', type: 'finished_good', currentStock: 5, minStockLevel: 20, unit: 'units' },
      ],
    });
  }),

  http.post('*/api/inventory', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { _id: 'new_item', ...body },
    }, { status: 201 });
  }),

  // ── Orders ────────────────────────────────────────────────────────

  http.get('*/api/orders', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          _id: 'order_1',
          orderNumber: 'PO-2026-001',
          status: 'Pending',
          managerId: { name: 'Test Admin', email: 'admin@test.com' },
          inputs: [{ _id: 'i1', itemId: { name: 'Steel Rods', sku: 'RAW-STL-01', unit: 'kg' }, quantityRequired: 20 }],
          outputs: [{ _id: 'o1', itemId: { name: 'Gear Assembly', sku: 'FIN-GEAR-01', unit: 'units' }, quantityProduced: 5 }],
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    });
  }),

  http.post('*/api/orders', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { _id: 'new_order', status: 'Pending', ...body },
    }, { status: 201 });
  }),

  // ── Analytics ─────────────────────────────────────────────────────

  http.get('*/api/analytics/production', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { _id: 'Gear Assembly', totalProduced: 150, lastProductionDate: new Date().toISOString() },
        { _id: 'Steel Frame',   totalProduced: 80,  lastProductionDate: new Date().toISOString() },
      ],
    });
  }),

  http.get('*/api/analytics/trends', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { month: 'Jan 2026', totalProduced: 50, orderCount: 3 },
        { month: 'Feb 2026', totalProduced: 80, orderCount: 5 },
        { month: 'Mar 2026', totalProduced: 120, orderCount: 7 },
      ],
    });
  }),

  http.get('*/api/analytics/stock-movement', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { _id: 'Gear Assembly', added: 150, deducted: 0 },
        { _id: 'Steel Rods',    added: 0,   deducted: 200 },
      ],
    });
  }),

  // ── Users ─────────────────────────────────────────────────────────

  http.get('*/api/users', () => {
    return HttpResponse.json({
      success: true,
      count: 2,
      data: [
        { _id: 'user_1', name: 'Admin User', email: 'admin@test.com', role: 'admin', createdAt: new Date().toISOString() },
        { _id: 'user_2', name: 'Staff User', email: 'staff@test.com', role: 'staff', createdAt: new Date().toISOString() },
      ],
    });
  }),
];
