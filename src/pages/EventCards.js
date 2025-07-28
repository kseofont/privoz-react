import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import FortuneCards from '../components/FortuneCards';
import Menu from '../components/Menu';
import localEventCards from '../data/eventcards.json';

const EventCard = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';

  const location = useLocation();
  const params = useParams();

  const initialGameState = location.state?.gameState || window.gameState || null;
  const [gameState, setGameState] = useState(initialGameState);
  const [allEventCards, setAllEventCards] = useState([]);

  // ---- Определяем isAuthorized
  const myUserId = location.state?.myUserId || window.myUserId || params.peerId || null;
  const isAuthorized =
    !!myUserId &&
    !!gameState &&
    Array.isArray(gameState.players) &&
    gameState.players.some(p => p.user_id === myUserId);

  // ---- Подгружаем карты для неавторизованных
  useEffect(() => {
    if (!isAuthorized) {
      fetch('/data/eventcards.json')
        .then(response => {
          if (!response.ok) throw new Error('Ошибка загрузки eventcards.json');
          return response.json();
        })
        .then(data => setAllEventCards(data))
        .catch(err => {
          console.error('Ошибка при fetch eventcards.json:', err);
          // fallback на импорт, если fetch не сработал
          setAllEventCards(
            Array.isArray(localEventCards) ? localEventCards : localEventCards.eventcards || []
          );
        });
    }
  }, [isAuthorized]);

  // ---- Основной список карт
  const safeEventCards = isAuthorized
    ? Array.isArray(gameState?.eventcards)
      ? gameState.eventcards
      : []
    : allEventCards.length
    ? allEventCards
    : Array.isArray(localEventCards)
    ? localEventCards
    : localEventCards.eventcards || [];

  // Фильтрация по типу удачи
  const positiveFortuneCards = safeEventCards.filter(card => card.fortune === 'positive');
  const negativeFortuneCards = safeEventCards.filter(card => card.fortune === 'negative');

  return (
    <div className="container-fluid">
      <div className="row flex-column flex-sm-row">
        <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column justify-content-center align-items-center text-center">
          {!isAuthorized && (
            <div className="alert alert-warning mb-3">
              Вы не подключены к игре. Ниже — список всех доступных событий. Для участия войдите в
              игру.
            </div>
          )}
          <h2>Event Cards</h2>
          <div className="row positive-row">
            <FortuneCards cards={positiveFortuneCards} title="Positive Fortune Cards" />
          </div>
          <div className="row negative-row">
            <FortuneCards cards={negativeFortuneCards} title="Negative Fortune Cards" />
          </div>
        </div>

        <div className="col-12 col-sm-3 order-1 order-sm-2 border-start">
          <Menu gameState={gameState} myUserId={myUserId} setGameState={setGameState} />
        </div>
      </div>
    </div>
  );
};

export default EventCard;
