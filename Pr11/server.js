const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 3000;

// Секреты
const ACCESS_SECRET = 'access_secret';
const REFRESH_SECRET = 'refresh_secret';

// Время жизни токенов
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// Хранилища
let users = [];
let products = [];
const refreshTokens = new Set();

// Вспомогательные функции для генерации токенов
function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

// Middleware аутентификации
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = payload; // { sub, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

// Middleware для проверки ролей
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient rights' });
    }
    next();
  };
}

// ----- Маршруты аутентификации -----

// Регистрация (доступна всем, включая гостей)
app.post('/api/auth/register', async (req, res) => {
  const { username, password, role = 'user' } = req.body; // по умолчанию обычный пользователь
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  // Проверяем, что роль допустима (не даём зарегистрироваться сразу admin/seller без контроля)
  const allowedRoles = ['user', 'seller', 'admin'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    username,
    passwordHash,
    role
  };
  users.push(newUser);
  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    role: newUser.role
  });
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);
  res.json({ accessToken, refreshToken });
});

// Обновление токенов
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }
  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find(u => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// Информация о текущем пользователе (доступна аутентифицированным)
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// ----- Маршруты для пользователей (только admin) -----

// Получить всех пользователей
app.get('/api/users', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  // Не возвращаем пароли
  const safeUsers = users.map(({ id, username, role }) => ({ id, username, role }));
  res.json(safeUsers);
});

// Получить пользователя по ID
app.get('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, username: user.username, role: user.role });
});

// Обновить пользователя (например, сменить роль)
app.put('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const id = parseInt(req.params.id);
  const { username, password, role } = req.body;
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (username) user.username = username;
  if (password) user.passwordHash = await bcrypt.hash(password, 10);
  if (role) {
    if (!['user', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    user.role = role;
  }
  res.json({ id: user.id, username: user.username, role: user.role });
});

// Удалить (заблокировать) пользователя
app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  users.splice(index, 1);
  res.status(204).send();
});

// ----- Маршруты для товаров -----

// Создать товар (продавец или админ)
app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
  const { name, price, description } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'name and price are required' });
  }
  const newProduct = {
    id: products.length + 1,
    name,
    price,
    description: description || '',
    createdBy: req.user.sub // id создателя
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Получить все товары (доступно всем аутентифицированным пользователям)
app.get('/api/products', authMiddleware, (req, res) => {
  res.json(products);
});

// Получить товар по ID (доступно всем аутентифицированным)
app.get('/api/products/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// Обновить товар (продавец или админ)
app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
  const id = parseInt(req.params.id);
  const { name, price, description } = req.body;
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  if (name) product.name = name;
  if (price) product.price = price;
  if (description !== undefined) product.description = description;
  res.json(product);
});

// Удалить товар (только админ)
app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const id = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  products.splice(index, 1);
  res.status(204).send();
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});