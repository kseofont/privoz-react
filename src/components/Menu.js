import React from 'react';
import { Link } from 'react-router-dom';

const Menu = ({ category, users = [] }) => {
    const traders = users.map((user, index) => (
        // Assuming you want to render some content for each user
        // You can customize this based on your requirements
        <div key={index}>{/* Add your content for each user */}</div>
    ));

    const sectorClassName = `border p-3 mb-3 ${category}`;

    return (
        <div className="col">
            <h3>Menu</h3>

            {/* Navigation links */}
            <nav className='d-flex justify-content-between'>
                <Link to="/">Privoz</Link>
                <Link to="/wholesale">Wholesale Marketplace</Link>
            </nav>

            {/* Button with text "Next" */}
            <button type="button">Next</button>

            {/* Render traders or other content based on your requirements */}
            {traders}
        </div>
    );
};

export default Menu;
