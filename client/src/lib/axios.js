import axios from "axios";

// Helper to determine the clean base URL
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // If the URL already ends with /api/v1, don't add it again
  if (envUrl.endsWith("/api/v1")) {
    return envUrl;
  }

  // If it ends with /api, just add /v1
  if (envUrl.endsWith("/api")) {
    return `${envUrl}/v1`;
  }

  // Otherwise, add the full path
  return `${envUrl}/api/v1`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to automatically attach the JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
