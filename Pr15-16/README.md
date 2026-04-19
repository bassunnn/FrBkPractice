# PWA-приложение «Мои заметки»

Приложение для управления заметками с поддержкой:
- **App Shell Architecture** (ПЗ №15)
- **HTTPS** через mkcert (ПЗ №15)
- **WebSocket** через Socket.IO (ПЗ №16)
- **Push-уведомления** через Web Push API (ПЗ №16)
- **Офлайн-работа** через Service Worker

---

## Установка

### 1. Клонирование репозитория

```bash
git clone <url-репозитория>
cd Pr15-16
```

### 2. Установка зависимостей

```bash
npm install
```

---

## Генерация HTTPS-сертификатов

### Установка mkcert

**Windows:**
```bash
choco install mkcert
```
или скачайте с [GitHub](https://github.com/FiloSottile/mkcert/releases)

**macOS:**
```bash
brew install mkcert
```

**Linux:**
```bash
sudo apt install libnss3-tools
# затем скачайте бинарник с GitHub
```

### Генерация сертификатов

```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

В папке проекта появятся файлы `localhost.pem` и `localhost-key.pem`.

---

## Генерация VAPID-ключей

```bash
npx web-push generate-vapid-keys
```

Команда выведет публичный и приватный ключи. Сохраните их.

---

## Настройка переменных окружения

Создайте файл `.env` в корне проекта (или задайте переменные в командной строке):

```
VAPID_PUBLIC_KEY=<ваш-публичный-ключ>
VAPID_PRIVATE_KEY=<ваш-приватный-ключ>
VAPID_SUBJECT=mailto:test@example.com
PORT=3000
```

Или запустите сервер с переменными:

**Windows (CMD):**
```cmd
set VAPID_PUBLIC_KEY=ваш-ключ&& set VAPID_PRIVATE_KEY=ваш-ключ&& node server.js
```

**Windows (PowerShell):**
```powershell
$env:VAPID_PUBLIC_KEY="ваш-ключ"; $env:VAPID_PRIVATE_KEY="ваш-ключ"; node server.js
```

**macOS/Linux:**
```bash
VAPID_PUBLIC_KEY="ваш-ключ" VAPID_PRIVATE_KEY="ваш-ключ" node server.js
```

---

## Запуск сервера

```bash
npm start
```

или

```bash
node server.js
```

Сервер запустится на `https://localhost:3000`.

---

## Проверка работы

### HTTPS

1. Откройте `https://localhost:3000` в браузере
2. Убедитесь в наличии значка замка в адресной строке

### Офлайн-режим (App Shell)

1. Откройте DevTools (F12) → Application → Service Workers
2. Убедитесь, что Service Worker активен
3. Перейдите в Network → выберите **Offline**
4. Обновите страницу — интерфейс должен загрузиться из кэша

### WebSocket

1. Откройте две вкладки `https://localhost:3000`
2. Добавьте заметку в первой вкладке
3. Во второй вкладке появится всплывающее уведомление о новой заметке

### Push-уведомления

1. В одной из вкладок нажмите **«Включить уведомления»**
2. Разрешите уведомления в браузере
3. Добавьте заметку в **другой** вкладке
4. Если вкладка с подпиской не активна — появится системное push-уведомление

---

## Структура проекта

```
Pr15-16/
├── content/
│   ├── home.html        # Страница заметок
│   └── about.html       # Страница «О приложении»
├── icons/               # Иконки приложения
├── index.html           # App Shell
├── app.js               # Клиентская логика
├── sw.js                # Service Worker
├── manifest.json        # Манифест PWA
├── server.js            # HTTPS + Express + Socket.IO + Web-Push
├── package.json         # Зависимости
└── README.md            # Инструкция
```

---

## Технологии

- **Express.js** — HTTP/HTTPS сервер
- **Socket.IO** — WebSocket коммуникация
- **Web Push** — push-уведомления
- **Service Worker** — кэширование и офлайн
- **mkcert** — локальные HTTPS-сертификаты
