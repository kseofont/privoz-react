import React from 'react';
import { useTranslation } from 'react-i18next';

const FortuneCards = ({ cards, title }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';

  return (
    <div className="row fortune-card">
      <h2>{title}</h2>
      <div className="row">
        {cards.map((card, index) => (
          <div
            key={index}
            className="col"
            style={{ border: '1px solid #ddd', padding: '10px', margin: '10px', width: '300px' }}
          >
            <h4>{card.title?.[lang] || card.title?.en || ''}</h4>
            <p>
              <strong>Description:</strong> {card.description?.[lang] || card.description?.en || ''}
            </p>
            <p>
              <strong>Fortune:</strong> {card.fortune}
            </p>
            <p>
              <strong>Quantity In Game:</strong> {card.quantity_ingame}
            </p>
            <p>
              <strong>Quantity Active:</strong> {card.quantity_active}
            </p>
            <p>
              <strong>Position In Game:</strong> {card.position_in_game}
            </p>
            <p>
              <strong>Goal Action:</strong> {card.goal_action}
            </p>
            <p>
              <strong>Goal Item:</strong> {card.goal_item}
            </p>

            {card.effect && (
              <div>
                <h5>Effects:</h5>
                <ul>
                  {card.effect.map((effect, effectIndex) => (
                    <li key={effectIndex}>
                      {Object.keys(effect).map(key => (
                        <p key={key}>
                          {key}: {JSON.stringify(effect[key])}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FortuneCards;
