// src/hooks/useInventorySocket.js
// TRD §3.4 — WebSocket link between Socket.io and React Query cache.
//
// When the server emits 'inventory_updated' (after an order is completed),
// this hook silently invalidates ALL queries whose key starts with 'inventory'
// or 'orders' — causing React Query to background-refetch those tables/charts
// without any manual page refresh.
//
// Usage: drop `useInventorySocket()` in any component that should stay live.
// Currently used in AppShell so ALL pages benefit automatically.

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export const useInventorySocket = () => {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    // Don't connect if there's no token (user not logged in)
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token }, // Pass JWT so server can verify the socket connection
      transports: ['websocket'], // Skip long-polling — go straight to WS
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    // ── THE KEY EVENT ──
    // Server emits this after a successful ACID transaction (order completion)
    socket.on('inventory_updated', (data) => {
      console.log('[Socket] inventory_updated received:', data);

      // Invalidate inventory cache — re-fetches Inventory page table silently
      queryClient.invalidateQueries({ queryKey: ['inventory'] });

      // Invalidate orders cache — re-fetches Orders page table silently
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      // Invalidate analytics cache — re-fetches Dashboard charts silently
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Cleanup on unmount or token change
    return () => {
      socket.disconnect();
    };
  }, [queryClient, token]);
};
