const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(express.json());

// раздача изображений
app.use('/images', express.static(path.join(__dirname, 'images')));

const PORT = 3000;

// ---- JWT ----
const ACCESS_SECRET = 'your_access_secret_key';
const REFRESH_SECRET = 'your_refresh_secret_key';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// ---- Хранилища ----
const users = [];
const refreshTokens = new Set();
const products = [];

// ---- JWT генерация ----
const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, username: user.username },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { sub: user.id, username: user.username },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
};

// ---- Проверка токена ----
const authenticateToken = (req, res, next) => {

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, ACCESS_SECRET, (err, user) => {

    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
};

// ================= AUTH =================

app.post('/api/auth/register', async (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const existingUser = users.find(u => u.username === username);

  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    id: users.length + 1,
    username,
    password: hashedPassword
  };

  users.push(newUser);

  res.status(201).json({ message: 'User created' });
});

app.post('/api/auth/login', async (req, res) => {

  const { username, password } = req.body;

  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  refreshTokens.add(refreshToken);

  res.json({ accessToken, refreshToken });
});

app.post('/api/auth/refresh', (req, res) => {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const refreshToken = authHeader.split(' ')[1];

  if (!refreshTokens.has(refreshToken)) {
    return res.status(403).json({ error: 'Invalid refresh token' });
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

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (err) {

    return res.status(403).json({ error: 'Invalid refresh token' });

  }

});

app.get('/api/auth/me', authenticateToken, (req, res) => {

  const user = users.find(u => u.id === req.user.sub);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username
  });

});

// ================= PRODUCTS =================

app.get('/api/products', authenticateToken, (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', authenticateToken, (req, res) => {

  const product = products.find(p => p.id === parseInt(req.params.id));

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

app.post('/api/products', authenticateToken, (req, res) => {

  const { name, description, price, image } = req.body;

  if (!name || !description || !price) {
    return res.status(400).json({
      error: 'Name, description and price required'
    });
  }

  const newProduct = {
    id: products.length + 1,
    name,
    description,
    price: parseFloat(price),
    image,
    userId: req.user.sub
  };

  products.push(newProduct);

  res.status(201).json(newProduct);
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {

  const index = products.findIndex(p => p.id === parseInt(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (products[index].userId !== req.user.sub) {
    return res.status(403).json({ error: 'Not your product' });
  }

  products.splice(index, 1);

  res.json({ message: 'Product deleted' });

});

// ================= TEST USER =================

async function createTestUser() {

  if (users.length === 0) {

    const hashedPassword = await bcrypt.hash('password123', 10);

    users.push({
      id: 1,
      username: 'testuser',
      password: hashedPassword
    });

    console.log('Тестовый пользователь создан');
    console.log('username: testuser');
    console.log('password: password123');

    products.push(
      {
        id: 1,
        name: 'Игровой ноутбук',
        description: 'Мощный ноутбук для игр и работы',
        price: 89999.99,
        userId: 1,
        image: '/images/laptop.jpg'
      },
      {
        id: 2,
        name: 'Беспроводные наушники',
        description: 'Шумоподавление, высокое качество звука',
        price: 5999.99,
        userId: 1,
        image: '/images/headphones.jpg'
      },
      {
        id: 3,
        name: 'Механическая клавиатура',
        description: 'RGB подсветка, механические переключатели',
        price: 3499.99,
        userId: 1,
        image: '/images/keyboard.jpg'
      }
    );

    console.log('Добавлены тестовые товары');
  }
}

// ================= SERVER =================

app.listen(PORT, () => {

  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Swagger: http://localhost:${PORT}/api-docs`);

  createTestUser();

});