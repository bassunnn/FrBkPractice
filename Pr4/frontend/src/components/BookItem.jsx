import React from "react";

export default function BookItem({ book, onEdit, onDelete }) {
  return (
    <div className="bookRow">
      <div className="bookMain">
        <div className="bookId">#{book.id}</div>
        <div className="bookTitle">{book.title}</div>
        <div className="bookAuthor">{book.author}</div>
        <div className="bookCategory">{book.category}</div>
        <div className="bookPrice">{book.price} ₽</div>
        <div className="bookStock">В наличии: {book.stock}</div>
        {book.year && <div className="bookYear">{book.year} г.</div>}
      </div>
      <div className="bookActions">
        <button className="btn" onClick={() => onEdit(book)}>
          ✏️ Редактировать
        </button>
        <button className="btn btn--danger" onClick={() => onDelete(book.id)}>
          🗑️ Удалить
        </button>
      </div>
    </div>
  );
}