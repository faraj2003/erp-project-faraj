// src/__tests__/mocks/server.js
// Creates and configures the MSW server for the jsdom test environment.
// This file is imported by individual test files that need API mocking.

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
