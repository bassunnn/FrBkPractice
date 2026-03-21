import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../services/api';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productApi.getAll();
      setProducts(response.data);
      setError('');
    } catch (err) {
      setError('Ошибка при загрузке товаров');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      return;
    }

    try {
      await productApi.delete(id);
      setProducts(products.filter(product => product.id !== id));
    } catch (err) {
      setError('Ошибка при удалении товара');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка товаров...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Список товаров</h2>
        <Link to="/products/new" className="btn btn-primary">
          + Создать новый товар
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {products.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', padding: '2rem' }}>
            Товаров пока нет. Создайте первый товар!
          </p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">

              {product.image && (
                <img
                  src={`http://localhost:3000${product.image}`}
                  alt={product.name}
                  className="product-image"
                />
              )}

              <h3>{product.name}</h3>

              <p>
                {product.description.length > 100
                  ? product.description.substring(0, 100) + '...'
                  : product.description}
              </p>

              <div className="price">
                {product.price.toLocaleString()} ₽
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Link 
                  to={`/products/${product.id}`} 
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Подробнее
                </Link>

                <button
                  onClick={() => handleDelete(product.id)}
                  className="btn btn-danger"
                >
                  Удалить
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;