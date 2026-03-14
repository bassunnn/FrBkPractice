import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../services/api';

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchProduct();
    }
  }, [isEditMode]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productApi.getById(id);
      const product = response.data;
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price
      });
    } catch (err) {
      setError('Ошибка при загрузке товара');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price)
      };

      if (isEditMode) {
        await productApi.update(id, productData);
      } else {
        await productApi.create(productData);
      }
      
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при сохранении товара');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <div className="loading">Загрузка данных товара...</div>;
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2>{isEditMode ? 'Редактировать товар' : 'Создать новый товар'}</h2>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="name">Название товара</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
            placeholder="Введите название товара"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Описание</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            disabled={loading}
            placeholder="Введите подробное описание товара"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="price">Цена (₽)</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            disabled={loading}
            placeholder="0.00"
          />
        </div>
        
        <div className="button-group">
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'Сохранение...' : (isEditMode ? 'Обновить товар' : 'Создать товар')}
          </button>
          
          <button 
            type="button" 
            className="btn" 
            onClick={() => navigate('/products')}
            disabled={loading}
            style={{ backgroundColor: '#6c757d', color: 'white' }}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;