// src/__tests__/setup.js
// Global setup for all Vitest frontend tests.
// Runs before each test file.

import '@testing-library/jest-dom';

// MSW needs to know the base URL — set it before any module imports fire
if (!import.meta.env.VITE_API_URL) {
  Object.defineProperty(import.meta, 'env', {
    value: { ...import.meta.env, VITE_API_URL: 'http://localhost:5000' },
    writable: true,
  });
}

// Mock localStorage (jsdom has it but Zustand's persist reads it — ensure it's clean)
beforeEach(() => {
  localStorage.clear();
});

// Silence noisy React/RTL console.error output during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') ||
        args[0].includes('ReactDOM.render') ||
        args[0].includes('act('))
    ) return;
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

