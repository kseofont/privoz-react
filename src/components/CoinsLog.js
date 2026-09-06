// CoinsLog.jsx
import React, { useMemo } from 'react';

export default function CoinsLog(props) {
  const {
    gameState, // можно не использовать, но оставлю для расширений
    myUserId, // можно не использовать, но оставлю для расширений
    limit = 50,
    coinsLog: coinsLogProp = [], // <-- безопасное значение по умолчанию и другое имя
  } = props;

  const entries = useMemo(() => {
    const all = Array.isArray(coinsLogProp) ? coinsLogProp : [];
    return [...all].sort((a, b) => b.ts - a.ts).slice(0, limit);
  }, [coinsLogProp, limit]); // <-- добавили coinsLogProp в зависимости

  if (!entries.length) return <div className="text-muted">Изменений монет пока нет</div>;

  return (
    <div className="coins-log">
      <div className="font-semibold mb-2">История монет</div>
      <ul className="space-y-1">
        {entries.map(e => (
          <li key={e.id} className="text-sm">
            <span title={new Date(e.ts).toLocaleString()}>
              [{new Date(e.ts).toLocaleTimeString()}]
            </span>{' '}
            {e.delta >= 0 ? '➕' : '➖'}
            {e.delta} (было {e.before} → стало {e.after}) — {e.reason}
            {e.source ? ` · источник: ${e.source}` : ''}
            {e.cardId ? ` · карта: ${e.cardId}` : ''}
            {e.sectorId ? ` · сектор: ${e.sectorId}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
