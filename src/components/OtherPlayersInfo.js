import React from 'react';
import CoinsLog from './CoinsLog';
import DebugValue from './DebugValue';
import EventDebugHistory from './EventDebugHistory';
import ProductDebugCard from './ProductDebugCard';
import PlayerActivityHistory from './PlayerActivityHistory';
import TraderDebugCard from './TraderDebugCard';
import { debugText } from '../debug/debugTranslations';

const PRIVATE_OR_RENDERED = new Set([
  'eventCards',
  'traders',
  'products',
  'coins',
  'name',
  'color',
  'user_id',
  'tradersCount',
]);

const OtherPlayersInfo = ({
  otherUsers,
  lang,
  coinHistoryByPlayer = {},
  eventHistory = [],
  activityHistory = [],
}) => {
  if (!otherUsers || otherUsers.length === 0) return null;

  return (
    <section className="other-users mt-4">
      <h4>👥 {debugText(lang, 'otherPlayers')}</h4>
      <div className="small text-muted mb-2">🔐 {debugText(lang, 'hiddenPrivateCards')}</div>

      {otherUsers.map((user, userIndex) => {
        const traders = Array.isArray(user.traders) ? user.traders : [];
        const products = Array.isArray(user.products) ? user.products : [];
        const extraFields = Object.entries(user)
          .filter(([key]) => !PRIVATE_OR_RENDERED.has(key))
          .sort(([a], [b]) => a.localeCompare(b));

        return (
          <div key={user.user_id || userIndex} className="card mb-3 shadow-sm">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                <div>
                  <h5 className="mb-1">👤 {user.name || `#${userIndex + 1}`}</h5>
                  <div className="small text-muted">🎨 {user.color || '—'} · 🆔 {user.user_id || '—'}</div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-warning text-dark">🪙 {user.coins ?? 0}</span>
                  <span className="badge bg-secondary">🧑‍🌾 {traders.length}</span>
                  <span className="badge bg-secondary">📦 {products.length}</span>
                  {user.isBot && (
                    <span className="badge bg-dark">🤖 {user.botBehaviorProfile || 'bot'} · {user.botPolicyVersion || '—'}</span>
                  )}
                </div>
              </div>

              <div className="mt-2"><strong>📍 {debugText(lang, 'sectors')}:</strong> {(user.sectorsWithTraders || []).filter(Boolean).join(', ') || '—'}</div>

              <details className="mt-3">
                <summary><strong>🔎 {debugText(lang, 'publicPlayerDetails')}</strong></summary>
                <div className="mt-2">
                  {extraFields.map(([key, value]) => (
                    <DebugValue key={key} fieldKey={key} value={value} lang={lang} />
                  ))}
                </div>
              </details>

              <div className="mt-3">
                <h6>🧑‍🌾 {debugText(lang, 'traders')} ({traders.length})</h6>
                {traders.length ? traders.map((trader, index) => (
                  <TraderDebugCard
                    key={trader.traderId || index}
                    trader={trader}
                    lang={lang}
                    index={index}
                  />
                )) : <div className="text-muted small">{debugText(lang, 'noTraders')}</div>}
              </div>

              <details className="mt-3">
                <summary><strong>📦 {debugText(lang, 'productsInHand')} ({products.length})</strong></summary>
                <div className="mt-2">
                  {products.length ? products.map((product, index) => (
                    <ProductDebugCard
                      key={`${product.productId || index}-${index}`}
                      product={product}
                      lang={lang}
                    />
                  )) : <div className="text-muted small">{debugText(lang, 'noProducts')}</div>}
                </div>
              </details>

              <PlayerActivityHistory
                entries={activityHistory}
                lang={lang}
                playerId={user.user_id}
                defaultOpen={false}
              />

              <CoinsLog
                entries={coinHistoryByPlayer[user.user_id] || []}
                lang={lang}
                defaultOpen={false}
                limit={200}
              />

              <EventDebugHistory
                entries={eventHistory}
                lang={lang}
                playerId={user.user_id}
                defaultOpen={false}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default OtherPlayersInfo;
