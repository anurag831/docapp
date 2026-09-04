import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/editor/:id" element={<Editor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
