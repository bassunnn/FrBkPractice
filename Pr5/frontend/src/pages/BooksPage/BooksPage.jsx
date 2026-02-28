import React, { useState, useEffect } from "react";
import "./BooksPage.scss"; // Подключаем стили

import BooksList from "../../components/BooksList";
import BookModal from "../../components/BookModal";
import { api } from "../../api";

export default function BooksPage() {
  // Состояния (данные, которые могут меняться)
  const [books, setBooks] = useState([]);        // список книг
  const [loading, setLoading] = useState(true);  // загрузка

  // Для модального окна
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" или "edit"
  const [editingBook, setEditingBook] = useState(null);

  // Загружаем книги при первом открытии страницы
  useEffect(() => {
    loadBooks();
  }, []);

  // Функция загрузки книг с сервера
  const loadBooks = async () => {
    try {
      setLoading(true);
      const data = await api.getBooks();
      setBooks(data);
    } catch (err) {
      console.error(err);
      alert("Ошибка загрузки книг 😢");
    } finally {
      setLoading(false);
    }
  };

  // Открыть окно для создания книги
  const openCreate = () => {
    setModalMode("create");
    setEditingBook(null);
    setModalOpen(true);
  };

  // Открыть окно для редактирования
  const openEdit = (book) => {
    setModalMode("edit");
    setEditingBook(book);
    setModalOpen(true);
  };

  // Закрыть модальное окно
  const closeModal = () => {
    setModalOpen(false);
    setEditingBook(null);
  };

  // Удаление книги
  const handleDelete = async (id) => {
    const ok = window.confirm("❓ Удалить книгу?");
    if (!ok) return;

    try {
      await api.deleteBook(id);
      // Убираем удаленную книгу из списка
      setBooks((prev) => prev.filter((book) => book.id !== id));
    } catch (err) {
      console.error(err);
      alert("Ошибка удаления книги");
    }
  };

  // Отправка формы (создание или редактирование)
  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === "create") {
        const newBook = await api.createBook(payload);
        setBooks((prev) => [...prev, newBook]); // Добавляем новую книгу
      } else {
        const updatedBook = await api.updateBook(payload.id, payload);
        setBooks((prev) =>
          prev.map((book) => (book.id === payload.id ? updatedBook : book))
        ); // Обновляем существующую
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Ошибка сохранения книги");
    }
  };

  return (
    <div className="page">
      {/* Шапка сайта */}
      <header className="header">
        <div className="header__inner">
          <div className="brand">📚 Книжный магазин</div>
          <div className="header__right">Хищник</div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="main">
        <div className="container">
          {/* Панель инструментов */}
          <div className="toolbar">
            <h1 className="title">Каталог книг</h1>
            <button className="btn btn--primary" onClick={openCreate}>
              ➕ Добавить книгу
            </button>
          </div>

          {/* Список книг или загрузка */}
          {loading ? (
            <div className="empty">⏳ Загрузка книг...</div>
          ) : (
            <BooksList
              books={books}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>

      {/* Подвал */}
      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} Книжный магазин. Все права защищены.
        </div>
      </footer>

      {/* Модальное окно */}
      <BookModal
        open={modalOpen}
        mode={modalMode}
        initialBook={editingBook}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}