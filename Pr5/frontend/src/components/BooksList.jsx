import React from "react";
import BookItem from "./BookItem";

export default function BooksList({ books, onEdit, onDelete }) {
  // Если книг нет, показываем сообщение
  if (!books.length) {
    return <div className="empty">📚 Книг пока нет. Добавьте первую!</div>;
  }

  return (
    <div className="list">
      {books.map((book) => (
        <BookItem 
          key={book.id} 
          book={book} 
          onEdit={onEdit} 
          onDelete={onDelete} 
        />
      ))}
    </div>
  );
}