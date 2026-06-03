import axios from "axios";

const api = axios.create({
  // In a single-project deploy the API is same-origin under /api.
  // Set VITE_BASE_URL to a full URL when the backend is hosted separately.
  baseURL: import.meta.env.VITE_BASE_URL || "/api",
});

// Inject JWT token from localStorage into every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      // Only redirect if not already on auth pages
      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/register")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
