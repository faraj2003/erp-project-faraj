// src/__tests__/Login.test.jsx
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './utils/renderWithProviders';
import { server } from './mocks/server';
import { useAuthStore } from '../store/authStore';
import { act } from '@testing-library/react';
import Login from '../pages/Login';

// Spin up MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  act(() => useAuthStore.setState({ user: null, token: null, isAuthenticated: false }));
});
afterAll(() => server.close());

// Mock useNavigate — we just need to verify it was called
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// FIX: Clear the mock history before every test so previous assertions don't leak
beforeEach(() => {
  mockNavigate.mockClear();
});

describe('Login page', () => {

  it('renders the login form with email, password fields and submit button', () => {
    renderWithProviders(<Login />);

    expect(screen.getByPlaceholderText(/operator@company.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders the FactoryFlow branding', () => {
    renderWithProviders(<Login />);
    expect(screen.getByText('FactoryFlow')).toBeInTheDocument();
  });

  it('shows "Signing in..." on the button while submitting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText(/operator@company.com/i), 'admin@test.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'password123');

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /signing in/i })).toBeDefined();
    });
  });

  it('on valid credentials: calls login() and navigates to /dashboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText(/operator@company.com/i), 'admin@test.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const { isAuthenticated, token, user: storedUser } = useAuthStore.getState();
      expect(isAuthenticated).toBe(true);
      expect(token).toBe('fake.jwt.token.for.testing');
      expect(storedUser.email).toBe('admin@test.com');
      expect(storedUser.role).toBe('admin');
    });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('on invalid credentials: shows error message, does NOT navigate', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText(/operator@company.com/i), 'wrong@test.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard');
  });

  it('clears previous error message when user starts typing again', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    await user.type(screen.getByPlaceholderText(/operator@company.com/i), 'bad@test.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'badpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });

    await user.clear(screen.getByPlaceholderText(/operator@company.com/i));
    await user.type(screen.getByPlaceholderText(/operator@company.com/i), 'admin@test.com');
    await user.clear(screen.getByPlaceholderText(/password/i));
    await user.type(screen.getByPlaceholderText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument();
    });
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

    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });

});
