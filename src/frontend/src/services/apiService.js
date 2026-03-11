const state = {
  token: localStorage.getItem('token') || ''
};

export function setToken(token) {
  state.token = token || '';
  if (state.token) {
    localStorage.setItem('token', state.token);
  } else {
    localStorage.removeItem('token');
  }
}

export async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || '요청 실패');
  }

  return data;
}
