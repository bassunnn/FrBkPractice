const https = require('https');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');

// Загрузка переменных окружения из .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex !== -1) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const app = express();

const PORT = process.env.PORT || 3000;

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:test@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('VAPID настроен');
} else {
  console.warn('VAPID ключи не установлены. Push-уведомления не будут работать.');
  console.warn('Запустите: npx web-push generate-vapid-keys');
}

const subscriptions = [];

// Хранилище активных напоминаний: key=id, value={ timeoutId, text, reminderTime }
const reminders = new Map();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.post('/subscribe', (req, res) => {
  try {
    const subscription = req.body;
    const exists = subscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
      subscriptions.push(subscription);
      console.log('Подписка добавлена. Всего:', subscriptions.length);
      res.status(201).json({ message: 'Подписка сохранена' });
    } else {
      res.status(200).json({ message: 'Подписка уже существует' });
    }
  } catch (error) {
    console.error('Ошибка сохранения подписки:', error);
    res.status(500).json({ error: 'Ошибка сохранения подписки' });
  }
});

app.post('/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;
    const index = subscriptions.findIndex(sub => sub.endpoint === endpoint);
    if (index !== -1) {
      subscriptions.splice(index, 1);
      console.log('Подписка удалена. Всего:', subscriptions.length);
      res.status(200).json({ message: 'Подписка удалена' });
    } else {
      res.status(404).json({ error: 'Подписка не найдена' });
    }
  } catch (error) {
    console.error('Ошибка удаления подписки:', error);
    res.status(500).json({ error: 'Ошибка удаления подписки' });
  }
});

// Эндпоинт для откладывания напоминания на 5 минут
app.post('/snooze', (req, res) => {
  try {
    const reminderId = parseInt(req.query.reminderId, 10);
    if (!reminderId || !reminders.has(reminderId)) {
      return res.status(400).json({ error: 'Reminder not found' });
    }

    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);

    const newDelay = 5 * 60 * 1000; // 5 минут
    console.log(`Напоминание #${reminderId} отложено на 5 минут`);

    const newTimeoutId = setTimeout(() => {
      const payload = JSON.stringify({
        title: '⏰ Напоминание (отложенное)',
        body: reminder.text,
        reminderId: reminderId
      });

      subscriptions.forEach(subscription => {
        webpush.sendNotification(subscription, payload)
          .catch(error => {
            if (error.statusCode === 410) {
              const index = subscriptions.indexOf(subscription);
              if (index !== -1) subscriptions.splice(index, 1);
            }
            console.error('Ошибка отправки push:', error);
          });
      });

      reminders.delete(reminderId);
    }, newDelay);

    reminders.set(reminderId, {
      timeoutId: newTimeoutId,
      text: reminder.text,
      reminderTime: Date.now() + newDelay
    });

    res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
  } catch (error) {
    console.error('Ошибка откладывания напоминания:', error);
    res.status(500).json({ error: 'Ошибка откладывания напоминания' });
  }
});

const certPath = path.join(__dirname);
const keyPath = path.join(certPath, 'localhost-key.pem');
const certPathFile = path.join(certPath, 'localhost.pem');

let serverOptions;

if (fs.existsSync(keyPath) && fs.existsSync(certPathFile)) {
  serverOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPathFile)
  };
  console.log('HTTPS сертификаты найдены');
} else {
  console.warn('HTTPS сертификаты не найдены. Сервер не запустится.');
  console.warn('Запустите: mkcert -install && mkcert localhost 127.0.0.1 ::1');
  process.exit(1);
}

const server = https.createServer(serverOptions, app);

const io = new Server(server, {
  cors: {
    origin: `https://localhost:${PORT}`,
    methods: ['GET', 'POST']
  }
});

io.on('connection', socket => {
  console.log('Клиент подключен:', socket.id);

  socket.on('newTask', task => {
    console.log('Новая заметка:', task);
    io.emit('taskAdded', task);

    const pushPayload = JSON.stringify({
      title: 'Новая заметка',
      body: task.text
    });

    subscriptions.forEach(subscription => {
      webpush.sendNotification(subscription, pushPayload)
        .catch(error => {
          if (error.statusCode === 410) {
            const index = subscriptions.indexOf(subscription);
            if (index !== -1) subscriptions.splice(index, 1);
          }
          console.error('Ошибка отправки push:', error);
        });
    });
  });

  socket.on('newReminder', reminder => {
    const { id, text, reminderTime } = reminder;
    const delay = reminderTime - Date.now();

    if (delay <= 0) {
      console.log(`Напоминание #${id}: время уже прошло`);
      return;
    }

    console.log(`Напоминание #${id} запланировано через ${Math.round(delay / 1000)}с`);

    const timeoutId = setTimeout(() => {
      const payload = JSON.stringify({
        title: '🔔 Напоминание',
        body: text,
        reminderId: id
      });

      subscriptions.forEach(subscription => {
        webpush.sendNotification(subscription, payload)
          .catch(error => {
            if (error.statusCode === 410) {
              const index = subscriptions.indexOf(subscription);
              if (index !== -1) subscriptions.splice(index, 1);
            }
            console.error('Ошибка отправки push:', error);
          });
      });

      reminders.delete(id);
      console.log(`Напоминание #${id} отправлено`);
    }, delay);

    reminders.set(id, { timeoutId, text, reminderTime });
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключен:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`HTTPS сервер запущен: https://localhost:${PORT}`);
});
