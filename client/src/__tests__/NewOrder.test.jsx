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

const locationHandlers = [
  http.get('*/api/locations', () =>
    HttpResponse.json([{ _id: 'loc_1', name: 'Main Shop', type: 'shop' }])
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

describe('NewOrder — useFieldArray add/remove', () => {

  it('adds a new output row when "+ Add Output" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await user.click(screen.getByRole('button', { name: /add output/i }));

    expect(screen.getAllByPlaceholderText(/qty/i).length).toBe(3);
  });

  it('can add multiple output rows and remove them', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    const addBtn = screen.getByRole('button', { name: /add output/i });
    await user.click(addBtn);
    await user.click(addBtn);

    // 1 input + 3 output = 4
    expect(screen.getAllByPlaceholderText(/qty/i).length).toBe(4);

    const removeButtons = screen.getAllByText('✕');
    await user.click(removeButtons[removeButtons.length - 1]);

    expect(screen.getAllByPlaceholderText(/qty/i).length).toBe(3);
  });

  it('enables "+ Add Material" after a location is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    expect(screen.getByRole('button', { name: /add material/i })).toBeDisabled();

    // Target location select specifically by name attribute
    const locationSelect = document.querySelector('select[name="locationId"]');
    await waitFor(() => expect(locationSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(locationSelect, 'loc_1');

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

    // Select location by name
    const locationSelect = document.querySelector('select[name="locationId"]');
    await waitFor(() => expect(locationSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(locationSelect, 'loc_1');

    // Select finished good in output row
    const outputSelect = document.querySelector('select[name="outputs.0.itemId"]');
    await waitFor(() => expect(outputSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(outputSelect, 'item_2');

    // Fill output qty
    await user.type(document.querySelector('input[name="outputs.0.quantityProduced"]'), '5');

    // Fill input item — mock inventory has no balances for loc_1 so inputs.0.itemId stays empty
    // Zod requires inputs array to have itemId — inject directly via the hidden input
    // Instead: add a valid input row value by selecting from the input dropdown
    // Since locationRawMaterials will be empty (mock items have no balances), 
    // we skip input validation by removing the input row and relying on Zod min(1) not firing
    // Actually Zod min(1) WILL fire — so we must fill inputs too.
    // Workaround: update MSW inventory mock to include balances for loc_1
    server.use(
      http.get('*/api/inventory', () =>
        HttpResponse.json({
          success: true,
          count: 2,
          data: [
            {
              _id: 'item_1', sku: 'RAW-STL-01', name: 'Steel Rods', type: 'raw_material',
              baseUnit: 'kg',
              balances: [{ locationId: { _id: 'loc_1' }, quantity: 100 }],
            },
            {
              _id: 'item_2', sku: 'FIN-GEAR-01', name: 'Gear Assembly', type: 'finished_good',
              baseUnit: 'units',
              balances: [],
            },
          ],
        })
      )
    );

    // Re-select location to trigger re-filter of locationRawMaterials
    await user.selectOptions(locationSelect, '');
    await user.selectOptions(locationSelect, 'loc_1');

    const inputSelect = document.querySelector('select[name="inputs.0.itemId"]');
    await waitFor(() => expect(inputSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(inputSelect, 'item_1');
    await user.type(document.querySelector('input[name="inputs.0.quantityRequired"]'), '10');

    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/orders');
    }, { timeout: 3000 });
  });

  it('shows API error message if order creation fails', async () => {
    server.use(
      http.post('*/api/orders', () =>
        HttpResponse.json(
          { success: false, message: 'Duplicate order number' },
          { status: 400 }
        )
      ),
      http.get('*/api/inventory', () =>
        HttpResponse.json({
          success: true,
          count: 1,
          data: [
            {
              _id: 'item_1', sku: 'RAW-STL-01', name: 'Steel Rods', type: 'raw_material',
              baseUnit: 'kg',
              balances: [{ locationId: { _id: 'loc_1' }, quantity: 100 }],
            },
            {
              _id: 'item_2', sku: 'FIN-GEAR-01', name: 'Gear Assembly', type: 'finished_good',
              baseUnit: 'units', balances: [],
            },
          ],
        })
      )
    );

    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'PO-DUP-001');

    const locationSelect = document.querySelector('select[name="locationId"]');
    await waitFor(() => expect(locationSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(locationSelect, 'loc_1');

    const inputSelect = document.querySelector('select[name="inputs.0.itemId"]');
    await waitFor(() => expect(inputSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(inputSelect, 'item_1');
    await user.type(document.querySelector('input[name="inputs.0.quantityRequired"]'), '10');

    const outputSelect = document.querySelector('select[name="outputs.0.itemId"]');
    await waitFor(() => expect(outputSelect.options.length).toBeGreaterThan(1));
    await user.selectOptions(outputSelect, 'item_2');
    await user.type(document.querySelector('input[name="outputs.0.quantityProduced"]'), '5');

    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(screen.getByText(/duplicate order number/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(mockNavigate).not.toHaveBeenCalledWith('/orders');
  });

});
