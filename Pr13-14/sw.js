// Service Worker для офлайн-работы приложения заметок
// Кэширует статику и работает как прокси для запросов

// Версия кэша (увеличивать при изменениях)
const CACHE_NAME = 'notes-cache-v2';

// Список файлов для кэширования
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  // Иконки
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-48x48.png',
  '/icons/favicon-64x64.png',
  '/icons/favicon-128x128.png',
  '/icons/favicon-256x256.png',
  '/icons/favicon-512x512.png',
  '/icons/icon-152x152.png',
  // Сторонние ресурсы (CDN)
  'https://cdnjs.cloudflare.com/ajax/libs/chota/0.9.2/chota.min.css'
];

// Установка Service Worker — кэширует все файлы
self.addEventListener('install', event => {
  console.log('[SW] Установка Service Worker, версия:', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование ресурсов');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('[SW] Ресурсы закэшированы');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Ошибка кэширования:', error);
      })
  );
});

// Активация Service Worker — удаляет старые кэши
self.addEventListener('activate', event => {
  console.log('[SW] Активация Service Worker');

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
      .then(() => {
        console.log('[SW] Service Worker активирован');
        return self.clients.claim();
      })
  );
});

// Обработка запросов — сначала кэш, потом сеть
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем запросы к другим доменам (кроме CDN)
  if (url.origin !== location.origin &&
      url.origin !== 'https://cdnjs.cloudflare.com') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Возвращаем из кэша
          console.log('[SW] Возврат из кэша:', request.url);
          return cachedResponse;
        }

        // Загружаем из сети
        console.log('[SW] Загрузка из сети:', request.url);
        return fetch(request)
          .then(networkResponse => {
            // Кэшируем успешные ответы
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.error('[SW] Ошибка сети:', error);

            // Для навигационных запросов возвращаем index.html
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }

            // Возвращаем пустой ответ для других запросов
            return new Response('', {
              status: 404,
              statusText: 'Ресурс не найден в кэше и офлайн'
            });
          });
      })
  );
});

// Обработка сообщений от приложения
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker загружен');
