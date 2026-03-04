import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 900000,
  withCredentials: true,
});

api.interceptors.request.use(config => {
  config.headers = config.headers || {};
  
  if (!config.headers['Authorization']) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;