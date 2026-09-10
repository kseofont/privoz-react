import React from 'react';
import DebugValue from './DebugValue';
import { debugText, localizeDebugValue } from '../debug/debugTranslations';

const ORDER = [
  'productName',
  'productId',
  'legality',
  'sector',
  'product_sector',
  'wholesalePrice',
  'sellingPrice',
  'profit',
  'quantity_player_card',
  'quantity_free_card',
  'quantity_card',
  'total_profit',
  'imageSrc',
];

export default function ProductDebugCard({ product, lang, compact = false }) {
  if (!product) return null;
  const name = localizeDebugValue(product.productName, lang) || `#${product.productId ?? '?'}`;
  const keys = [
    ...ORDER.filter(key => Object.prototype.hasOwnProperty.call(product, key)),
    ...Object.keys(product).filter(key => !ORDER.includes(key)),
  ];

  return (
    <div className="border rounded p-2 mb-2 bg-light">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
        <strong>📦 {name}</strong>
        <span className={`badge ${product.legality === 'illegal' ? 'bg-danger' : 'bg-success'}`}>
          {product.legality || 'unknown'}
        </span>
      </div>
      {compact ? (
        <div className="small">
          #{product.productId ?? '—'} · {product.sector || product.product_sector || '—'} · {product.quantity_player_card || 1}x · {product.wholesalePrice ?? '—'}→{product.sellingPrice ?? '—'}
        </div>
      ) : (
        <details>
          <summary className="mb-2">🛠️ {debugText(lang, 'productDebugFields')}</summary>
          {keys.map(key => (
            <DebugValue key={key} fieldKey={key} value={product[key]} lang={lang} />
          ))}
        </details>
      )}
    </div>
  );
}
