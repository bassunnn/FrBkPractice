const API_BASE = '/api';

// Сохраняем токены в localStorage
function setTokens(accessToken, refreshToken) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// Универсальная функция запроса с автоматическим обновлением токена
async function apiRequest(endpoint, options = {}) {
  let accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  // Функция для выполнения запроса с текущим accessToken
  const fetchWithToken = (token) => {
    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  };

  let response = await fetchWithToken(accessToken);

  // Если ответ 401 и есть refreshToken, пытаемся обновить токены
  if (response.status === 401 && refreshToken) {
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (refreshResponse.ok) {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
      setTokens(newAccessToken, newRefreshToken);
      // Повторяем исходный запрос с новым токеном
      response = await fetchWithToken(newAccessToken);
    } else {
      // Если обновить не удалось, чистим токены
      clearTokens();
    }
  }
  return response;
}