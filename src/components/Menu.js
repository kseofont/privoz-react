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
                    {currentUserData.eventCards && (
                        <ul>
                            {currentUserData.eventCards.map((card, index) => (
                                <li key={index}>{card.title}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default Menu;
