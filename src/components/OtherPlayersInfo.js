// src/components/OtherPlayersInfo.js
import React from 'react';
import { getField } from '../logic/logic';

const OtherPlayersInfo = ({ otherUsers, lang }) => {
  if (!otherUsers || otherUsers.length === 0) return null;

  return (
    <div className="other-users">
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
    </div>
  );
};

export default OtherPlayersInfo;
