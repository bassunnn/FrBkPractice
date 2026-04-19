const STORAGE_KEY = 'notes';
const VAPID_PUBLIC_KEY = 'BFGf-B2vW5O4i74gRYCcBm6gbyB_o78LQwfCoCv84eGZ-eYYQl82c898s0ehw4uXbwU8xUYUJHIrgynYb116NRU';

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

function loadContent(page) {
  fetch(`/content/${page}.html`)
    .then(response => {
      console.log(`Загрузка /content/${page}.html:`, response.status);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(html => {
      console.log(`Контент загружен: ${page}`);
      appContent.innerHTML = html;
      if (page === 'home') initHomePage();
      updateNav(page);
    })
    .catch(error => {
      console.error('Ошибка загрузки контента:', error);
      console.error('URL:', `/content/${page}.html`);
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
  noteForm = document.getElementById('noteForm');
  noteInput = document.getElementById('noteInput');
  notesList = document.getElementById('notesList');
  subscribeBtn = document.getElementById('subscribeBtn');
  unsubscribeBtn = document.getElementById('unsubscribeBtn');

  loadNotes();

  noteForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = noteInput.value;
    addNote(text);
    noteInput.value = '';
    noteInput.focus();
  });

  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', subscribeToPush);
  }
  if (unsubscribeBtn) {
    unsubscribeBtn.addEventListener('click', unsubscribeFromPush);
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

  notesList.innerHTML = notes.map(note => `
    <li class="note-item" data-id="${note.id}">
      <div>
        <div class="note-text">${escapeHtml(note.text)}</div>
        <div class="note-date">${formatDate(note.createdAt)}</div>
      </div>
      <button class="delete-btn" onclick="deleteNote(${note.id})">Удалить</button>
    </li>
  `).join('');
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
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      showToast('Уведомления уже отключены');
      return;
    }

    const endpoint = subscription.endpoint;

    await subscription.unsubscribe();

    await fetch('/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint })
    });

    showToast('Уведомления отключены');
    updatePushButtons(false);
  } catch (error) {
    console.error('Ошибка отписки:', error);
    showToast('Ошибка отключения уведомлений');
  }
}

async function checkPushSubscription() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    const isSubscribed = subscription !== null;
    
    if (isSubscribed) {
      const permission = Notification.permission;
      if (permission === 'granted') {
        updatePushButtons(true);
        return true;
      } else {
        updatePushButtons(false);
        return false;
      }
    } else {
      updatePushButtons(false);
      return false;
    }
  } catch (error) {
    console.error('Ошибка проверки подписки:', error);
    return false;
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
    console.log('Service Worker поддерживается, регистрируем...');
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('✓ Service Worker зарегистрирован:', registration.scope);
      })
      .catch(error => {
        console.error('✗ Ошибка регистрации Service Worker:', error);
      });
  } else {
    console.warn('⚠ Service Worker не поддерживается браузером');
  }
}

function initSocket() {
  try {
    console.log('Инициализация WebSocket на URL:', window.location.origin);
    
    socket = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✓ WebSocket подключен, ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠ WebSocket отключен, причина:', reason);
    });

    socket.on('taskAdded', task => {
      console.log('Новая заметка через WebSocket:', task);
      
      // Проверяем, подписан ли пользователь перед выбросом уведомления
      checkPushSubscription().then(isSubscribed => {
        if (isSubscribed) {
          showToast(`Новая заметка: ${task.text.substring(0, 50)}${task.text.length > 50 ? '...' : ''}`);
        }
      }).catch(error => {
        console.error('Ошибка проверки подписки:', error);
      });
      
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
      console.error('✗ Ошибка подключения WebSocket:', error);
    });
    
    socket.on('error', error => {
      console.error('✗ Ошибка Socket.IO:', error);
    });
  } catch (error) {
    console.error('✗ Критическая ошибка инициализации WebSocket:', error);
  }
}

function init() {
  console.log('=== Инициализация приложения ===');
  
  // Проверка наличия необходимых элементов DOM
  if (!appContent) {
    console.error('Элемент app-content не найден!');
    return;
  }
  if (!statusBar || !statusText) {
    console.error('Элементы статуса не найдены!');
    return;
  }
  if (!navHome || !navAbout) {
    console.error('Элементы навигации не найдены!');
    return;
  }
  
  console.log('✓ Все элементы DOM найдены');
  
  loadContent('home');

  navHome.addEventListener('click', () => {
    console.log('Клик на "Главная"');
    loadContent('home');
  });
  navAbout.addEventListener('click', () => {
    console.log('Клик на "О приложении"');
    loadContent('about');
  });

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  registerServiceWorker();
  initSocket();

  console.log('✓ Приложение инициализировано успешно');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM загружен, инициализируем приложение');
  try {
    init();
  } catch (error) {
    console.error('Критическая ошибка инициализации:', error);
  }
});
