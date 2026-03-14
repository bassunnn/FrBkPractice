import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Register from './components/Register';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import ProductDetail from './components/ProductDetail';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/products" element={
            <PrivateRoute>
              <ProductList />
            </PrivateRoute>
          } />
          
          <Route path="/products/new" element={
            <PrivateRoute>
              <ProductForm />
            </PrivateRoute>
          } />
          
          <Route path="/products/:id" element={
            <PrivateRoute>
              <ProductDetail />
            </PrivateRoute>
          } />
          
          <Route path="/products/:id/edit" element={
            <PrivateRoute>
              <ProductForm />
            </PrivateRoute>
          } />
          
          <Route path="/" element={<Navigate to="/products" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;