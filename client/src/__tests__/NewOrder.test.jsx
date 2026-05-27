// src/__tests__/NewOrder.test.jsx
import { describe, it, expect, beforeAll, afterEach, afterAll, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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

// Mock locations, categories, units so dropdowns populate
const locationHandlers = [
  http.get('*/api/locations', () =>
    HttpResponse.json([
      { _id: 'loc_1', name: 'Main Shop', type: 'shop' },
    ])
  ),
  http.get('*/api/system/categories', () =>
    HttpResponse.json({ success: true, data: [] })
  ),
  http.get('*/api/system/units', () =>
    HttpResponse.json({ success: true, data: [{ _id: 'u1', name: 'kg', abbreviation: 'kg' }] })
  ),
];

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

beforeEach(() => {
  mockNavigate.mockClear();
  server.use(...locationHandlers);
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

// ── Form structure ───────────────────────────────────────────────────

describe('NewOrder — form structure', () => {

  it('renders order number field, inputs section and outputs section', () => {
    renderWithProviders(<NewOrder />);
    expect(screen.getByPlaceholderText(/PO-2026-001/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Raw Material Inputs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Finished Good Outputs/i })).toBeInTheDocument();
  });

  it('starts with one input row and one output row by default', () => {
    renderWithProviders(<NewOrder />);
    const qtyInputs = screen.getAllByPlaceholderText(/qty/i);
    expect(qtyInputs.length).toBe(2);
  });

});

// ── useFieldArray add/remove ─────────────────────────────────────────
// Note: "+ Add Material" is disabled until a location is selected.
// Output rows have no such restriction and can be tested freely.

describe('NewOrder — useFieldArray add/remove', () => {

  it('adds a new output row when "+ Add Output" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await user.click(screen.getByRole('button', { name: /add output/i }));

    const qtyInputs = screen.getAllByPlaceholderText(/qty/i);
    expect(qtyInputs.length).toBe(3); // 1 input + 2 output rows
  });

  it('can add multiple output rows and remove them individually', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    const addBtn = screen.getByRole('button', { name: /add output/i });
    await user.click(addBtn);
    await user.click(addBtn);

    // 1 input row + 3 output rows = 4 qty fields
    expect(screen.getAllByPlaceholderText(/qty/i).length).toBe(4);

    // Remove one output row — click the last ✕ button
    const removeButtons = screen.getAllByText('✕');
    await user.click(removeButtons[removeButtons.length - 1]);

    expect(screen.getAllByPlaceholderText(/qty/i).length).toBe(3);
  });

  it('enables "+ Add Material" after a location is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    // Button starts disabled
    expect(screen.getByRole('button', { name: /add material/i })).toBeDisabled();

    // Wait for locations to load then select one
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '' })).toBeInTheDocument();
    });

    const locationSelect = screen.getAllByRole('combobox')[0];
    await waitFor(() => expect(locationSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(locationSelect, 'loc_1');

    // Button should now be enabled
    expect(screen.getByRole('button', { name: /add material/i })).not.toBeDisabled();
  });

});

// ── Zod validation ───────────────────────────────────────────────────

describe('NewOrder — Zod validation', () => {

  it('shows validation error when order number is empty on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(screen.getByText(/order number is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid order number format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'invalid order!!');
    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(screen.getByText(/uppercase letters, numbers, and dashes/i)).toBeInTheDocument();
    });
  });

  it('shows location validation error when no location is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'PO-TEST-001');
    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(screen.getByText(/you must select a shop or location/i)).toBeInTheDocument();
    });
  });

});

// ── Successful submission ────────────────────────────────────────────

describe('NewOrder — successful submission', () => {

  it('navigates to /orders after successful submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    // Fill order number
    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'PO-TEST-001');

    // Select location
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects[0].options.length).toBeGreaterThan(1);
    });
    const locationSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(locationSelect, 'loc_1');

    // Fill output qty (inputs are disabled without location stock data in mock)
    const qtyFields = screen.getAllByPlaceholderText(/qty/i);
    await user.type(qtyFields[1], '5');

    // Select a finished good in output row
    const outputSelect = screen.getAllByRole('combobox').find(
      s => s.querySelector('option[value="item_2"]')
    );
    if (outputSelect) await user.selectOptions(outputSelect, 'item_2');

    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/orders');
    });
  });

  it('shows API error message if order creation fails', async () => {
    server.use(
      http.post('*/api/orders', () =>
        HttpResponse.json(
          { success: false, message: 'Duplicate order number' },
          { status: 400 }
        )
      )
    );

    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'PO-DUP-001');

    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects[0].options.length).toBeGreaterThan(1);
    });
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'loc_1');

    const qtyFields = screen.getAllByPlaceholderText(/qty/i);
    await user.type(qtyFields[1], '5');

    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(screen.getByText(/duplicate order number/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/orders');
  });

});
