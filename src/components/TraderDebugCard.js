import React from 'react';
import DebugValue from './DebugValue';
import ProductDebugCard from './ProductDebugCard';
import { debugText, localizeDebugValue } from '../debug/debugTranslations';

const PRIMARY_FIELDS = [
  'name',
  'bio',
  'special',
  'sector_favorite',
  'trader_benefit',
  'special_power',
  'best_sector',
  'extra_abilities',
  'location',
  'trader_action',
];

const SERVICE_FIELDS = [
  'traderId',
  'taken',
  'card_in_game',
  'eventcards_favorite_id',
  'traderOwnerId',
  'img',
];

export default function TraderDebugCard({ trader, lang, index = 0, showServiceOpen = false }) {
  if (!trader) return null;

  const name = localizeDebugValue(trader.name, lang) || trader.traderName || `#${index + 1}`;
  const known = new Set([...PRIMARY_FIELDS, ...SERVICE_FIELDS, 'goods', 'products']);
  const extraFields = Object.keys(trader).filter(key => !known.has(key)).sort();
  const goods = Array.isArray(trader.goods) ? trader.goods : [];
  const legacyProducts = Array.isArray(trader.products) ? trader.products : [];

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <div className="d-flex gap-3 align-items-start mb-3">
          {trader.img && (
            <img
              src={trader.img}
              alt={name}
              style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 8 }}
            />
          )}
          <div className="flex-grow-1">
            <h5 className="mb-1">🧑‍🌾 {name}</h5>
            <div className="small text-muted">
              🆔 {trader.traderId || '—'} · 📍 {trader.location || debugText(lang, 'hand')} · 🚦 {trader.trader_action || debugText(lang, 'normal')}
            </div>
          </div>
        </div>

        {PRIMARY_FIELDS.filter(key => Object.prototype.hasOwnProperty.call(trader, key)).map(key => (
          <DebugValue key={key} fieldKey={key} value={trader[key]} lang={lang} />
        ))}

        <div className="mt-3">
          <strong>📦 {debugText(lang, 'goods')} ({goods.length})</strong>
          {goods.length ? (
            <div className="mt-2">
              {goods.map((product, productIndex) => (
                <ProductDebugCard
                  key={`${product.productId || productIndex}-${productIndex}`}
                  product={product}
                  lang={lang}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="small text-muted mt-1">—</div>
          )}
        </div>

        {legacyProducts.length > 0 && (
          <div className="mt-3">
            <strong>📦 {debugText(lang, 'legacyProducts')} ({legacyProducts.length})</strong>
            <div className="mt-2">
              {legacyProducts.map((product, productIndex) => (
                <ProductDebugCard
                  key={`${product.productId || productIndex}-${productIndex}`}
                  product={product}
                  lang={lang}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        <details className="mt-3" open={showServiceOpen}>
          <summary><strong>🛠️ {debugText(lang, 'traderDebugFields')}</strong></summary>
          <div className="mt-2">
            {SERVICE_FIELDS.filter(key => Object.prototype.hasOwnProperty.call(trader, key)).map(key => (
              <DebugValue key={key} fieldKey={key} value={trader[key]} lang={lang} />
            ))}
            {extraFields.map(key => (
              <DebugValue key={key} fieldKey={key} value={trader[key]} lang={lang} />
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
