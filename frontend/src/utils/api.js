import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      return 'http://localhost:5001/api';
    }
    if (host.includes('airoapp.ai')) {
      return 'https://ww7ncvv5bk.c24.airoapp.ai/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5001/api';
};

const api = axios.create({
  baseURL: getBaseURL()
});

api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isPublicAuth = url.endsWith('/login') || url.endsWith('/signup') || url.includes('/admin/login') || url.includes('/app-info');

  if (!isPublicAuth) {
    const isAdminReq = url.includes('/admin');
    const adminToken = localStorage.getItem('admin_token');
    const userToken = localStorage.getItem('token');
    const authToken = isAdminReq ? (adminToken || userToken) : (userToken || adminToken);

    if (authToken && !config.headers['Authorization'] && !config.headers['authorization']) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
  }

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    let shareToken = urlParams.get('airoShareToken');
    if (shareToken) {
      sessionStorage.setItem('airoShareToken', shareToken);
    } else {
      shareToken = sessionStorage.getItem('airoShareToken') || import.meta.env.VITE_SHARE_TOKEN || '0ojUaqrkg5uF';
    }

    if (shareToken) {
      config.params = config.params || {};
      if (!config.params.airoShareToken) {
        config.params.airoShareToken = shareToken;
      }
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.is_inactive) {
      const isAdminReq = response.config?.url && response.config.url.includes('/admin');
      if (!isAdminReq) {
        localStorage.removeItem('token');
        localStorage.removeItem('phone');
        localStorage.removeItem('name');
        sessionStorage.removeItem('mpin_unlocked');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?error=inactive';
        }
      }
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAdminReq = error.config?.url && error.config.url.includes('/admin');
      if (isAdminReq) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_name');
        localStorage.removeItem('admin_login_time');
        localStorage.removeItem('admin_last_activity');
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login?reason=expired';
        }
      } else if (error.response.data?.is_inactive || error.response.data?.msg?.toLowerCase().includes('inactive')) {
        localStorage.removeItem('token');
        localStorage.removeItem('phone');
        localStorage.removeItem('name');
        sessionStorage.removeItem('mpin_unlocked');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login?error=inactive';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
