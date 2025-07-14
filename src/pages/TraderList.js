import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Menu from '../components/Menu';

const TraderList = () => {
  const [all_traders, setAllTraders] = useState([]);
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';

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

  // Вынесем функцию безопасного доступа к переводимым полям
  const getField = (obj, field) => {
    const value = obj[field];
    if (!value) return '';
    if (typeof value === 'string') return value; // fallback для старых данных
    return value[lang] || value.en || Object.values(value)[0] || '';
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-9">
          <h2>All available traders</h2>
          <div className="row">
            {all_traders.map(trader => (
              <div key={trader.traderId} className="col-md-4 mb-4">
                <div className="">
                  <div className="card h-100">
                    {trader.img && (
                      <img
                        src={trader.img}
                        className="card-img-top"
                        alt={getField(trader, 'name')}
                        style={{ maxHeight: '200px', objectFit: 'cover' }}
                      />
                    )}
                    <div className="card-body">
                      <h5 className="card-title">{getField(trader, 'name')}</h5>
                      <p className="card-text">
                        <strong>Bio:</strong> {getField(trader, 'bio')}
                      </p>
                      <p className="card-text">
                        <strong>Special:</strong> {getField(trader, 'special')}
                      </p>
                      <p className="card-text">
                        <strong>Trader Benefit:</strong> {getField(trader, 'trader_benefit')}
                      </p>
                      <p className="card-text">
                        <strong>Special Power:</strong> {getField(trader, 'special_power')}
                      </p>
                      <p className="card-text">
                        <strong>Sector Favorite:</strong> {getField(trader, 'sector_favorite')}
                      </p>
                      <p className="card-text">
                        <strong>Best Sector:</strong> {getField(trader, 'best_sector')}
                      </p>
                      <p className="card-text">
                        <strong>Extra Abilities:</strong> {getField(trader, 'extra_abilities')}
                      </p>
                      <p className="card-text">
                        <strong>Event Card Favorite ID:</strong> {trader.eventcards_favorite_id}
                      </p>
                      <p className="card-text">
                        <strong>Taken:</strong> {trader.taken ? 'Да' : 'Нет'}
                      </p>
                      <p className="card-text">
                        <strong>Goods:</strong>{' '}
                        {trader.goods && trader.goods.length > 0
                          ? trader.goods.join(', ')
                          : 'Нет товаров'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-3">
          <Menu />
        </div>
      </div>
    </div>
  );
};

export default TraderList;
