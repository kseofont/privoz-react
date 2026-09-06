// src/components/CurrentPlayerInfo.js
import React from 'react';
import { getField } from '../logic/logic';

const CurrentPlayerInfo = ({ player, lang }) => {
  if (!player) return null;

  const user_color = player.color || 'red';
  const userBackgroundColorClass = `bg-${user_color}`;
  const uniqueSectors = [...new Set(player?.traders?.map(trader => trader.location) || [])];
  // Список "ключ: значение" для всех полей, кроме уже явно выведенных:
  const mainKeys = [
    'user_id',
    'name',
    'color',
    'coins',
    'tradersCount',
    'traders',
    'products',
    'eventCards',
  ];
  const extraFields = Object.entries(player)
    .filter(([key]) => !mainKeys.includes(key))
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={`user-info mt-5 ${userBackgroundColorClass}`}>
      <p>Id: {player.user_id}</p>
      <p>Name: {player.name}</p>
      <p className={user_color}>Color: {player.color}</p>
      <p>Coins: {player.coins}</p>
      <p>Traders Count: {player.tradersCount}</p>

      {/* Все остальные поля динамически */}
      <div className="mb-2">
        <p>
          <b>All player fields (debug):</b>
        </p>
        <ul style={{ fontSize: '0.95em', color: '#888' }}>
          {extraFields.map(([key, value]) => (
            <li key={key}>
              <b>{key}:</b>{' '}
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </li>
          ))}
        </ul>
      </div>

      {player.traders && player.traders.length > 0 ? (
        <>
          <p>Ваши торговцы:</p>
          <ul style={{ fontSize: '0.95em', color: '#888' }}>
            {player.traders.map((trader, traderIndex) => (
              <li key={traderIndex} className="mb-2 p-2 border rounded">
                <div>
                  <b>Trader #{traderIndex + 1}</b>
                  <ul>
                    {Object.entries(trader).map(([key, value]) => (
                      <li key={key}>
                        <b>{key}:</b>{' '}
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
          <p>Ваши торговцы:</p>

          <ul className="list-unstyled">
            {player.traders.map((trader, traderIndex) => (
              <li key={traderIndex} className="mb-2 p-2 border rounded">
                <p>
                  Торговец: {trader.traderName || getField(trader, 'name', lang) || 'Без имени'}
                </p>
                <p>Избранный сектор: {getField(trader, 'sector_favorite', lang) || 'неизвестно'}</p>
                {trader.goods && trader.goods.length > 0 && (
                  <div>
                    <p>Товары:</p>
                    <ul className="list-unstyled">
                      {trader.goods.map((goods, productIndex) => (
                        <li key={productIndex} className="mb-1">
                          <p>Название: {getField(goods, 'productName', lang)}</p>
                          {goods.sellingPrice && <p>Price: {goods.sellingPrice} </p>}
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

      <p>Sectors with Traders:</p>
      <ul>
        {uniqueSectors.map((sector, index) => (
          <li key={index}>{sector}</li>
        ))}
      </ul>

      {player.products && player.products.length > 0 && (
        <div>
          <p>Ваши товары:</p>
          <ul className="list-unstyled">
            {player.products.map((product, productIndex) => (
              <li key={productIndex} className="mb-1">
                <p>
                  Название: {getField(product, 'productName', lang)}{' '}
                  {product.quantity_player_card && <span> X {product.quantity_player_card}</span>}
                </p>
                {product.description && <p>Описание: {getField(product, 'description', lang)} </p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p>Event Cards Count: {player.eventCards ? player.eventCards.length : 0}</p>
      <p>Event Cards:</p>
      {player.eventCards && player.eventCards.length > 0 ? (
        <ul className="list-unstyled">
          {player.eventCards.map((card, index) => (
            <li
              key={index}
              className={`event-card ${card.fortune === 'negative' ? 'bg-danger' : 'bg-success'}`}
            >
              <p>Title: {getField(card, 'title', lang)}</p>
              <p>Description: {getField(card, 'description', lang)}</p>
              <p>Fortune: {card.fortune}</p>
              <p>Quantity In Game: {card.quantity_ingame}</p>
              <p>Quantity Active: {card.quantity_active}</p>
              <p>Position In Game: {card.position_in_game}</p>
              <p>Goal Action: {card.goal_action}</p>
              <p>Goal Item: {card.goal_item}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No Event Cards.</p>
      )}
    </div>
  );
};

export default CurrentPlayerInfo;
