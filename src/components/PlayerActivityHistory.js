import React, { useMemo, useState } from 'react';
import { localizeDebugValue } from '../debug/debugTranslations';

const LABELS = {
  en: {
    title: 'Player state history', show: 'Show state history', hide: 'Hide state history', empty: 'No state changes yet',
    trader_added: 'Trader acquired', product_added: 'Product acquired', trader_moved: 'Trader moved',
    trader_goods_changed: 'Trader goods changed', event_card_count_changed: 'Event-card count changed', turn_started: 'Turn started', turn_ended: 'Turn ended', round: 'Round',
  },
  ru: {
    title: 'История изменений игрока', show: 'Показать изменения игрока', hide: 'Скрыть изменения игрока', empty: 'Изменений пока нет',
    trader_added: 'Получен продавец', product_added: 'Получен товар', trader_moved: 'Перемещение продавца',
    trader_goods_changed: 'Изменились товары продавца', event_card_count_changed: 'Изменилось количество карт событий', turn_started: 'Ход начался', turn_ended: 'Ход завершён', round: 'Раунд',
  },
  ua: {
    title: 'Історія змін гравця', show: 'Показати зміни гравця', hide: 'Сховати зміни гравця', empty: 'Змін поки немає',
    trader_added: 'Отримано продавця', product_added: 'Отримано товар', trader_moved: 'Переміщення продавця',
    trader_goods_changed: 'Змінилися товари продавця', event_card_count_changed: 'Змінилася кількість карт подій', turn_started: 'Хід розпочато', turn_ended: 'Хід завершено', round: 'Раунд',
  },
  es: {
    title: 'Historial de cambios del jugador', show: 'Mostrar cambios del jugador', hide: 'Ocultar cambios del jugador', empty: 'Todavía no hay cambios',
    trader_added: 'Vendedor adquirido', product_added: 'Producto adquirido', trader_moved: 'Vendedor movido',
    trader_goods_changed: 'Productos del vendedor modificados', event_card_count_changed: 'Cambió el número de cartas de evento', turn_started: 'Turno iniciado', turn_ended: 'Turno finalizado', round: 'Ronda',
  },
};

function tx(lang, key) {
  return LABELS[lang]?.[key] || LABELS.en[key] || key;
}

function Details({ entry, lang }) {
  const c = entry.context || {};
  if (entry.type === 'trader_added') {
    return <div>🧑‍🌾 {localizeDebugValue(c.traderName, lang) || c.traderId}</div>;
  }
  if (entry.type === 'product_added') {
    const p = c.product || {};
    return <div>📦 {localizeDebugValue(p.productName, lang) || p.productId} ×{p.quantity || 1}</div>;
  }
  if (entry.type === 'trader_moved') {
    return <div>🧑‍🌾 {localizeDebugValue(c.traderName, lang) || c.traderId}: 📍 {c.from || 'hand'} → {c.to || 'hand'}</div>;
  }
  if (entry.type === 'trader_goods_changed') {
    return (
      <div>
        <div>🧑‍🌾 {localizeDebugValue(c.traderName, lang) || c.traderId}</div>
        <ul className="mb-0 ps-3">
          {(c.changes || []).map((change, index) => (
            <li key={index}>📦 {localizeDebugValue(change.productName, lang) || change.productId}: {change.before} → {change.after} ({change.delta >= 0 ? '+' : ''}{change.delta})</li>
          ))}
        </ul>
      </div>
    );
  }
  if (entry.type === 'event_card_count_changed') {
    return <div>🎴 {c.before} → {c.after} ({c.delta >= 0 ? '+' : ''}{c.delta})</div>;
  }
  return null;
}

export default function PlayerActivityHistory({ entries = [], lang = 'en', playerId = null, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const filtered = useMemo(() => {
    const list = Array.isArray(entries) ? entries : [];
    return playerId ? list.filter(entry => entry.playerId === playerId) : list;
  }, [entries, playerId]);

  return (
    <div className="mt-3">
      <button type="button" className="btn btn-sm btn-outline-dark mb-2" onClick={() => setOpen(v => !v)}>
        🧾 {open ? tx(lang, 'hide') : tx(lang, 'show')} ({filtered.length})
      </button>
      {open && (
        <div className="border rounded p-2 bg-light">
          <h6>🧾 {tx(lang, 'title')}</h6>
          {!filtered.length ? <div className="small text-muted">{tx(lang, 'empty')}</div> : filtered.map(entry => (
            <div key={entry.id} className="border rounded bg-white p-2 mb-2">
              <div className="small text-muted">[{new Date(entry.ts).toLocaleTimeString()}] {tx(lang, 'round')}: {entry.round}</div>
              <strong>{tx(lang, entry.type)}</strong>
              <Details entry={entry} lang={lang} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
