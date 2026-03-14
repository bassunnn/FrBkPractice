import React, { useEffect, useState } from "react";

export default function BookModal({ open, mode, initialBook, onClose, onSubmit }) {
  // Состояния для всех полей формы
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [year, setYear] = useState("");
  const [pages, setPages] = useState("");

  // Когда модалка открывается или меняется книга, заполняем поля
  useEffect(() => {
    if (!open) return;
    
    setTitle(initialBook?.title ?? "");
    setAuthor(initialBook?.author ?? "");
    setCategory(initialBook?.category ?? "");
    setDescription(initialBook?.description ?? "");
    setPrice(initialBook?.price != null ? String(initialBook.price) : "");
    setStock(initialBook?.stock != null ? String(initialBook.stock) : "");
    setYear(initialBook?.year != null ? String(initialBook.year) : "");
    setPages(initialBook?.pages != null ? String(initialBook.pages) : "");
  }, [open, initialBook]);

  // Если модалка закрыта, не показываем ничего
  if (!open) return null;

  // Заголовок в зависимости от режима
  const titleText = mode === "edit" ? "📖 Редактирование книги" : "📖 Добавление новой книги";

  // Обработчик отправки формы
  const handleSubmit = (e) => {
    e.preventDefault();

    // Валидация (проверка) данных
    const trimmedTitle = title.trim();
    const trimmedAuthor = author.trim();
    const trimmedCategory = category.trim();
    const trimmedDescription = description.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!trimmedTitle) {
      alert("Введите название книги");
      return;
    }
    if (!trimmedAuthor) {
      alert("Введите автора");
      return;
    }
    if (!trimmedCategory) {
      alert("Введите категорию");
      return;
    }
    if (!trimmedDescription) {
      alert("Введите описание");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      alert("Введите корректную цену (больше 0)");
      return;
    }
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      alert("Введите корректное количество (0 или больше)");
      return;
    }

    // Отправляем данные наверх
    onSubmit({
      id: initialBook?.id,
      title: trimmedTitle,
      author: trimmedAuthor,
      category: trimmedCategory,
      description: trimmedDescription,
      price: parsedPrice,
      stock: parsedStock,
      year: year ? Number(year) : null,
      pages: pages ? Number(pages) : null
    });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">{titleText}</div>
          <button className="iconBtn" onClick={onClose}>✕</button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          {/* Основные поля */}
          <label className="label">
            Название книги *
            <input 
              className="input" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Война и мир"
              autoFocus 
            />
          </label>

          <label className="label">
            Автор *
            <input 
              className="input" 
              value={author} 
              onChange={(e) => setAuthor(e.target.value)} 
              placeholder="Лев Толстой"
            />
          </label>

          <label className="label">
            Категория *
            <input 
              className="input" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              placeholder="Классика"
            />
          </label>

          <label className="label">
            Описание *
            <textarea 
              className="input" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Краткое описание книги..."
              rows="3"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label className="label">
              Цена (₽) *
              <input 
                className="input" 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                placeholder="650"
              />
            </label>

            <label className="label">
              Количество на складе *
              <input 
                className="input" 
                type="number" 
                value={stock} 
                onChange={(e) => setStock(e.target.value)} 
                placeholder="10"
              />
            </label>
          </div>

          {/* Дополнительные поля (необязательные) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label className="label">
              Год издания
              <input 
                className="input" 
                type="number" 
                value={year} 
                onChange={(e) => setYear(e.target.value)} 
                placeholder="1869"
              />
            </label>

            <label className="label">
              Количество страниц
              <input 
                className="input" 
                type="number" 
                value={pages} 
                onChange={(e) => setPages(e.target.value)} 
                placeholder="1300"
              />
            </label>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary">
              {mode === "edit" ? "Сохранить изменения" : "Создать книгу"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}