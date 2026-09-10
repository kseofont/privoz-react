import React, { useMemo, useState } from 'react';
import { debugText, localizeDebugValue } from '../debug/debugTranslations';

function reasonLabel(entry, lang) {
  const map = {
    initial: 'reasonInitial',
    trader_purchase: 'reasonTraderPurchase',
    product_purchase: 'reasonProductPurchase',
    round_sale: 'reasonRoundSale',
    event_effect: 'reasonEventEffect',
    income: 'reasonIncome',
    expense: 'reasonExpense',
  };
  return debugText(lang, map[entry?.reasonType] || 'reasonUnknown');
}

function CoinChangeDetails({ entry, lang }) {
  const context = entry?.context || {};
  const rows = [];

  (context.traders || []).forEach(trader => {
    rows.push(`🧑‍🌾 ${localizeDebugValue(trader.name, lang) || trader.traderId}`);
  });

  (context.products || []).forEach(product => {
    const name = localizeDebugValue(product.productName, lang) || `#${product.productId}`;
    rows.push(
      `📦 ${name} ×${product.quantity || 1} · ${product.sector || '—'} · ${product.legality || '—'} · ${product.wholesalePrice ?? '—'}`
    );
  });

  (context.soldGoods || []).forEach(product => {
    const traderName = localizeDebugValue(product.traderName, lang) || product.traderId || '—';
    const productName = localizeDebugValue(product.productName, lang) || `#${product.productId}`;
    rows.push(
      `💵 ${traderName}: ${productName} ×${product.quantity || 0} · ${product.unitPrice || 0} = ${product.total || 0}`
    );
  });

  (context.eventMessages || []).forEach(message => rows.push(`🎴 ${message}`));

  if (context.cost !== undefined) rows.push(`💸 ${debugText(lang, 'amount')}: ${context.cost}`);
  if (context.revenue !== undefined) rows.push(`💰 ${debugText(lang, 'amount')}: +${context.revenue}`);
  if (context.saleGross !== undefined && context.saleGross !== context.revenue) {
    rows.push(`🧮 ${debugText(lang, 'detectedSales')}: +${context.saleGross}`);
  }
  if (context.phase) rows.push(`🧭 ${debugText(lang, 'phase')}: ${context.phase}`);
  if (context.round !== undefined) rows.push(`🔄 ${debugText(lang, 'round')}: ${context.round}`);

  if (!rows.length) return null;

  return (
    <div className="mt-1 small text-muted">
      <div><strong>{debugText(lang, 'sourceDetails')}:</strong></div>
      <ul className="mb-0 ps-3">
        {rows.map((row, index) => <li key={index}>{row}</li>)}
      </ul>
    </div>
  );
}

export default function CoinsLog({
  limit = 100,
  coinsLog = [],
  entries = null,
  lang = 'en',
  defaultOpen = true,
  title = null,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const source = entries === null ? coinsLog : entries;
  const rows = useMemo(() => {
    const all = Array.isArray(source) ? source : [];
    return [...all].sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0)).slice(0, limit);
  }, [source, limit]);

  return (
    <div className="coins-log mt-3">
      <button
        type="button"
        className="btn btn-sm btn-outline-dark mb-2"
        onClick={() => setOpen(value => !value)}
      >
        🪙 {open ? debugText(lang, 'hideHistory') : debugText(lang, 'showHistory')} ({rows.length})
      </button>
      {open && (
        <div className="border rounded p-2 bg-light">
          <h6>🪙 {title || debugText(lang, 'coinsHistory')}</h6>
          {!rows.length ? (
            <div className="text-muted small">{debugText(lang, 'noCoinChanges')}</div>
          ) : (
            <div>
              {rows.map(entry => (
                <div key={entry.id} className="border rounded bg-white p-2 mb-2">
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="small text-muted" title={new Date(entry.ts).toLocaleString()}>
                      [{new Date(entry.ts).toLocaleTimeString()}]
                    </span>
                    <strong>{entry.delta >= 0 ? '➕' : '➖'} {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}</strong>
                    <span>{entry.before} → {entry.after}</span>
                    <span className="badge bg-secondary">{reasonLabel(entry, lang)}</span>
                  </div>
                  <CoinChangeDetails entry={entry} lang={lang} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
