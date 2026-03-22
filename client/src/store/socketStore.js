// src/store/socketStore.js
import { create } from "zustand";

export const useSocketStore = create((set) => ({
  isConnected: false,
  setIsConnected: (status) => set({ isConnected: status }),
}));
