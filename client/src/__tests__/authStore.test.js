// src/__tests__/authStore.test.js
// TRD §6: Tests that Zustand store accurately updates upon logout
// and that role helpers return correct values.

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from '../store/authStore';

// Helper to get fresh store state
const getStore = () => useAuthStore.getState();

// Reset store between tests
beforeEach(() => {
  act(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });
  localStorage.clear();
});

// ── Initial state ──────────────────────────────────────────────────

describe('authStore — initial state', () => {
  it('starts unauthenticated with no user or token', () => {
    const { user, token, isAuthenticated } = getStore();
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
  });
});

// ── login() ────────────────────────────────────────────────────────

describe('authStore — login()', () => {
  it('sets user, token, and isAuthenticated to true', () => {
    const userData = { _id: '123', name: 'Test Admin', email: 'admin@test.com', role: 'admin' };
    const token = 'fake.jwt.token';

    act(() => getStore().login(userData, token));

    const { user, token: storedToken, isAuthenticated } = getStore();
    expect(user).toEqual(userData);
    expect(storedToken).toBe(token);
    expect(isAuthenticated).toBe(true);
  });

  it('persists auth state to localStorage via Zustand persist middleware', () => {
    const userData = { _id: '456', name: 'Jane', email: 'jane@test.com', role: 'manager' };

    act(() => getStore().login(userData, 'my-token'));

    const raw = localStorage.getItem('factoryflow-auth');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.state.token).toBe('my-token');
    expect(parsed.state.user.email).toBe('jane@test.com');
    expect(parsed.state.isAuthenticated).toBe(true);
  });
});

// ── logout() ───────────────────────────────────────────────────────

describe('authStore — logout()', () => {
  it('clears user, token, and sets isAuthenticated to false', () => {
    // Login first
    act(() => getStore().login(
      { _id: '789', name: 'User', email: 'u@test.com', role: 'staff' },
      'some.token'
    ));
    expect(getStore().isAuthenticated).toBe(true);

    // Then logout
    act(() => getStore().logout());

    const { user, token, isAuthenticated } = getStore();
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('clears localStorage on logout', () => {
    act(() => getStore().login(
      { _id: '789', name: 'User', email: 'u@test.com', role: 'staff' },
      'some.token'
    ));

    // localStorage should have auth data
    expect(JSON.parse(localStorage.getItem('factoryflow-auth')).state.isAuthenticated).toBe(true);

    act(() => getStore().logout());

    // After logout, persisted state should reflect logged-out
    const raw = localStorage.getItem('factoryflow-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      expect(parsed.state.isAuthenticated).toBe(false);
      expect(parsed.state.token).toBeNull();
    }
  });
});

// ── Role helpers ───────────────────────────────────────────────────

describe('authStore — role helpers', () => {
  it('isAdmin() returns true only for admin role', () => {
    act(() => getStore().login({ role: 'admin' }, 'token'));
    expect(getStore().isAdmin()).toBe(true);

    act(() => useAuthStore.setState({ user: { role: 'manager' } }));
    expect(getStore().isAdmin()).toBe(false);

    act(() => useAuthStore.setState({ user: { role: 'staff' } }));
    expect(getStore().isAdmin()).toBe(false);
  });

  it('isManager() returns true for manager AND admin', () => {
    act(() => useAuthStore.setState({ user: { role: 'admin' } }));
    expect(getStore().isManager()).toBe(true);

    act(() => useAuthStore.setState({ user: { role: 'manager' } }));
    expect(getStore().isManager()).toBe(true);

    act(() => useAuthStore.setState({ user: { role: 'staff' } }));
    expect(getStore().isManager()).toBe(false);
  });

  it('getRole() returns current role string or null', () => {
    expect(getStore().getRole()).toBeNull(); // no user

    act(() => useAuthStore.setState({ user: { role: 'manager' } }));
    expect(getStore().getRole()).toBe('manager');
  });
});
