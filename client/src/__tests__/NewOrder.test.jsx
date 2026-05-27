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

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

beforeEach(() => {
  mockNavigate.mockClear();
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
    expect(screen.getByRole('heading', { name: /Raw Material Inputs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Finished Good Outputs/i })).toBeInTheDocument();
  });

  it('starts with one input row and one output row by default', async () => {
    renderWithProviders(<NewOrder />);

    const qtyInputs = screen.getAllByPlaceholderText(/qty/i);
    expect(qtyInputs.length).toBe(2);
  });
});

describe('NewOrder — useFieldArray add/remove', () => {

  it('adds a new input row when "+ Add Material" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    const addMaterialBtn = screen.getByRole('button', { name: /add material/i });
    await user.click(addMaterialBtn);

    const qtyInputs = screen.getAllByPlaceholderText(/qty/i);
    expect(qtyInputs.length).toBe(3);
  });

  it('adds a new output row when "+ Add Output" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    const addOutputBtn = screen.getByRole('button', { name: /add output/i });
    await user.click(addOutputBtn);

    const qtyInputs = screen.getAllByPlaceholderText(/qty/i);
    expect(qtyInputs.length).toBe(3);
  });

  it('can add multiple rows and remove them individually', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    const addBtn = screen.getByRole('button', { name: /add material/i });
    await user.click(addBtn);
    await user.click(addBtn);

    // 3 input rows + 1 output row = 4 qty fields
    expect(screen.getAllByPlaceholderText(/qty/i).length).toBe(4);

    // Remove one — click the first ✕ button (they have text ✕)
    const removeButtons = screen.getAllByText('✕');
    await user.click(removeButtons[0]);

    expect(screen.getAllByPlaceholderText(/qty/i).length).toBe(3);
  });
});

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

    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'invalid order number!');
    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(screen.getByText(/uppercase letters, numbers, and dashes/i)).toBeInTheDocument();
    });
  });

});

describe('NewOrder — successful submission', () => {

  it('submits the form and navigates to /orders on success', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewOrder />);

    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    await user.type(screen.getByPlaceholderText(/PO-2026-001/i), 'PO-TEST-001');

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], selects[0].options[1]);

    const qtyFields = screen.getAllByPlaceholderText(/qty/i);
    await user.type(qtyFields[0], '10');

    await user.selectOptions(selects[1], selects[1].options[1]);
    await user.type(qtyFields[1], '5');

    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/orders');
    });
  });

  it('shows API error message if order creation fails', async () => {
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

    await user.click(screen.getByRole('button', { name: /create production order/i }));

    await waitFor(() => {
      expect(screen.getByText(/duplicate order number/i)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/orders');
  });
});
