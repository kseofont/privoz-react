import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/main.scss';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './components/App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import PrivozPage from './pages/PrivozPage';
import Wholesale from './pages/Wholesale';
import EventCards from './pages/EventCards';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<PrivozPage />} />
      <Route path="/wholesale" element={<Wholesale />} />
      <Route path="/eventcards" element={<EventCards />} />
      <Route path="/app" element={<App />} />
    </Routes>
  </BrowserRouter>
);

reportWebVitals();