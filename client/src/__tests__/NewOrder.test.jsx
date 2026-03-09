// src/__tests__/NewOrder.test.jsx
// TRD §6: Tests for the dynamic Order Builder form.
// Verifies useFieldArray add/remove row behaviour,
// Zod validation error display, and successful submission.

import { describe, it, expect, beforeAll, afterEach, afterAll, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from './utils/renderWithProviders';
import { server } from './mocks/server';
import { useAuthStore } from '../store/authStore';
import { act } from '@testing-library/react';
import NewOrder from '../pages/NewOrder';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

beforeEach(() => {
  mockNavigate.mockClear();
  // Set a manager user so the form is accessible
  act(() => {
    useAuthStore.setState({
      user: { _id: 'mgr_1', name: 'Manager', email: 'mgr@test.com', role: 'manager' },
      token: 'manager.token',
      isAuthenticated: true,
    });
  });
});

afterEach(() => {
  server.resetHandlers();
  act(() => useAuthStore.setState({ user: null, token: null, isAuthenticated: false }));
});

afterAll(() => server.close());

describe('NewOrder — form structure', () => {

  it('renders order number field, inputs section and outputs section', async () => {
    renderWithProviders(<NewOrder />);

    expect(screen.getByPlaceholderText(/PO-2026-001/i)).toBeInTheDocument();
    
    // FIX: Using getByRole('heading') avoids matching the paragraph description text
    expect(screen.getByRole('heading', { name: /Raw Material Inputs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Finished Good Outputs/i })).toBeInTheDocument();
  });

  it('starts with one input row and one output row by default', async () => {
    renderWithProviders(<NewOrder />);

    // Each row has a qty placeholder
    const qtyInputs = screen.getAllByPlaceholderText(/qty/i);
    expect(qtyInputs.length).toBe(2); // 1 input row + 1 output row
  });
});

describe('NewOrder — useFieldArray add/remove', () => {

  it('adds a new input row when "+ Add Material" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    const addMaterialBtn = screen.getByRole('button', { name: /add material/i });
    await user.click(addMaterialBtn);

    // Should now have 3 qty fields (2 input rows + 1 output row)
    const qtyInputs = screen.getAllByPlaceholderText(/qty/i);
    expect(qtyInputs.length).toBe(3);
  });

  it('adds a new output row when "+ Add Output" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    const addOutputBtn = screen.getByRole('button', { name: /add output/i });
    await user.click(addOutputBtn);

    const qtyInputs = screen.getAllByPlaceholderText(/qty/i);
    expect(qtyInputs.length).toBe(3); // 1 input + 2 output rows
  });

  it('can add multiple rows and remove them individually', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    // Add 2 more input rows (total 3)
    const addBtn = screen.getByRole('button', { name: /add material/i });
    await user.click(addBtn);
    await user.click(addBtn);

    // 3 input rows + 1 output row = 4 qty fields
    expect(screen.getAllByPlaceholderText(/qty/i).length).toBe(4);

    // Remove one — click the first ✕ button
    const removeButtons = screen.getAllByTitle(/remove row/i);
    await user.click(removeButtons[0]);

    // Back to 3 qty fields
    expect(screen.getAllByPlaceholderText(/qty/i).length).toBe(3);
  });
});

describe('NewOrder — Zod validation', () => {

  it('shows validation error when order number is empty on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    // Submit without filling anything
    await user.click(screen.getByRole('button', { name: /create order/i }));

    await waitFor(() => {
      expect(screen.getByText(/order number is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid order number format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'invalid order number!');
    await user.click(screen.getByRole('button', { name: /create order/i }));

    await waitFor(() => {
      expect(screen.getByText(/uppercase letters, numbers, and dashes/i)).toBeInTheDocument();
    });
  });

});

describe('NewOrder — successful submission', () => {

  it('submits the form and navigates to /orders on success', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    // Wait for inventory items to load in the dropdowns
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    // Fill order number
    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'PO-TEST-001');

    // Select raw material in first input row
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], selects[0].options[1]); // pick first real option

    // Fill quantity for input
    const qtyFields = screen.getAllByPlaceholderText(/qty/i);
    await user.type(qtyFields[0], '10');

    // Select finished good in output row
    await user.selectOptions(selects[1], selects[1].options[1]);

    // Fill quantity for output
    await user.type(qtyFields[1], '5');

    // Submit
    await user.click(screen.getByRole('button', { name: /create order/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/orders');
    });
  });

  it('shows API error message if order creation fails', async () => {
    // Override the POST /api/orders handler to return an error
    server.use(
      http.post('*/api/orders', () =>
        HttpResponse.json(
          { success: false, error: 'Duplicate order number' },
          { status: 400 }
        )
      )
    );

    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
    });

    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'PO-DUP-001');

    const selects = screen.getAllByRole('combobox');
    if (selects[0].options.length > 1) await user.selectOptions(selects[0], selects[0].options[1]);
    if (selects[1].options.length > 1) await user.selectOptions(selects[1], selects[1].options[1]);

    const qtyFields = screen.getAllByPlaceholderText(/qty/i);
    await user.type(qtyFields[0], '10');
    await user.type(qtyFields[1], '5');

    await user.click(screen.getByRole('button', { name: /create order/i }));

    await waitFor(() => {
      expect(screen.getByText(/duplicate order number/i)).toBeInTheDocument();
    });

    // Should NOT navigate away
    expect(mockNavigate).not.toHaveBeenCalledWith('/orders');
  });
});