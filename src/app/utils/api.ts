import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 900000,
});

export default api;