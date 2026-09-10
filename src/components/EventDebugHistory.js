import React, { useMemo, useState } from 'react';
import { debugText, localizeDebugValue } from '../debug/debugTranslations';

function renderEffect(effect) {
  if (!Array.isArray(effect) || !effect.length) return '—';
  return effect
    .map(item =>
      Object.entries(item || {})
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
        .join(', ')
    )
    .filter(Boolean)
    .join(' · ');
}

export default function EventDebugHistory({ entries = [], lang, playerId = null, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const filtered = useMemo(() => {
    const list = Array.isArray(entries) ? entries : [];
    if (!playerId) return list;
    return list.filter(entry => {
      if (entry.actorId === playerId || entry.recipientId === playerId) return true;
      return (entry.cards || []).some(card => card?.target?.playerId === playerId);
    });
  }, [entries, playerId]);

  return (
    <div className="mt-3">
      <button className="btn btn-sm btn-outline-dark mb-2" type="button" onClick={() => setOpen(v => !v)}>
        🎴 {open ? debugText(lang, 'hideEventHistory') : debugText(lang, 'showEventHistory')} ({filtered.length})
      </button>
      {open && (
        <div className="border rounded p-2 bg-light">
          <h6>🎴 {debugText(lang, 'eventHistory')}</h6>
          {!filtered.length ? (
            <div className="text-muted small">{debugText(lang, 'noEventHistory')}</div>
          ) : (
            filtered.map(entry => (
              <div key={entry.id} className="border rounded bg-white p-2 mb-2">
                <div className="small text-muted mb-1">
                  [{new Date(entry.ts).toLocaleTimeString()}] {debugText(lang, 'round')}: {entry.round}
                </div>
                {entry.kind === 'decision' ? (
                  <>
                    <strong>🎯 {debugText(lang, 'eventDecision')}: {entry.actorName || '—'}</strong>
                    {entry.actorIsBot && (
                      <span className="badge bg-secondary ms-2">
                        {entry.behaviorProfile || 'bot'} · {entry.policyVersion || '—'}
                      </span>
                    )}
                    {(entry.cards || []).map(card => (
                      <div key={`${entry.id}:${card.cardId}`} className="mt-2 ps-2 border-start">
                        <div><strong>🃏 {localizeDebugValue(card.title, lang) || card.cardId}</strong></div>
                        <div className="small">{localizeDebugValue(card.description, lang) || '—'}</div>
                        <div className="small"><strong>{debugText(lang, 'choice')}:</strong> {debugText(lang, card.choice === 'keep' ? 'keep' : 'use')}</div>
                        {card.target?.playerName && <div className="small"><strong>{debugText(lang, 'targetPlayer')}:</strong> {card.target.playerName}</div>}
                        {card.target?.sector && <div className="small"><strong>{debugText(lang, 'targetSector')}:</strong> {card.target.sector}</div>}
                        {card.target?.traderName && <div className="small"><strong>{debugText(lang, 'targetTrader')}:</strong> {localizeDebugValue(card.target.traderName, lang) || card.target.traderId}</div>}
                        <div className="small text-muted"><strong>effect:</strong> {renderEffect(card.effect)}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <strong>⚡ {debugText(lang, 'eventResult')}: {entry.recipientName || '—'}</strong>
                    <div className="small text-muted">{debugText(lang, 'engineResult')}</div>
                    <ul className="mb-0 mt-1">
                      {(entry.messages || []).map((message, index) => <li key={index}>{message}</li>)}
                    </ul>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
