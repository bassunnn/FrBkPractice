const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3001', // Разрешаем запросы с фронтенда на порту 3001
  credentials: true
}));
app.use(express.json());

const PORT = 3000; // Бэкенд на порту 3000

// ---- Константы для токенов (в продакшене использовать .env) ----
const ACCESS_SECRET = 'your_access_secret_key';
const REFRESH_SECRET = 'your_refresh_secret_key';
const ACCESS_EXPIRES_IN = '15m';      // access живёт 15 минут
const REFRESH_EXPIRES_IN = '7d';      // refresh живёт 7 дней

// ---- Хранилища (вместо БД) ----
const users = [];
const refreshTokens = new Set();
const products = [];

// ---- Утилиты для генерации токенов ----
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

// ---- Middleware для проверки access-токена ----
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, ACCESS_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }
    req.user = user;
    next();
  });
};

// ========== НАСТРОЙКА SWAGGER ==========
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth API with Refresh Tokens',
      version: '1.0.0',
      description: 'API для аутентификации с access и refresh токенами',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Локальный сервер',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./app.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// ========== МАРШРУТЫ АУТЕНТИФИКАЦИИ ==========

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Пользователь создан
 *       400:
 *         description: Ошибка валидации
 */
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
    password: hashedPassword,
  };
  users.push(newUser);

  res.status(201).json({ message: 'User created' });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему, получение пары токенов
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешная аутентификация
 *       401:
 *         description: Неверные учётные данные
 */
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

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов с использованием refresh-токена
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *       401:
 *         description: Отсутствует токен
 *       403:
 *         description: Невалидный или просроченный refresh-токен
 */
app.post('/api/auth/refresh', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Refresh token required (Bearer)' });
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

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить информацию о текущем пользователе
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Информация о пользователе
 *       401:
 *         description: Отсутствует токен
 *       404:
 *         description: Пользователь не найден
 */
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, username: user.username });
});

// ========== МАРШРУТЫ ДЛЯ ТОВАРОВ ==========

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get('/api/products', authenticateToken, (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Товар найден
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', authenticateToken, (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Товар создан
 *       400:
 *         description: Ошибка валидации
 */
app.post('/api/products', authenticateToken, (req, res) => {
  const { name, description, price } = req.body;

  if (!name || !description || !price) {
    return res.status(400).json({ error: 'Name, description and price are required' });
  }

  const newProduct = {
    id: products.length + 1,
    name,
    description,
    price: parseFloat(price),
    userId: req.user.sub,
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       403:
 *         description: Нет прав на редактирование
 *       404:
 *         description: Товар не найден
 */
app.put('/api/products/:id', authenticateToken, (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (product.userId !== req.user.sub) {
    return res.status(403).json({ error: 'You can only update your own products' });
  }

  const { name, description, price } = req.body;
  if (name) product.name = name;
  if (description) product.description = description;
  if (price) product.price = parseFloat(price);

  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Товар удален
 *       403:
 *         description: Нет прав на удаление
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', authenticateToken, (req, res) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (products[index].userId !== req.user.sub) {
    return res.status(403).json({ error: 'You can only delete your own products' });
  }

  products.splice(index, 1);
  res.json({ message: 'Product deleted' });
});

// Создаем тестового пользователя при запуске
async function createTestUser() {
  if (users.length === 0) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    users.push({
      id: 1,
      username: 'testuser',
      password: hashedPassword
    });
    console.log('Тестовый пользователь создан:');
    console.log('  Username: testuser');
    console.log('  Password: password123');
    
    // Добавляем тестовые товары
    products.push(
      {
        id: 1,
        name: 'Игровой ноутбук',
        description: 'Мощный ноутбук для игр и работы',
        price: 89999.99,
        userId: 1
      },
      {
        id: 2,
        name: 'Беспроводные наушники',
        description: 'Шумоподавление, высокое качество звука',
        price: 5999.99,
        userId: 1
      },
      {
        id: 3,
        name: 'Механическая клавиатура',
        description: 'RGB подсветка, механические переключатели',
        price: 3499.99,
        userId: 1
      }
    );
    console.log('Добавлены тестовые товары');
  }
}

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Swagger UI доступен по адресу http://localhost:${PORT}/api-docs`);
  createTestUser();
});