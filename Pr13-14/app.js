// Главное приложение для управления заметками
// Работает офлайн с localStorage и Service Worker

// Ключ для хранения заметок в localStorage
const STORAGE_KEY = 'notes';

// Получаем элементы со страницы
const noteForm = document.getElementById('noteForm');
const noteInput = document.getElementById('noteInput');
const notesList = document.getElementById('notesList');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');

// Загружает заметки из памяти и показывает на странице
function loadNotes() {
  const notes = getNotesFromStorage();
  renderNotes(notes);
}

// Читает заметки из localStorage
function getNotesFromStorage() {
  const notesJson = localStorage.getItem(STORAGE_KEY);
  return notesJson ? JSON.parse(notesJson) : [];
}

// Сохраняет заметки в localStorage
function saveNotesToStorage(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// Добавляет новую заметку в список
function addNote(text) {
  if (!text || !text.trim()) {
    return;
  }

  const notes = getNotesFromStorage();
  
  const newNote = {
    id: Date.now(),
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  notes.unshift(newNote);
  saveNotesToStorage(notes);
  renderNotes(notes);
}

// Удаляет заметку по ID
function deleteNote(id) {
  const notes = getNotesFromStorage();
  const filteredNotes = notes.filter(note => note.id !== id);
  saveNotesToStorage(filteredNotes);
  renderNotes(filteredNotes);
}

// Показывает список заметок на странице
function renderNotes(notes) {
  if (notes.length === 0) {
    notesList.innerHTML = '<li class="empty-message">📭 Список заметок пуст. Добавьте первую заметку!</li>';
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Форматирует дату в читаемый вид
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

// Обновляет статус подключения к интернету (онлайн/офлайн)
function updateOnlineStatus() {
  if (navigator.onLine) {
    statusBar.className = 'status-bar online';
    statusText.textContent = '📡 Онлайн';
  } else {
    statusBar.className = 'status-bar offline';
    statusText.textContent = '📡 Режим офлайн';
  }
}

// Регистрирует Service Worker для офлайн-работы
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('Service Worker успешно зарегистрирован:', registration.scope);

        registration.addEventListener('updatefound', () => {
          console.log('Service Worker обновляется...');
        });
      })
      .catch(error => {
        console.error('Ошибка регистрации Service Worker:', error);
      });

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'SKIP_WAITING') {
        window.location.reload();
      }
    });
  } else {
    console.warn('Service Worker не поддерживается в этом браузере');
  }
}

// Запускает приложение при загрузке
function init() {
  loadNotes();

  noteForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = noteInput.value;
    addNote(text);
    noteInput.value = '';
    noteInput.focus();
  });

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  registerServiceWorker();

  console.log('Приложение инициализировано');
}

// Ждём загрузки страницы, затем запускаем приложение
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
