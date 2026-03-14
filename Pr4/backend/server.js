const express = require('express');
const {nanoid} = require('nanoid');
const cors = require('cors');

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

function findBookOr404(id, res){
    const book = books.find(b => b.id == id);
    if (!book) {
        res.status(404).json({error: "Book not found"});
        return null;
    }
    return book;
}

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

// GET /api/books - Получение списка всех книг
app.get("/api/books", (req, res) => {
    res.json(books);
});

// GET /api/books/:id - Получение книги по ID
app.get("/api/books/:id", (req, res) => {
  const id = req.params.id;
  const book = findBookOr404(id, res);
  if (!book) return;
  res.json(book);
});

// GET /api/books/category/:category - Получение книг по категории
app.get("/api/books/category/:category", (req, res) => {
  const category = req.params.category.toLowerCase();
  const filteredBooks = books.filter(b => b.category.toLowerCase().includes(category));
  res.json(filteredBooks);
});

// GET /api/books/author/:author - Получение книг по автору
app.get("/api/books/author/:author", (req, res) => {
  const author = req.params.author.toLowerCase();
  const filteredBooks = books.filter(b => b.author.toLowerCase().includes(author));
  res.json(filteredBooks);
});

// PATCH /api/books/:id - Обновление книги
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

// DELETE /api/books/:id - Удаление книги
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
  console.log(`📖 Доступные маршруты:`);
  console.log(`   POST   /api/books                 - Создать книгу`);
  console.log(`   GET    /api/books                 - Получить все книги`);
  console.log(`   GET    /api/books/:id              - Получить книгу по ID`);
  console.log(`   GET    /api/books/category/:category - Получить книги по категории`);
  console.log(`   GET    /api/books/author/:author    - Получить книги по автору`);
  console.log(`   PATCH  /api/books/:id              - Обновить книгу`);
  console.log(`   DELETE /api/books/:id              - Удалить книгу`);
});






