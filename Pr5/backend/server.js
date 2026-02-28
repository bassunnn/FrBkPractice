const express = require('express');
const {nanoid} = require('nanoid');
const cors = require('cors');

// Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

let books = [
  { 
    id: nanoid(6), 
    title: 'Мастер и Маргарита', 
    author: 'Михаил Булгаков',
    category: 'Классика', 
    description: 'Великий роман о любви, добре и зле, визите сатаны в советскую Москву',
    price: 650, 
    stock: 12,
    year: 1967,
    pages: 480
  },
  { 
    id: nanoid(6), 
    title: 'Преступление и наказание', 
    author: 'Федор Достоевский',
    category: 'Классика', 
    description: 'Философско-психологический роман о студенте Раскольникове',
    price: 550, 
    stock: 8,
    year: 1866,
    pages: 672
  },
  { 
    id: nanoid(6), 
    title: '1984', 
    author: 'Джордж Оруэлл',
    category: 'Антиутопия', 
    description: 'Культовый роман о тоталитарном обществе и Большом Брате',
    price: 700, 
    stock: 15,
    year: 1949,
    pages: 384
  },
  { 
    id: nanoid(6), 
    title: 'Маленький принц', 
    author: 'Антуан де Сент-Экзюпери',
    category: 'Сказки', 
    description: 'Философская сказка о дружбе, любви и ответственности',
    price: 450, 
    stock: 20,
    year: 1943,
    pages: 120
  },
  { 
    id: nanoid(6), 
    title: 'Гарри Поттер и философский камень', 
    author: 'Джоан Роулинг',
    category: 'Фэнтези', 
    description: 'Первая книга о мальчике, который выжил',
    price: 890, 
    stock: 25,
    year: 1997,
    pages: 432
  },
  { 
    id: nanoid(6), 
    title: 'Три товарища', 
    author: 'Эрих Мария Ремарк',
    category: 'Роман', 
    description: 'Пронзительная история о дружбе и любви в послевоенной Германии',
    price: 600, 
    stock: 7,
    year: 1936,
    pages: 480
  },
  { 
    id: nanoid(6), 
    title: 'Алхимик', 
    author: 'Пауло Коэльо',
    category: 'Философия', 
    description: 'Книга-притча о поиске своего пути и предназначения',
    price: 520, 
    stock: 14,
    year: 1988,
    pages: 224
  },
  { 
    id: nanoid(6), 
    title: 'Убить пересмешника', 
    author: 'Харпер Ли',
    category: 'Роман', 
    description: 'История о расовой несправедливости глазами маленькой девочки',
    price: 580, 
    stock: 6,
    year: 1960,
    pages: 416
  },
  { 
    id: nanoid(6), 
    title: 'Война и мир. Том 1', 
    author: 'Лев Толстой',
    category: 'Классика', 
    description: 'Эпопея о жизни русского общества в эпоху наполеоновских войн',
    price: 750, 
    stock: 5,
    year: 1869,
    pages: 720
  },
  { 
    id: nanoid(6), 
    title: 'Портрет Дориана Грея', 
    author: 'Оскар Уайльд',
    category: 'Классика', 
    description: 'Философский роман о красоте, морали и вечной молодости',
    price: 490, 
    stock: 11,
    year: 1890,
    pages: 320
  }
];

app.use(express.json());

