import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});


let isRefreshing = false;
let refreshPromise = null;

// --- Handle expired access token ---
api.interceptors.response.use(
    (response) => response,
  
    async (error) => {
      const originalRequest = error.config;
  
      // If unauthorized and not retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
  
        if (isRefreshing) {
          await refreshPromise;
          const newToken = localStorage.getItem("access_token");
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
  
        isRefreshing = true;
        const refreshToken = localStorage.getItem("refresh_token");
  
        refreshPromise = axios
          .post("http://127.0.0.1:8000/refresh-token/", {
            refresh: refreshToken,
          })
          .then((response) => {
            const newToken = response.data.access_token;
            localStorage.setItem("access_token", newToken);
            return newToken;
          })
          .catch((err) => {
            localStorage.clear();
            window.location.href = "/";
            throw err;
          })
          .finally(() => {
            isRefreshing = false;
          });
  
        // Wait for refresh to complete
        const newToken = await refreshPromise;
  
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
  
      throw error;
    }
  );
  
export default api;