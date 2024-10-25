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
import Rules from './pages/Rules';
import CreateServerPage from './pages/CreateServerPage';
import JoinGamePage from './pages/JoinGamePage';
import GamePage from './pages/GamePage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<PrivozPage />} />
      <Route path="/wholesale" element={<Wholesale />} />
      <Route path="/eventcards" element={<EventCards />} />
      <Route path="/app" element={<App />} />
      <Route path="/rules" element={<Rules />} />
      <Route path="/create" element={<CreateServerPage />} />
      <Route path="/JoinGamePage" element={<JoinGamePage />} />
      <Route path="/game/:peerId" element={<GamePage />} />
    </Routes>
  </BrowserRouter>
);

reportWebVitals();