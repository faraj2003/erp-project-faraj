// src/__tests__/Login.test.jsx
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './utils/renderWithProviders';
import { server } from './mocks/server';
import { useAuthStore } from '../store/authStore';
import { act } from '@testing-library/react';
import Login from '../pages/Login';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  act(() => useAuthStore.setState({ user: null, token: null, isAuthenticated: false }));
});
afterAll(() => server.close());

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('Login page', () => {

  it('renders the login form with email field and authorize button', () => {
    renderWithProviders(<Login />);
    expect(screen.getByPlaceholderText(/operator@company.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /authorize/i })).toBeInTheDocument();
  });

  it('renders the FactoryFlow branding', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText('FactoryFlow')).toBeInTheDocument();
  });

  it('on valid credentials: populates auth store and navigates to /dashboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText(/operator@company.com/i), 'admin@test.com');
    // target password input by type since it has no accessible label text
    await user.type(document.querySelector('input[type="password"]'), 'password123');
    await user.click(screen.getByRole('button', { name: /authorize/i }));

    await waitFor(() => {
      const { isAuthenticated, token, user: storedUser } = useAuthStore.getState();
      expect(isAuthenticated).toBe(true);
      expect(token).toBe('fake.jwt.token.for.testing');
      expect(storedUser.email).toBe('admin@test.com');
      expect(storedUser.role).toBe('admin');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('on invalid credentials: does NOT navigate and does NOT update store', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText(/operator@company.com/i), 'wrong@test.com');
    await user.type(document.querySelector('input[type="password"]'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /authorize/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');
  });

  it('redirects already-authenticated users away from login', () => {
    act(() => {
      useAuthStore.setState({
        user: { _id: '1', name: 'Admin', email: 'a@test.com', role: 'admin' },
        token: 'existing.token',
        isAuthenticated: true,
      });
    });

    renderWithProviders(<Login />, { initialEntries: ['/login'] });
    expect(screen.queryByRole('button', { name: /authorize/i })).not.toBeInTheDocument();
  });

});
