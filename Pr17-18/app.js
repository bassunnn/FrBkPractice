console.log('App.js loaded v5');

const STORAGE_KEY = 'notes';
let VAPID_PUBLIC_KEY = '';

const appContent = document.getElementById('app-content');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const navHome = document.getElementById('navHome');
const navAbout = document.getElementById('navAbout');

let socket;
let noteForm;
let noteInput;
let notesList;
let subscribeBtn;
let unsubscribeBtn;
let reminderForm;
let reminderTextInput;
let reminderTimeInput;
let reminderModal;
let reminderModalBody;
let snoozeBtn;
let closeReminderBtn;

function loadContent(page) {
  fetch(`/content/${page}.html`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(html => {
      appContent.innerHTML = html;
      if (page === 'home') initHomePage();
      updateNav(page);
    })
    .catch(error => {
      console.error('Ошибка загрузки контента:', error);
      if (page !== 'home') {
        loadContent('home');
      } else {
        appContent.innerHTML = '<p class="empty-message">Ошибка загрузки</p>';
      }
    });
}

function updateNav(page) {
  navHome.classList.toggle('active', page === 'home');
  navAbout.classList.toggle('active', page === 'about');
}

function initHomePage() {
  console.log('initHomePage called');
  noteForm = document.getElementById('noteForm');
  noteInput = document.getElementById('noteInput');
  notesList = document.getElementById('notesList');
  subscribeBtn = document.getElementById('subscribeBtn');
  unsubscribeBtn = document.getElementById('unsubscribeBtn');
  console.log('unsubscribeBtn element:', unsubscribeBtn);
  reminderForm = document.getElementById('reminderForm');
  reminderTextInput = document.getElementById('reminderText');
  reminderTimeInput = document.getElementById('reminderTime');
  reminderModal = document.getElementById('reminderModal');
  reminderModalBody = document.getElementById('reminderModalBody');
  snoozeBtn = document.getElementById('snoozeBtn');
  closeReminderBtn = document.getElementById('closeReminderBtn');

  loadNotes();

  noteForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = noteInput.value;
    addNote(text);
    noteInput.value = '';
    noteInput.focus();
  });

  if (reminderForm) {
    reminderForm.addEventListener('submit', event => {
      event.preventDefault();
      addReminder();
    });
  }

  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', subscribeToPush);
  }
  if (unsubscribeBtn) {
    console.log('Adding event listener to unsubscribeBtn');
    unsubscribeBtn.addEventListener('click', () => {
      console.log('Unsubscribe button clicked');
      unsubscribeFromPush();
    });
  }

  if (snoozeBtn) {
    snoozeBtn.addEventListener('click', handleSnooze);
  }
  if (closeReminderBtn) {
    closeReminderBtn.addEventListener('click', closeReminderModal);
  }

  // Закрытие модального окна по клику вне его или по Escape
  if (reminderModal) {
    reminderModal.addEventListener('click', event => {
      if (event.target === reminderModal) {
        closeReminderModal();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && reminderModal.style.display === 'flex') {
        closeReminderModal();
      }
    });
  }

  checkPushSubscription();
}

function getNotesFromStorage() {
  const notesJson = localStorage.getItem(STORAGE_KEY);
  return notesJson ? JSON.parse(notesJson) : [];
}

