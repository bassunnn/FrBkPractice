const express = require('express');
const app = express();
const port = 3000;

let products = [
    { id: 1, name: 'Ноутбук', price: 1500.00 },
    { id: 2, name: 'Мышка', price: 25.50 },
    { id: 3, name: 'Клавиатура', price: 75.00 },
];

app.use(express.json());

app.get('/', (req, res) => {
    res.send('API товаров');
});


app.get('/products', (req, res) => {
    res.send(JSON.stringify(products));
});

app.get('/products/:id', (req, res) => {
    let product = products.find(p => p.id == req.params.id);
    res.send(JSON.stringify(product));
});

app.post('/products', (req, res) => {
    const { name, price } = req.body;
    const newProduct = {
        id: Date.now(),
        name,
        price
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.patch('/products/:id', (req, res) => {
    const product = products.find(p => p.id == req.params.id);
    const { name, price } = req.body;
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    res.json(product);
});

app.delete('/products/:id', (req, res) => {
    products = products.filter(p => p.id != req.params.id);
    res.send('Ok');
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});