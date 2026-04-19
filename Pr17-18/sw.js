const CACHE_NAME = 'notes-cache-v5';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-48x48.png',
  '/icons/favicon-64x64.png',
  '/icons/favicon-128x128.png',
  '/icons/favicon-256x256.png',
  '/icons/favicon-512x512.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192.png',
  '/content/home.html',
  '/content/about.html'
];

self.addEventListener('install', event => {
  console.log('[SW] Установка, версия:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование статики');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(error => console.error('[SW] Ошибка кэширования:', error))
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Активация');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Удаление старого кэша:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) {
    return;
  }

  if (request.url.includes('/content/')) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

function cacheFirst(request) {
  return caches.match(request)
    .then(cachedResponse => {
      if (cachedResponse) {
        console.log('[SW] Cache First:', request.url);
        return cachedResponse;
      }
      console.log('[SW] Загрузка из сети:', request.url);
      return fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
          return new Response('', { status: 404, statusText: 'Не найдено' });
        });
    });
}

function networkFirst(request) {
  return fetch(request)
    .then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
      }
      return networkResponse;
    })
    .catch(() => {
      console.log('[SW] Офлайн, возврат из кэша:', request.url);
      return caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          if (request.url.includes('/content/home.html') || request.headers.get('accept').includes('text/html')) {
            return caches.match('/content/home.html');
          }
          return new Response('', { status: 404, statusText: 'Не найдено' });
        });
    });
}

self.addEventListener('push', event => {
  let data = { title: 'Новая заметка', body: '', reminderId: null };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.log('[SW] Ошибка парсинга push-данных:', e);
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon-48x48.png',
    data: { reminderId: data.reminderId }
  };

  if (data.reminderId) {
    options.actions = [
      { action: 'snooze', title: '⏰ Отложить на 5 минут' }
    ];
    options.renotify = true;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        const hasOpenClients = clientList.length > 0;

        // Если есть открытые клиенты, отправляем сообщение им и не показываем системное уведомление
        const notifyClientsPromise = Promise.all(clientList.map(client => {
          return client.postMessage({
            type: 'PUSH_RECEIVED',
            payload: {
              title: data.title,
              body: data.body,
              reminderId: data.reminderId
            }
          });
        }));

        // Показываем системное уведомление только если нет открытых клиентов
        const showNotificationPromise = hasOpenClients ? Promise.resolve() : self.registration.showNotification(data.title, options);

        return Promise.all([notifyClientsPromise, showNotificationPromise]);
      })
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click:', event.action, event.notification.data);
  const notification = event.notification;
  const action = event.action;

  if (action === 'snooze') {
    const reminderId = notification.data.reminderId;
    console.log('[SW] Snoozing reminder:', reminderId);
    event.waitUntil(
      fetch(`/snooze?reminderId=${reminderId}`, { method: 'POST' })
        .then(response => {
          console.log('[SW] Snooze response:', response.status);
          notification.close();
        })
        .catch(err => {
          console.error('[SW] Snooze failed:', err);
          notification.close();
        })
    );
  } else {
    console.log('[SW] Closing notification');
    notification.close();
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker загружен');