function saveNotesToStorage(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function addNote(text) {
  if (!text || !text.trim()) return;

  const notes = getNotesFromStorage();
  const newNote = {
    id: Date.now(),
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  notes.unshift(newNote);
  saveNotesToStorage(notes);
  renderNotes(notes);

  if (socket) {
    try {
      socket.emit('newTask', { text: newNote.text, datetime: newNote.createdAt });
    } catch (e) {
      console.error('Ошибка отправки WebSocket:', e);
    }
  }
}

function addReminder() {
  const text = reminderTextInput.value;
  const datetimeValue = reminderTimeInput.value;

  if (!text || !text.trim() || !datetimeValue) {
    showToast('Заполните все поля напоминания');
    return;
  }

  const reminderTimestamp = new Date(datetimeValue).getTime();

  if (reminderTimestamp <= Date.now()) {
    showToast('Время напоминания должно быть в будущем');
    return;
  }

  const notes = getNotesFromStorage();
  const newNote = {
    id: Date.now(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    reminder: reminderTimestamp
  };

  notes.unshift(newNote);
  saveNotesToStorage(notes);
  renderNotes(notes);

  if (socket) {
    try {
      console.log('Emitting newReminder:', { id: newNote.id, text: newNote.text, reminderTime: reminderTimestamp });
      socket.emit('newReminder', {
        id: newNote.id,
        text: newNote.text,
        reminderTime: reminderTimestamp
      });
      showToast('Напоминание добавлено');
    } catch (e) {
      console.error('Ошибка отправки напоминания:', e);
      showToast('Ошибка добавления напоминания');
    }
  } else {
    showToast('WebSocket не подключен');
  }

  reminderTextInput.value = '';
  reminderTimeInput.value = '';
  reminderTextInput.focus();
}

function deleteNote(id) {
  const notes = getNotesFromStorage();
  const filteredNotes = notes.filter(note => note.id !== id);
  saveNotesToStorage(filteredNotes);
  renderNotes(filteredNotes);
}

function renderNotes(notes) {
  if (!notesList) return;

  if (notes.length === 0) {
    notesList.innerHTML = '<li class="empty-message">📭 Список заметок пуст</li>';
    return;
  }

  notesList.innerHTML = notes.map(note => {
    let reminderInfo = '';
    if (note.reminder) {
      const reminderDate = new Date(note.reminder);
      reminderInfo = `<div class="note-reminder">🔔 Напоминание: ${reminderDate.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>`;
    }
    return `
    <li class="note-item" data-id="${note.id}">
      <div>
        <div class="note-text">${escapeHtml(note.text)}</div>
        <div class="note-date">${formatDate(note.createdAt)}</div>
        ${reminderInfo}
      </div>
      <button class="delete-btn" onclick="deleteNote(${note.id})">Удалить</button>
    </li>
  `;
  }).join('');
}

function loadNotes() {
  const notes = getNotesFromStorage();
  renderNotes(notes);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('ru-RU', options);
}

async function fetchVapidPublicKey() {
  if (VAPID_PUBLIC_KEY) return true;
  try {
    const response = await fetch('/vapidPublicKey');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    VAPID_PUBLIC_KEY = data.publicKey || '';
    return !!VAPID_PUBLIC_KEY;
  } catch (error) {
    console.error('Ошибка получения VAPID ключа:', error);
    return false;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function subscribeToPush() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('Разрешение на уведомления не дано');
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    const gotKey = await fetchVapidPublicKey();
  if (!gotKey) {
    showToast('Не удалось получить VAPID ключ');
    return;
  }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    const response = await fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) throw new Error('Ошибка подписки');

    showToast('Уведомления включены');
    updatePushButtons(true);
  } catch (error) {
    console.error('Ошибка подписки:', error);
    showToast('Ошибка включения уведомлений');
  }
}

async function unsubscribeFromPush() {
  console.log('unsubscribeFromPush called');
  try {
    console.log('Getting registration...');
    const registration = await navigator.serviceWorker.ready;
    console.log('Registration ready');
    const subscription = await registration.pushManager.getSubscription();
    console.log('Subscription:', subscription);
    if (!subscription) {
      showToast('Уведомления уже отключены');
      return;
    }
    const endpoint = subscription.endpoint;
    console.log('Endpoint:', endpoint);
    await subscription.unsubscribe();
    console.log('Unsubscribed locally');
    await fetch('/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint })
    });
    console.log('Unsubscribed on server');
    showToast('Уведомления отключены');
    updatePushButtons(false);
  } catch (error) {
    console.error('Ошибка отписки:', error);
    showToast('Ошибка отключения уведомлений');
  }
}

async function checkPushSubscription() {
  console.log('checkPushSubscription called');
  try {
    console.log('Getting registration for check...');
    const registration = await navigator.serviceWorker.ready;
    console.log('Registration ready for check');
    const subscription = await registration.pushManager.getSubscription();
    console.log('Subscription found:', subscription);
    if (subscription) {
      const permission = Notification.permission;
      console.log('Permission:', permission);
      if (permission === 'granted') {
        updatePushButtons(true);
      } else {
        updatePushButtons(false);
      }
    } else {
      updatePushButtons(false);
    }
  } catch (error) {
    console.error('Ошибка проверки подписки:', error);
  }
}

function updatePushButtons(isSubscribed) {
  if (!subscribeBtn || !unsubscribeBtn) return;
  if (isSubscribed) {
    subscribeBtn.style.display = 'none';
    unsubscribeBtn.style.display = 'inline-block';
  } else {
    subscribeBtn.style.display = 'inline-block';
    unsubscribeBtn.style.display = 'none';
  }
}

function showReminderModal(text, reminderId) {
  if (!reminderModal || !reminderModalBody) return;

  reminderModalBody.textContent = text;
  reminderModal.dataset.reminderId = reminderId;
  reminderModal.style.display = 'flex';

  // Автофокус на кнопку "Закрыть" для удобства
  if (closeReminderBtn) closeReminderBtn.focus();
}

function handleSnooze() {
  const reminderId = reminderModal.dataset.reminderId;
  if (!reminderId) return;

  fetch(`/snooze?reminderId=${reminderId}`, { method: 'POST' })
    .then(response => {
      if (response.ok) {
        showToast('Напоминание отложено на 5 минут');
        closeReminderModal();
      } else {
        showToast('Ошибка отложения напоминания');
      }
    })
    .catch(error => {
      console.error('Ошибка snooze:', error);
      showToast('Ошибка отложения напоминания');
    });
}

function closeReminderModal() {
  if (reminderModal) {
    reminderModal.style.display = 'none';
  }
}

function showToast(message) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

function updateOnlineStatus() {
  if (navigator.onLine) {
    statusBar.className = 'status-bar online';
    statusText.textContent = '📡 Онлайн';
  } else {
    statusBar.className = 'status-bar offline';
    statusText.textContent = '📡 Режим офлайн';
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Сначала unregister старые SW
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => {
        console.log('Unregistering old SW:', reg.scope);
        reg.unregister();
      });
    }).then(() => {
      // Затем register новый
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker зарегистрирован:', registration.scope);
          // Принудительное обновление SW
          registration.update();

          // Обработка обновления SW
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Новый SW установлен, отправляем SKIP_WAITING для активации
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                console.log('Отправлено SKIP_WAITING');
                showToast('Приложение обновлено, перезагрузите страницу');
              }
            });
          });
        })
        .catch(error => {
          console.error('Ошибка регистрации Service Worker:', error);
        });
    });
  } else {
    console.warn('Service Worker не поддерживается');
  }
}

