// src/lib/axios.js
// A single, pre-configured Axios instance used across the entire app.
// - Reads the API base URL from the env variable (no more hardcoded localhost)
// - Automatically attaches the JWT Bearer token to every request
// - Handles 401 responses globally by clearing auth state

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach token to every outgoing request
api.interceptors.request.use(
  (config) => {
    // Dynamically read from storage so it always picks up the latest token
    const raw = localStorage.getItem("factoryflow-auth");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Malformed storage — ignore
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Alert the user so they know they didn't just randomly log out
      if (error.response.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Session expired or logged in from another device.");
      }

      // Clear auth storage and redirect
      localStorage.removeItem("factoryflow-auth");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
