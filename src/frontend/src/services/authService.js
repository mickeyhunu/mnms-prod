import { apiRequest, setToken } from './apiService.js';

export async function login({ loginId, password }) {
  const result = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId, password })
  });
  setToken(result.token);
  return result;
}

export async function register({ loginId, nickname, password }) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ loginId, nickname, password })
  });
}
