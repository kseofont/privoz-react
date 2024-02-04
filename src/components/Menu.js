import React from 'react';
import { Link } from 'react-router-dom';

// ... (your existing imports)

const Menu = ({ category, users = [], currentUserData }) => {




    let user_color;

    if (currentUserData && currentUserData.color) {
        // Access the color property safely
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
                    <p>event: {currentUserData.sectorsWithTraders.join(', ')}</p>
                    <pre>{JSON.stringify(currentUserData, null)}</pre>
                </div>

            )}
        </div>
    );
};

export default Menu;
