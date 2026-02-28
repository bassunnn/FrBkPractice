import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://localhost:3000/api",
    headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
    }
});

// Все функции для работы с книгами
export const api = {
  // Получить все книги
  getBooks: async () => {
    const response = await apiClient.get("/books");
    return response.data;  // возвращаем массив книг
  },
  
  // Создать новую книгу
  createBook: async (book) => {
    const response = await apiClient.post("/books", book);
    return response.data;  // возвращаем созданную книгу
  },
  
  // Обновить книгу
  updateBook: async (id, book) => {
    const response = await apiClient.patch(`/books/${id}`, book);
    return response.data;  // возвращаем обновленную книгу
  },
  
  // Удалить книгу
  deleteBook: async (id) => {
    const response = await apiClient.delete(`/books/${id}`);
    return response.data;  // обычно пусто (статус 204)
  }
};