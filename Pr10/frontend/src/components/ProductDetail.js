import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi } from '../services/api';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productApi.getById(id);
      setProduct(response.data);
      setError('');
    } catch (err) {
      setError('Ошибка при загрузке товара');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      return;
    }

    try {
      await productApi.delete(id);
      navigate('/products');
    } catch (err) {
      setError('Ошибка при удалении товара');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка товара...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!product) {
    return <div className="alert alert-error">Товар не найден</div>;
  }

  return (
    <div>
      <Link to="/products" className="back-link">
        ← Назад к списку товаров
      </Link>

      <div className="product-detail">
        <h2>{product.name}</h2>
        <div className="description">{product.description}</div>
        <div className="price-large">{product.price.toLocaleString()} ₽</div>
        
        <div className="button-group">
          <Link 
            to={`/products/${id}/edit`} 
            className="btn btn-primary"
          >
            Редактировать
          </Link>
          <button
            onClick={handleDelete}
            className="btn btn-danger"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;