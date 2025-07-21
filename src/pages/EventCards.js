import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import FortuneCards from '../components/FortuneCards';
import Menu from '../components/Menu';

const EventCard = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';

  const location = useLocation();
  const params = useParams();

  const initialGameState = location.state?.gameState || window.gameState || null;
  const [gameState, setGameState] = useState(initialGameState);
  const [allEventCards, setAllEventCards] = useState([]);

  // Универсальная логика: использовать eventcards из gameState, иначе fallback fetch
  useEffect(() => {
    if (gameState && gameState.eventcards) {
      setAllEventCards(gameState.eventcards);
    } else {
      fetch('/data/eventcards.json')
        .then(response => {
          if (!response.ok) throw new Error('Ошибка загрузки eventcards.json');
          return response.json();
        })
        .then(data => setAllEventCards(data))
        .catch(err => console.error('Ошибка при fetch eventcards.json:', err));
    }
  }, [gameState]);

  // Отбор позитивных/негативных карточек
  const positiveFortuneCards = allEventCards.filter(card => card.fortune === 'positive');
  const negativeFortuneCards = allEventCards.filter(card => card.fortune === 'negative');

  return (
    <div className="container">
      <div className="row">
        <div className="col-9">
          <h2>Event Cards</h2>
          <div className="row positive-row">
            <FortuneCards cards={positiveFortuneCards} title="Positive Fortune Cards" />
          </div>
          <div className="row negative-row">
            <FortuneCards cards={negativeFortuneCards} title="Negative Fortune Cards" />
          </div>
        </div>

        <div className="col-3">
          <Menu />
        </div>
      </div>
    </div>
  );
};

export default EventCard;
