import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { endTurn, handleEndRound, getField } from '../logic/logic';
import { connectionsRef } from '../globals';
import { Link, useParams, useLocation } from 'react-router-dom';

const Menu = ({
  myUserId: propMyUserId,
  gameState: propGameState = null,
  connection = null,
  setGameState,
  broadcastGameState,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const location = useLocation();
  const { peerId: urlPeerId } = useParams();
  const pathname = location.pathname;

  // --- Вычисляем myUserId и gameState (fallback из window, если нет в props)
  const myUserId =
    propMyUserId ||
    urlPeerId ||
    (typeof window !== 'undefined' && window.myUserId) ||
    (propGameState?.players?.[0]?.user_id ?? null);

  const gameState = propGameState || (typeof window !== 'undefined' && window.gameState) || null;

  // Текущий игрок и другие игроки
  const currentUserData = gameState?.players?.find(p => p.user_id === myUserId) || null;
  const otherUsers = gameState?.players?.filter(p => p.user_id !== myUserId) || [];

  const user_color = currentUserData?.color || 'red';
  const userBackgroundColorClass = currentUserData ? `bg-${user_color}` : '';

  // Для каких страниц показываем кнопку "Конец хода"
  const specialPages = ['/game', '/traders', '/wholesale', '/eventcards'];
  const isSpecialPage = specialPages.some(page => pathname.startsWith(page));

  const myTurn = gameState?.currentTurnUserId === myUserId;
  const isHost = !connection; // у хоста нет connection

  const handleEndTurn = () => {
    console.log('connection in menu', connection);
    endTurn({
      connection,
      myTurn,
      myUserId,
      gameState,
      setGameState,
      broadcastGameState,
      connectionsRef,
    });
  };

  useEffect(() => {
    if (isHost) {
      console.log('[TraderList][HOST] connectionsRef.current:', connectionsRef.current);
    }
  }, [isHost, gameState]);

  // Уникальные сектора, в которых есть твои трейдеры
  const uniqueSectors = [
    ...new Set(currentUserData?.traders?.map(trader => trader.location) || []),
  ];

  return (
    <div className="col">
      <div className="language-block col-12 mb-4">
        <button onClick={() => i18n.changeLanguage('ua')}>Укр</button>
        <button onClick={() => i18n.changeLanguage('ru')}>Рус</button>
        <button onClick={() => i18n.changeLanguage('es')}>Esp</button>
        <button onClick={() => i18n.changeLanguage('en')}>Eng</button>
      </div>

      <div className="rules">
        <Link to="/rules" className="btn btn-primary mb-2">
          {t('menu_rules')}
        </Link>
      </div>

      <h3>Menu</h3>

      {/* Навигация */}
      <nav className="d-flex justify-content-between flex-column mb-3">
        <Link to="/" className="mb-2">
          {t('menu_start_page')}
        </Link>
        <h3>Game pages</h3>
        <Link to={`/game/${myUserId}`}>{t('menu_privoz')}</Link>
        <Link to={`/wholesale/${myUserId}`}>{t('menu_wholesale')}</Link>
        <Link to={`/eventcards/${myUserId}`}>{t('menu_eventcards')}</Link>
        <Link to={`/traders/${myUserId}`} className="mb-2">
          {t('menu_traders')}
        </Link>
        <Link to="/create">{t('menu_create')}</Link>
        <Link to="/JoinGamePage">{t('menu_join')}</Link>
      </nav>

      {/* Кнопка конец хода/инфо о ходе */}
      {isSpecialPage && myTurn ? (
        <button className="btn btn-warning mt-3" onClick={handleEndTurn}>
          Закончить ход{isHost ? ' (Хост)' : ''}
        </button>
      ) : (
        gameState?.players && (
          <div className="alert alert-info mt-3">
            Сейчас ходит:{' '}
            {gameState.players.find(p => p.user_id === gameState.currentTurnUserId)?.name || (
              <span>...</span>
            )}
          </div>
        )
      )}
      {/* Кнопка и инфо по раунду */}
      <div className="mt-3">
        <div className="alert alert-info mb-2">Раунд: {gameState?.round || 1}</div>

        {/* Кнопка "Конец раунда" только для хоста, если был совершен хотя бы один ход */}
        {isHost &&
          (gameState?.round > 1 || gameState?.players?.some(p => p.traders?.length > 0)) && (
            <button className="btn btn-danger" onClick={handleEndRound()}>
              Конец раунда
            </button>
          )}
      </div>

      {/* Информация о текущем игроке */}
      {currentUserData && (
        <div className={`user-info mt-5 ${userBackgroundColorClass}`}>
          <p>Id: {currentUserData.user_id}</p>
          <p>Name: {currentUserData.name}</p>
          <p className={user_color}>Color: {currentUserData.color}</p>
          <p>Coins: {currentUserData.coins}</p>
          <p>Traders Count: {currentUserData.tradersCount}</p>
          {/* Торговцы игрока */}
          {currentUserData.traders && currentUserData.traders.length > 0 ? (
            <>
              <p>Ваши торговцы:</p>
              <ul className="list-unstyled">
                {currentUserData.traders.map((trader, traderIndex) => (
                  <li key={traderIndex} className="mb-2 p-2 border rounded">
                    <p>
                      Торговец: {trader.traderName || getField(trader, 'name', lang) || 'Без имени'}
                    </p>

                    <p>
                      Избранный сектор: {getField(trader, 'sector_favorite', lang) || 'неизвестно'}
                    </p>

                    {trader.products && trader.products.length > 0 && (
                      <div>
                        <p>Товары:</p>
                        <ul className="list-unstyled">
                          {trader.products.map((product, productIndex) => (
                            <li key={productIndex} className="mb-1">
                              <p>Название: {getField(product, 'productName', lang)}</p>
                              {product.description && (
                                <p>Описание: {getField(trader, 'description', lang)}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>У вас пока нет торговцев</p>
          )}

          {/* Уникальные сектора */}
          <p>Sectors with Traders:</p>
          <ul>
            {uniqueSectors.map((sector, index) => (
              <li key={index}>{sector}</li>
            ))}
          </ul>

          {/* Товары игрока напрямую */}
          {currentUserData.products && currentUserData.products.length > 0 && (
            <div>
              <p>Ваши товары:</p>
              <ul className="list-unstyled">
                {currentUserData.products.map((product, productIndex) => (
                  <li key={productIndex} className="mb-1">
                    <p>Название: {getField(product, 'productName', lang)}</p>
                    {product.description && (
                      <p>Описание: {getField(product, 'description', lang)}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p>
            Event Cards Count: {currentUserData.eventCards ? currentUserData.eventCards.length : 0}
          </p>
          <p>Event Cards:</p>
          {currentUserData.eventCards && currentUserData.eventCards.length > 0 ? (
            <ul className="list-unstyled">
              {currentUserData.eventCards.map((card, index) => (
                <li
                  key={index}
                  className={`event-card ${
                    card.fortune === 'negative' ? 'bg-danger' : 'bg-success'
                  }`}
                >
                  <p>Title: {card.title}</p>
                  <p>Description: {card.description}</p>
                  <p>Fortune: {card.fortune}</p>
                  <p>Quantity In Game: {card.quantity_ingame}</p>
                  <p>Quantity Active: {card.quantity_active}</p>
                  <p>Position In Game: {card.position_in_game}</p>
                  <p>Goal Action: {card.goal_action}</p>
                  <p>Goal Item: {card.goal_item}</p>
                  {card.effect && card.effect.length > 0 && (
                    <div>
                      <p>Effect:</p>
                      <ul className="list-unstyled">
                        {card.effect.map((effect, effectIndex) => (
                          <li key={effectIndex}>
                            {Object.keys(effect).map((key, subIndex) => (
                              <p key={subIndex}>
                                {key}: {JSON.stringify(effect[key])}
                              </p>
                            ))}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No Event Cards.</p>
          )}
        </div>
      )}

      {/* Информация о других игроках */}
      {/* Информация о других игроках */}
      <div className="other-users">
        {otherUsers.length > 0 && (
          <div className="user-info">
            <p>Other Users in Game:</p>
            <ul className="list-unstyled">
              {otherUsers.map((user, userIndex) => {
                const userBackgroundColorClass = user.color ? `bg-${user.color}` : '';
                return (
                  <li key={userIndex} className={`p-2 mb-2 rounded ${userBackgroundColorClass}`}>
                    <p>
                      <strong>{user.name}</strong> ({user.color})
                    </p>
                    <p>Coins: {user.coins}</p>

                    {/* Товары игрока напрямую */}
                    {user.products && user.products.length > 0 && (
                      <div>
                        <p>Продукты у игрока: {user.products.length}</p>
                        <ul className="list-unstyled">
                          {user.products.map((product, productIndex) => (
                            <li key={productIndex} className="mb-1">
                              <p>Название: {getField(product, 'productName', lang)}</p>
                              {product.description && (
                                <p>Описание: {getField(product, 'description', lang)}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Торговцы игрока */}
                    {user.traders && user.traders.length > 0 ? (
                      <div>
                        <p>Торговцы: {user.traders.length}</p>
                        <ul className="list-unstyled">
                          {user.traders.map((trader, traderIndex) => (
                            <li key={traderIndex} className="ms-3">
                              <p>
                                Торговец:{' '}
                                {trader.traderName || getField(trader, 'name', lang) || 'Без имени'}
                              </p>

                              {trader.products && trader.products.length > 0 && (
                                <p>Продукты у этого торговца: {trader.products.length}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p>Нет торговцев</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