app.use(cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

// Middleware для логирования запросов
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}][${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PATCH') {
      console.log('Body:', req.body);
    }
  });
  next();
});

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API книжного магазина',
      version: '1.0.0',
      description: 'Полноценное API для управления каталогом книг',
      contact: {
        name: 'Разработчик',
        email: 'developer@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер разработки',
      },
    ],
    tags: [
      {
        name: 'Books',
        description: 'Управление книгами'
      }
    ]
  },
  apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Подключаем Swagger UI по адресу /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       required:
 *         - title
 *         - author
 *         - category
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный идентификатор книги (генерируется автоматически)
 *           example: "abc123"
 *         title:
 *           type: string
 *           description: Название книги
 *           example: "Мастер и Маргарита"
 *         author:
 *           type: string
 *           description: Автор книги
 *           example: "Михаил Булгаков"
 *         category:
 *           type: string
 *           description: Категория/жанр книги
 *           example: "Классика"
 *         description:
 *           type: string
 *           description: Краткое описание книги
 *           example: "Великий роман о любви, добре и зле"
 *         price:
 *           type: number
 *           description: Цена книги в рублях
 *           example: 650
 *         stock:
 *           type: integer
 *           description: Количество экземпляров в наличии
 *           example: 12
 *         year:
 *           type: integer
 *           description: Год издания (необязательное поле)
 *           example: 1967
 *         pages:
 *           type: integer
 *           description: Количество страниц (необязательное поле)
 *           example: 480
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Сообщение об ошибке
 *       example:
 *         error: "Book not found"
 */

function findBookOr404(id, res){
    const book = books.find(b => b.id == id);
    if (!book) {
        res.status(404).json({error: "Book not found"});
        return null;
    }
    return book;
}

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Создает новую книгу
 *     description: Добавляет новую книгу в каталог
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - author
 *               - category
 *               - description
 *               - price
 *               - stock
 *             properties:
 *               title:
 *                 type: string
 *                 description: Название книги
 *                 example: "Анна Каренина"
 *               author:
 *                 type: string
 *                 description: Автор книги
 *                 example: "Лев Толстой"
 *               category:
 *                 type: string
 *                 description: Категория книги
 *                 example: "Классика"
 *               description:
 *                 type: string
 *                 description: Описание книги
 *                 example: "Роман о трагической любви замужней женщины"
 *               price:
 *                 type: number
 *                 description: Цена в рублях
 *                 example: 800
 *               stock:
 *                 type: integer
 *                 description: Количество в наличии
 *                 example: 10
 *               year:
 *                 type: integer
 *                 description: Год издания (опционально)
 *                 example: 1877
 *               pages:
 *                 type: integer
 *                 description: Количество страниц (опционально)
 *                 example: 864
 *     responses:
 *       201:
 *         description: Книга успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Неверные данные (отсутствуют обязательные поля)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post("/api/books", (req, res) => {
    const { title, author, category, description, price, stock, year, pages } = req.body;
    if (!title || !author || !category || !description || price === undefined || stock === undefined)
    {
        return res.status(400).json({ error: "Title, author, category, description, price and stock are required" });
    }

    const newBook = {
        id: nanoid(6),
        title: title.trim(),
        author: author.trim(),
        category: category.trim(),
        description: description.trim(),
        price: Number(price),
        stock: Number(stock),
        year: year ? Number(year) : null,
        pages: pages ? Number(pages) : null
    };

    books.push(newBook);
    res.status(201).json(newBook);
});

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Возвращает список всех книг
 *     description: Получает полный каталог книг
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Список всех книг
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 */
app.get("/api/books", (req, res) => {
    res.json(books);
});

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Получает книгу по ID
 *     description: Возвращает детальную информацию о конкретной книге
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Уникальный идентификатор книги
 *         example: "abc123"
 *     responses:
 *       200:
 *         description: Данные книги
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: Книга не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get("/api/books/:id", (req, res) => {
  const id = req.params.id;
  const book = findBookOr404(id, res);
  if (!book) return;
  res.json(book);
});

/**
 * @swagger
 * /api/books/category/{category}:
 *   get:
 *     summary: Получает книги по категории
 *     description: Возвращает все книги, принадлежащие указанной категории
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Название категории (регистронезависимый поиск)
 *         example: "Классика"
 *     responses:
 *       200:
 *         description: Список книг в категории
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 */
app.get("/api/books/category/:category", (req, res) => {
  const category = req.params.category.toLowerCase();
  const filteredBooks = books.filter(b => b.category.toLowerCase().includes(category));
  res.json(filteredBooks);
});

