import React, { useEffect, useState } from 'react';

const TraderList = () => {
  const [all_traders, setAllTraders] = useState([]);

  useEffect(() => {
    fetch('/TradersList.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при загрузке TradersList.json');
        }
        return response.json();
      })
      .then(data => setAllTraders(data))
      .catch(error => console.error('Ошибка при fetch:', error));
  }, []);

  return (
    <div className="container mt-4">
      <h2>Все доступные торговцы</h2>
      <div className="row">
        {all_traders.map(trader => (
          <div key={trader.traderId} className="col-md-4 mb-4">
            <div className="card h-100">
              {trader.img && (
                <img
                  src={trader.img}
                  className="card-img-top"
                  alt={trader.name}
                  style={{ maxHeight: '200px', objectFit: 'cover' }}
                />
              )}
              <div className="card-body">
                <h5 className="card-title">{trader.name}</h5>
                <p className="card-text">
                  <strong>Bio:</strong> {trader.bio}
                </p>
                <p className="card-text">
                  <strong>Special:</strong> {trader.special}
                </p>
                <p className="card-text">
                  <strong>Trader Benefit:</strong> {trader.trader_benefit}
                </p>
                <p className="card-text">
                  <strong>Special Power:</strong> {trader.special_power}
                </p>
                <p className="card-text">
                  <strong>Sector Favorite:</strong> {trader.sector_favorite}
                </p>
                <p className="card-text">
                  <strong>Best Sector:</strong> {trader.best_sector}
                </p>
                <p className="card-text">
                  <strong>Extra Abilities:</strong> {trader.extra_abilities}
                </p>
                <p className="card-text">
                  <strong>Event Card Favorite ID:</strong> {trader.eventcards_favorite_id}
                </p>
                <p className="card-text">
                  <strong>Taken:</strong> {trader.taken ? 'Да' : 'Нет'}
                </p>
                <p className="card-text">
                  <strong>Goods:</strong>{' '}
                  {trader.goods.length > 0 ? trader.goods.join(', ') : 'Нет товаров'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TraderList;
