import React from 'react';
import { Link } from 'react-router-dom';

const Menu = ({ currentUserData }) => {
    let user_color;

    if (currentUserData && currentUserData.color) {
        user_color = currentUserData.color;
    } else {
        user_color = 'red';
    }

    return (
        <div className="col">
            <h3>Menu</h3>

            {/* Navigation links */}
            <nav className='d-flex justify-content-between flex-column mb-3'>
                <Link to="/app">App</Link>
                <Link to="/">Privoz</Link>
                <Link to="/wholesale">Wholesale Marketplace</Link>
                <Link to="/eventcards">Event Cards</Link>
            </nav>

            {/* Display information for the current user */}
            {currentUserData && (
                <div className='user-info'>
                    <p>Id: {currentUserData.user_id}</p>
                    <p>Name: {currentUserData.name}</p>
                    <p className={user_color}>Color: {currentUserData.color}</p>
                    <p>Coins: {currentUserData.coins}</p>
                    <p>Traders Count: {currentUserData.tradersCount}</p>
                    <p>Sectors with Traders: {currentUserData.sectorsWithTraders.join(', ')}</p>
                    <p>Event Cards Count: {currentUserData.eventCards ? currentUserData.eventCards.length : 0}</p>
                    <p>Event Cards:</p>

                    {currentUserData && currentUserData.eventCards && currentUserData.eventCards.length > 0 ? (
                        <ul className="list-unstyled">
                            {currentUserData.eventCards.map((card, index) => (
                                <li key={index} className={`event-card ${card.fortune === 'negative' ? 'bg-danger' : 'bg-success'}`}>
                                    <p>Title: {card.title}</p>
                                    <p>Description: {card.description}</p>
                                    <p>Fortune: {card.fortune}</p>
                                    <p>Quantity In Game: {card.quantity_ingame}</p>
                                    <p>Quantity Active: {card.quantity_active}</p>
                                    <p>Position In Game: {card.position_in_game}</p>
                                    <p>Goal Action: {card.goal_action}</p>
                                    <p>Goal Item: {card.goal_item}</p>
                                    {card.effect && card.effect.length > 0 && (
                                        <div>
                                            <p>Effect:</p>
                                            <ul className="list-unstyled">
                                                {card.effect.map((effect, effectIndex) => (
                                                    <li key={effectIndex}>
                                                        {Object.keys(effect).map((key, subIndex) => (
                                                            <p key={subIndex}>{key}: {JSON.stringify(effect[key])}</p>
                                                        ))}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>


                    ) : (
                        <p>No Event Cards.</p>
                    )}

                    {/* Additional details from currentUserData */}
                    {/* Include any additional details you want to display */}

                </div>
            )}
        </div>
    );
};

export default Menu;
