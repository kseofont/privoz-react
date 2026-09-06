import React from 'react';
import ProductMini from './ProductMini';
import { getField } from '../logic/logic';
import { useTranslation } from 'react-i18next';

const Trader = ({ user, trader, gameState }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';

  if (!user || !user.name || !user.color || !trader) {
    console.warn('TRADER INVALID:', { user, trader });
    return (
      <div className="col border text-center trader-block pb-4">
        <p>Error: Invalid user or trader data</p>
      </div>
    );
  }

  const { name, color } = user;

  // Попытка дополнить недостающие данные из gameState
  let completeTrader = { ...trader };
  if (gameState?.traders && trader.id) {
    const fullTraderData = gameState.traders.find(t => t.id === trader.id);
    if (fullTraderData) {
      completeTrader = {
        ...fullTraderData,
        ...completeTrader,
        goods: completeTrader.goods || fullTraderData.goods || [],
      };
    }
  }
  console.log('completeTrader.traderImg', completeTrader.img);
  console.log('completeTrader', completeTrader);

  // Получаем родителя продавца по ownerId
  // const parentUser = gameState?.users?.find(u => u.id === completeTrader.ownerId) || {};

  return (
    <div className={`col border text-center pb-4 trader-block ${color}`}>
      <div className="userdata">{completeTrader.traderName}</div>

      <img
        src={completeTrader.img || '/img/aza.webp'}
        alt={completeTrader.traderName}
        className="traderimg"
        onError={e => {
          e.target.onerror = null;
          e.target.src = '/img/aza.webp';
        }}
      />

      <p style={{ color: completeTrader.owner?.color }}>
        {completeTrader.owner?.name || 'Неизвестный владелец'}
      </p>

      <div className="container-fluid">
        <div>
          {completeTrader.goods && completeTrader.goods.length > 0 ? (
            completeTrader.goods.map((good, goodIndex) => {
              let enrichedGood = { ...good };

              // Безопасный доступ к productData
              let fullProductData = null;

              if (Array.isArray(gameState?.products)) {
                fullProductData = gameState.products.find(p => p.id === good.productId);
              } else if (typeof gameState?.products === 'object' && gameState.products !== null) {
                fullProductData = gameState.products[good.productId];
              }

              if (fullProductData) {
                enrichedGood = {
                  ...fullProductData,
                  ...enrichedGood,
                };
              }

              return (
                <div key={goodIndex} className="row gap-1">
                  <div className="col border p-0 text-center p-1 product">
                    <ProductMini
                      sector={enrichedGood.sector}
                      productName={getField(enrichedGood, 'productName', lang)}
                      imageSrc={enrichedGood.imageSrc}
                      wholesalePrice={enrichedGood.wholesalePrice}
                      retailPrice={enrichedGood.sellingPrice}
                      quantity_card={enrichedGood.quantity_card}
                      quantity_free_card={enrichedGood.quantity_free_card}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted">Нет товаров у этого торговца</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Trader;
