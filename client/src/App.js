
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AddDataPage from './AddDataPage';
import ManagePage from './ManagePage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="main-bg">
        <div className="container">
          <header className="header">
            <h1>Hệ thống điều phối thực tập sinh</h1>
            <nav>
              <Link to="/add">Thêm dữ liệu</Link> |{' '}
              <Link to="/manage">Quản lý & Điều phối</Link>
            </nav>
            <p>Điều phối và phân công TTS đến các điểm trường một cách hiệu quả.</p>
          </header>
          <Routes>
            <Route path="/add" element={<AddDataPage />} />
            <Route path="/manage" element={<ManagePage />} />
            <Route path="*" element={<AddDataPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;