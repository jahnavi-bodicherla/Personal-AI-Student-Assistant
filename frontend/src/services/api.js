import axios from "axios";

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
});

const TOKEN_KEY = "study_assistant_tokens";

export function getStoredTokens() {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function storeTokens(tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

// Attach the access token to every outgoing request.
api.interceptors.request.use((config) => {
  const tokens = getStoredTokens();
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`;
  }
  return config;
});

// On a 401, try exactly once to refresh the access token using the refresh token,
// then retry the original request. If refresh also fails, clear tokens and
// let the caller (ProtectedRoute) redirect to /login.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || originalRequest._retry || originalRequest.url?.includes("/api/auth/")) {
      return Promise.reject(error);
    }

    const tokens = getStoredTokens();
    if (!tokens?.refresh_token) {
      clearTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${BASE_URL}/api/auth/refresh`, { refresh_token: tokens.refresh_token })
          .finally(() => {
            refreshPromise = null;
          });
      }
      const { data } = await refreshPromise;
      storeTokens(data);
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearTokens();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
