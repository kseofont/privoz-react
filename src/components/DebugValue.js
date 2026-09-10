import React from 'react';
import { getDebugFieldMeta, localizeDebugValue } from '../debug/debugTranslations';

function RecursiveValue({ value, lang, depth = 0 }) {
  const localized = localizeDebugValue(value, lang);
  if (localized !== null) {
    return <span>{localized}</span>;
  }

  if (Array.isArray(value)) {
    if (!value.length) return <span>—</span>;
    return (
      <ul className="mb-0 ps-3">
        {value.map((item, index) => (
          <li key={index}>
            <RecursiveValue value={item} lang={lang} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return <span>—</span>;
    return (
      <div className={depth > 0 ? 'ps-2 border-start' : ''}>
        {entries.map(([key, nested]) => {
          const meta = getDebugFieldMeta(key, lang);
          return (
            <div key={key} className="mb-1">
              <span className="text-muted me-1">{meta.icon}</span>
              <strong>{meta.label}:</strong>{' '}
              <RecursiveValue value={nested} lang={lang} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

export default function DebugValue({ fieldKey, value, lang, showDescription = true }) {
  const meta = getDebugFieldMeta(fieldKey, lang);
  return (
    <div className="mb-2">
      <div>
        <span className="me-1">{meta.icon}</span>
        <strong>{meta.label}:</strong>{' '}
        <RecursiveValue value={value} lang={lang} />
      </div>
      {showDescription && meta.description && (
        <div className="small text-muted ms-4">{meta.description}</div>
      )}
    </div>
  );
}
