import React from 'react';
import DebugValue from './DebugValue';
import ProductDebugCard from './ProductDebugCard';
import TraderDebugCard from './TraderDebugCard';
import { debugText, localizeDebugValue } from '../debug/debugTranslations';
import { expandEventCardInstances } from '../game/eventCardInstances';

const PLAYER_MAIN_KEYS = new Set([
  'user_id',
  'name',
  'color',
  'coins',
  'tradersCount',
  'traders',
  'products',
  'eventCards',
]);

function EventCardInfo({ card, lang }) {
  const title = localizeDebugValue(card?.title, lang) || card?.id || 'Event card';
  const description = localizeDebugValue(card?.description, lang);
  return (
    <div className={`border rounded p-2 mb-2 ${card?.fortune === 'negative' ? 'border-danger' : 'border-success'}`}>
      <div className="d-flex justify-content-between gap-2">
        <strong>🎴 {title}</strong>
        <span className={`badge ${card?.fortune === 'negative' ? 'bg-danger' : 'bg-success'}`}>
          {card?.fortune || '—'}
        </span>
      </div>
      {description && <div className="mt-1">{description}</div>}
      <div className="small text-muted mt-2">
        {debugText(lang, 'id')}: {card?.id || '—'}
        {card?.instanceId ? ` · copy: ${card.instanceId}` : ''}
        {' · '}
        {debugText(lang, 'goal')}: {card?.goal_action || '—'} / {card?.goal_item || '—'}
      </div>
      {Array.isArray(card?.effect) && card.effect.length > 0 && (
        <details className="mt-2">
          <summary>effect</summary>
          <DebugValue fieldKey="effect" value={card.effect} lang={lang} showDescription={false} />
        </details>
      )}
    </div>
  );
}

const CurrentPlayerInfo = ({ player, lang }) => {
  if (!player) return null;

  const extraFields = Object.entries(player)
    .filter(([key]) => !PLAYER_MAIN_KEYS.has(key))
    .sort(([a], [b]) => a.localeCompare(b));
  const traders = Array.isArray(player.traders) ? player.traders : [];
  const products = Array.isArray(player.products) ? player.products : [];
  const eventCards = expandEventCardInstances(player.eventCards);

  return (
    <section className="user-info mt-5 border rounded p-3 bg-white">
      <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start mb-3">
        <div>
          <h4 className="mb-1">👤 {debugText(lang, 'currentPlayer')}: {player.name || '—'}</h4>
          <div className="small text-muted">🆔 {debugText(lang, 'id')}: {player.user_id}</div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <span className="badge bg-warning text-dark">🪙 {player.coins ?? 0}</span>
          <span className="badge bg-secondary">🧑‍🌾 {traders.length}</span>
          <span className="badge bg-secondary">📦 {products.length}</span>
          <span className="badge bg-secondary">🎴 {eventCards.length}</span>
          {player.isBot && (
            <span className="badge bg-dark">🤖 {player.botBehaviorProfile || 'bot'} · {player.botPolicyVersion || '—'}</span>
          )}
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-6"><strong>🎨 {debugText(lang, 'color')}:</strong> {player.color || '—'}</div>
        <div className="col-md-6"><strong>📍 {debugText(lang, 'sectors')}:</strong> {(player.sectorsWithTraders || []).filter(Boolean).join(', ') || '—'}</div>
      </div>

      <details className="mb-4">
        <summary><strong>🛠️ {debugText(lang, 'playerDebugFields')}</strong></summary>
        <div className="mt-2 border rounded p-2 bg-light">
          {extraFields.length ? extraFields.map(([key, value]) => (
            <DebugValue key={key} fieldKey={key} value={value} lang={lang} />
          )) : <div className="text-muted">—</div>}
        </div>
      </details>

      <h5>🧑‍🌾 {debugText(lang, 'traders')} ({traders.length})</h5>
      {traders.length ? (
        traders.map((trader, index) => (
          <TraderDebugCard key={trader.traderId || index} trader={trader} lang={lang} index={index} />
        ))
      ) : (
        <p className="text-muted">{debugText(lang, 'noTraders')}</p>
      )}

      <h5 className="mt-4">📦 {debugText(lang, 'productsInHand')} ({products.length})</h5>
      {products.length ? (
        products.map((product, index) => (
          <ProductDebugCard key={`${product.productId || index}-${index}`} product={product} lang={lang} />
        ))
      ) : (
        <p className="text-muted">{debugText(lang, 'noProducts')}</p>
      )}

      <h5 className="mt-4">🎴 {debugText(lang, 'eventCards')} ({eventCards.length})</h5>
      {eventCards.length ? (
        eventCards.map((card, index) => (
          <EventCardInfo key={card.instanceId || card.id || index} card={card} lang={lang} />
        ))
      ) : (
        <p className="text-muted">{debugText(lang, 'noEventCards')}</p>
      )}
    </section>
  );
};

export default CurrentPlayerInfo;
