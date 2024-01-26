import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import Trader from './Trader';

const PrivozSector = (props) => {
    const { category, users, traders, setTraders } = props;

    const [clickedSector, setClickedSector] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Log the updated traders state after rendering
        console.log('WOWWWW Updated traders state:', traders);
    }, [traders]);

    const handleSectorClick = () => {
        const currentUserData = users.find((user) => user.current_user === 'current');
        setClickedSector(category);
        setShowModal(true);
        setCurrentUser(currentUserData);
    };

    const handleAddTrader = () => {
        const tradersInSelectedSector = users.filter(
            (user) =>
                user.traders &&
                user.traders.some((trader) => trader.location === clickedSector) &&
                user.current_user === 'current'
        );

        if (tradersInSelectedSector.length === 0) {
            // Perform actions to add trader
            const newTraderData = {
                name: 'Yaroslav',
                color: 'red',
                className: 'user3',
                traders: [
                    {
                        traderName: 'Trader2',
                        location: clickedSector,
                        goods: [
                            {
                                sector: clickedSector,
                                productName: 'Onion',
                                imageSrc: '../img/apple.svg',
                                wholesalePrice: '2',
                                retailPrice: '4',
                                possibleIncome: '2',
                                quantity_card: '16',
                            },
                            // ... (other goods)
                        ],
                    },
                ],
            };

            // Update the traderData array using the setTraders function passed from props
            setTraders((prevTraders) => [...prevTraders, newTraderData]);

            // Close the modal
            setShowModal(false);
            setCurrentUser(null);

            // You can perform other actions here based on the clicked sector,
            // such as sending it to a server, updating a context, etc.
        } else {
            // Notify the user that a trader already exists in the selected sector
            alert('A trader already exists in this sector. You cannot add another trader.');
            setShowModal(false);
            setCurrentUser(null);
        }
    };

    const filteredUsers = users.filter((user) => user.traders && user.traders.some((trader) => trader.location === category));
    const tradersList = filteredUsers.map((user, index) => <Trader key={index} user={user} />);

    const status = 'Your player: X';
    const sectorClassName = `sector border p-3 mb-3 ${category.toLowerCase()}`;

    return (
        <div className="col">
            <div className={sectorClassName} onClick={handleSectorClick}>
                <div className="row gap-1">
                    <div className="status">{status}</div>

                    {tradersList.length > 0 ? (
                        tradersList
                    ) : (
                        <div className="col">
                            <p>No traders in this sector</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal component */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Trader Addition</Modal.Title>
                </Modal.Header>
                <Modal.Body>Are you sure you want to add a trader to {category} sector?</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleAddTrader}>
                        Add Trader
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PrivozSector;
