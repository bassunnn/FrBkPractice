import axios from 'axios';

const API_URL = 'http://localhost:3000/api'; // Бэкенд на порту 3000

// Создаем базовый HTTP-клиент
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'accept': 'application/json'
  }
});

// Функция для обновления токенов
const refreshTokens = async (refreshToken) => {
  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Перехватчик запросов - добавляем access-токен
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Перехватчик ответов - обрабатываем истекшие токены
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Проверяем, что это ошибка 401 и запрос еще не был повторен
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      // Если нет токенов - перенаправляем на логин
      if (!accessToken || !refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      try {
        // Пробуем обновить токены
        const response = await refreshTokens(refreshToken);
        
        // Сохраняем новые токены
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        
        // Повторяем исходный запрос с новым токеном
        originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Если обновить не удалось - очищаем токены и перенаправляем на логин
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// API для работы с продуктами
export const productApi = {
  getAll: () => apiClient.get('/products'),
  getById: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.put(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`)
};

// API для аутентификации
export const authApi = {
  register: (data) => axios.post(`${API_URL}/auth/register`, data),
  login: (data) => axios.post(`${API_URL}/auth/login`, data),
  me: () => apiClient.get('/auth/me')
};

export default apiClient;