import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1'
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lexvera_token');
  if (token) {
    if (config.headers && typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: Handle Token Expiration, Auto-Refresh & Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      const reqUrl = originalRequest.url || '';
      
      // Do not attempt refresh on login or token refresh endpoints
      if (
        !reqUrl.includes('/auth/login') &&
        !reqUrl.includes('/auth/refresh') &&
        !reqUrl.includes('/auth/forgot-password') &&
        !reqUrl.includes('/set-password')
      ) {
        const refreshToken = localStorage.getItem('lexvera_refresh_token');
        if (refreshToken) {
          originalRequest._retry = true;
          try {
            const refreshRes = await axios.post('/api/v1/auth/refresh', { refreshToken });
            if (refreshRes.data.success && refreshRes.data.accessToken) {
              const newAccessToken = refreshRes.data.accessToken;
              const newRefreshToken = refreshRes.data.refreshToken;
              localStorage.setItem('lexvera_token', newAccessToken);
              if (newRefreshToken) {
                localStorage.setItem('lexvera_refresh_token', newRefreshToken);
              }

              // Update headers and retry original request
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return api(originalRequest);
            }
          } catch (refreshErr) {
            // Refresh token expired or revoked
            localStorage.removeItem('lexvera_token');
            localStorage.removeItem('lexvera_refresh_token');
            window.dispatchEvent(new CustomEvent('lexvera:session_expired'));
            return Promise.reject(refreshErr);
          }
        }

        // If no refresh token available
        localStorage.removeItem('lexvera_token');
        localStorage.removeItem('lexvera_refresh_token');
        window.dispatchEvent(new CustomEvent('lexvera:session_expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
