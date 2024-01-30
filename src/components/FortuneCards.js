import React from 'react';

const FortuneCards = ({ cards, title }) => {
    return (
        <div className='row fortune-card'>
            <h2>{title}</h2>
            <div className='row'>
                {cards.map((card, index) => (
                    <div key={index} className="col" style={{ border: '1px solid #ddd', padding: '10px', margin: '10px', width: '300px' }}>
                        <h4>{card.title}</h4>
                        <p>Description: {card.description}</p>
                        <p>Fortune: {card.fortune}</p>
                        <p>Quantity In Game: {card.quantity_ingame}</p>
                        <p>Quantity Active: {card.quantity_active}</p>
                        <p>Position In Game: {card.position_in_game}</p>
                        <p>Goal Action: {card.goal_action}</p>
                        <p>Goal Item: {card.goal_item}</p>

                        {card.effect && (
                            <div>
                                <h5>Effects:</h5>
                                <ul>
                                    {card.effect.map((effect, effectIndex) => (
                                        <li key={effectIndex}>
                                            {Object.keys(effect).map(key => (
                                                <p key={key}>{key}: {JSON.stringify(effect[key])}</p>
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
