import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, logout } from '../services/auth';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const authenticated = isAuthenticated();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <Link to="/">Главная</Link>
          {authenticated ? (
            <>
              <Link to="/products">Товары</Link>
              <Link to="/products/new">Создать товар</Link>
              <button 
                onClick={handleLogout} 
                className="btn btn-danger" 
                style={{ float: 'right' }}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Вход</Link>
              <Link to="/register">Регистрация</Link>
            </>
          )}
        </div>
      </nav>
      <div className="container">
        {children}
      </div>
    </div>
  );
};

export default Layout;