function initSocket() {
  try {
    socket = io('https://localhost:3000');

    socket.on('connect', () => {
      console.log('WebSocket подключен');
    });

    socket.on('taskAdded', task => {
      console.log('Новая заметка через WebSocket:', task);
      showToast(`Новая заметка: ${task.text.substring(0, 50)}${task.text.length > 50 ? '...' : ''}`);
      const notes = getNotesFromStorage();
      const exists = notes.some(n => n.text === task.text && n.createdAt === task.datetime);
      if (!exists) {
        const newNote = {
          id: Date.now(),
          text: task.text,
          createdAt: task.datetime
        };
        notes.unshift(newNote);
        saveNotesToStorage(notes);
        renderNotes(notes);
      }
    });

    socket.on('connect_error', error => {
      console.error('Ошибка WebSocket:', error);
    });
  } catch (error) {
    console.error('Ошибка инициализации WebSocket:', error);
  }
}

function init() {
  loadContent('home');

  navHome.addEventListener('click', () => loadContent('home'));
  navAbout.addEventListener('click', () => loadContent('about'));

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  registerServiceWorker();
  initSocket();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'PUSH_RECEIVED') {
        const payload = event.data.payload;
        showReminderModal(payload.body, payload.reminderId);
      }
    });
  }

  console.log('Приложение инициализировано');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
