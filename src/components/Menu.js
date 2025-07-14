import React from 'react';
import { useTranslation } from 'react-i18next';
import { endTurn } from '../logic/logic';
import { connectionsRef } from '../globals';
import { Link, useLocation } from 'react-router-dom';

const Menu = ({
  // currentUserData = null,

  myUserId,
  gameState = null,
  connection = null,
  setGameState,
  broadcastGameState,
}) => {
  let user_color;
  const currentUserData = gameState?.players?.find(p => p.user_id === myUserId) || null;
  const otherUsers = gameState?.players?.filter(p => p.user_id !== myUserId) || [];

  const userBackgroundColorClass = currentUserData ? `bg-${currentUserData.color}` : '';
  //let myUserId = currentUserData?.user_id || null;
  const location = useLocation();
  const isGamePage = location.pathname.startsWith('/game');

  if (currentUserData && currentUserData.color) {
    user_color = currentUserData.color;
  } else {
    user_color = 'red';
  }
  // Определяем, твой ли ход
  const myTurn = gameState?.currentTurnUserId === myUserId;
  const isHost = !connection; // у хоста нет connection

  console.log('myTurn', myTurn);
  console.log('gameState', gameState);

  const handleEndTurn = () => {
    console.log('END TURN CLICK', {
      connection,
      myTurn,
      myUserId,
      setGameState,
      broadcastGameState,
      gameState,
      connectionsRef,
    });
    endTurn({
      connection,
      myTurn,
      myUserId,
      setGameState,
      broadcastGameState,
      gameState,
      connectionsRef,
    });
  };
  // Extract unique sectors from traders
  const uniqueSectors = [
    ...new Set(currentUserData?.traders?.map(trader => trader.location) || []),
  ];
  console.log('myUserId:', myUserId);
  console.log('otherUsers:', otherUsers);
  console.log('currentTurnUserId:', gameState?.currentTurnUserId);
  console.log('myTurn:', myTurn);
  console.log('gameState:', gameState);

  const { t, i18n } = useTranslation();

  return (
    <div className="col">
      <div className="language-block col-12">
        <button onClick={() => i18n.changeLanguage('ua')}>Українська</button>
        <button onClick={() => i18n.changeLanguage('ru')}>Русский</button>
        <button onClick={() => i18n.changeLanguage('es')}>Español</button>
        <button onClick={() => i18n.changeLanguage('en')}>English</button>
      </div>

      <h3>Menu</h3>

      {/* Navigation links */}
      <nav className="d-flex justify-content-between flex-column mb-3">
        <Link to="/">{t('menu_start_page')}</Link>
        <Link to="/privoz">{t('menu_privoz')}</Link>
        <Link to="/wholesale">{t('menu_wholesale')}</Link>
        <Link to="/eventcards">{t('menu_eventcards')}</Link>
        <Link to="/rules">{t('menu_rules')}</Link>
        <Link to="/create">{t('menu_create')}</Link>
        <Link to="/JoinGamePage">{t('menu_join')}</Link>
        <Link to="/traders">{t('menu_traders')}</Link>
      </nav>
      {/* {End turn button} */}
      {isGamePage && myTurn ? (
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

      {/* Display information for the current user */}
      {currentUserData && (
        <div className={`user-info ${userBackgroundColorClass}`}>
          <p>Id: {currentUserData.user_id}</p>
          <p>Name: {currentUserData.name}</p>
          <p className={user_color}>Color: {currentUserData.color}</p>
          <p>Coins: {currentUserData.coins}</p>
          <p>Traders Count: {currentUserData.tradersCount}</p>
          {currentUserData.traders && currentUserData.traders.length > 0 && (
            <div>
              <p>Products from Your Traders:</p>
              <ul className="list-unstyled">
                {currentUserData.traders.map((trader, traderIndex) => (
                  <li key={traderIndex}>
                    <p>Trader: {trader.traderName}</p>
                    <p>Trader sector: {trader.location}</p>
                    {trader.goods && trader.goods.length > 0 && (
                      <ul className="list-unstyled">
                        {trader.goods.map((product, productIndex) => (
                          <li key={productIndex}>
                            <p>Product: {product.productName}</p>
                            {/* Include other product details as needed */}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p>Sectors with Traders: </p>
          <ul>
            {uniqueSectors.map((sector, index) => (
              <li key={index}>{sector}</li>
            ))}
          </ul>

          <p>
            Event Cards Count: {currentUserData.eventCards ? currentUserData.eventCards.length : 0}
          </p>
          <p>Event Cards:</p>

          {currentUserData &&
          currentUserData.eventCards &&
          currentUserData.eventCards.length > 0 ? (
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

          {/* Additional details from currentUserData */}
          {/* Include any additional details you want to display */}

          {/* Display information about other users, their traders, and products */}
        </div>
      )}
      <div className="other-users">
        {otherUsers.length > 0 && (
          <div className="user-info">
            <p>Other Users in Game:</p>
            <ul className="list-unstyled">
              {otherUsers.map((user, userIndex) => {
                const userBackgroundColorClass = user.color ? `bg-${user.color}` : '';
                return (
                  <li key={userIndex} className={userBackgroundColorClass}>
                    <p>User: {user.name}</p>
                    <p>Coins: {user.coins}</p>
                    {user.traders && user.traders.length > 0 && (
                      <ul className="list-unstyled">
                        {user.traders.map((trader, traderIndex) => {
                          const traderBackgroundColorClass = trader.location
                            ? `bg-${trader.location.toLowerCase()}`
                            : '';
                          return (
                            <li key={traderIndex} className={traderBackgroundColorClass}>
                              <p>Trader: {trader.traderName}</p>
                              {trader.goods && trader.goods.length > 0 && (
                                <ul className="list-unstyled">
                                  {trader.goods.map((product, productIndex) => (
                                    <li key={productIndex}>
                                      <p>Product: {product.productName}</p>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
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