/**
 * @swagger
 * /api/books/author/{author}:
 *   get:
 *     summary: Получает книги по автору
 *     description: Возвращает все книги указанного автора
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: author
 *         required: true
 *         schema:
 *           type: string
 *         description: Имя автора (регистронезависимый поиск)
 *         example: "Толстой"
 *     responses:
 *       200:
 *         description: Список книг автора
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 */
app.get("/api/books/author/:author", (req, res) => {
  const author = req.params.author.toLowerCase();
  const filteredBooks = books.filter(b => b.author.toLowerCase().includes(author));
  res.json(filteredBooks);
});

/**
 * @swagger
 * /api/books/{id}:
 *   patch:
 *     summary: Частично обновляет книгу
 *     description: Обновляет указанные поля существующей книги
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID книги для обновления
 *         example: "abc123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Новое название
 *                 example: "Война и мир (обновленное издание)"
 *               author:
 *                 type: string
 *                 description: Новый автор
 *                 example: "Лев Николаевич Толстой"
 *               category:
 *                 type: string
 *                 description: Новая категория
 *                 example: "Классика/Эпопея"
 *               description:
 *                 type: string
 *                 description: Новое описание
 *               price:
 *                 type: number
 *                 description: Новая цена
 *                 example: 850
 *               stock:
 *                 type: integer
 *                 description: Новое количество
 *                 example: 15
 *               year:
 *                 type: integer
 *                 description: Новый год издания
 *                 example: 1869
 *               pages:
 *                 type: integer
 *                 description: Новое количество страниц
 *                 example: 1300
 *     responses:
 *       200:
 *         description: Книга успешно обновлена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Нет полей для обновления
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Книга не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.patch("/api/books/:id", (req, res) => {
  const id = req.params.id;
  const book = findBookOr404(id, res);
  if (!book) return;
  
  // Проверяем, есть ли что обновлять
  const { title, author, category, description, price, stock, year, pages } = req.body;
  if (title === undefined && author === undefined && category === undefined && 
      description === undefined && price === undefined && stock === undefined &&
      year === undefined && pages === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  
  // Обновляем только переданные поля
  if (title !== undefined) book.title = title.trim();
  if (author !== undefined) book.author = author.trim();
  if (category !== undefined) book.category = category.trim();
  if (description !== undefined) book.description = description.trim();
  if (price !== undefined) book.price = Number(price);
  if (stock !== undefined) book.stock = Number(stock);
  if (year !== undefined) book.year = Number(year);
  if (pages !== undefined) book.pages = Number(pages);
  
  res.json(book);
});

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Удаляет книгу
 *     description: Удаляет книгу из каталога по ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID книги для удаления
 *         example: "abc123"
 *     responses:
 *       204:
 *         description: Книга успешно удалена (нет тела ответа)
 *       404:
 *         description: Книга не найдена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete("/api/books/:id", (req, res) => {
  const id = req.params.id;
  const exists = books.some((b) => b.id === id);
  if (!exists) return res.status(404).json({ error: "Book not found" });
  
  books = books.filter((b) => b.id !== id);
  res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`📚 Книжный магазин API запущен на http://localhost:${port}`);
  console.log(`📖 Swagger документация доступна по адресу http://localhost:${port}/api-docs`);
  console.log(`📖 Доступные маршруты:`);
  console.log(`   POST   /api/books                 - Создать книгу`);
  console.log(`   GET    /api/books                 - Получить все книги`);
  console.log(`   GET    /api/books/:id              - Получить книгу по ID`);
  console.log(`   GET    /api/books/category/:category - Получить книги по категории`);
  console.log(`   GET    /api/books/author/:author    - Получить книги по автору`);
  console.log(`   PATCH  /api/books/:id              - Обновить книгу`);
  console.log(`   DELETE /api/books/:id              - Удалить книгу`);
});