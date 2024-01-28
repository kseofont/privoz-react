import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import Trader from './Trader';

const PrivozSector = ({ category, maxTraders, traders, setTraders, setCurrentUserData }) => {
    const [clickedSector, setClickedSector] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showMaxTradersModal, setShowMaxTradersModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const status = 'Your player: X';
    const traderContainerRef = useRef(null); // Create a ref for the container

    // Ensure users and users.traders are defined
    const filteredUsers = traders
        .filter(user => user.traders && user.traders.some(trader => trader.location === category))
        .map(user => {
            // Filter traders based on location and user ID
            const filteredTraders = user.traders.filter(
                trader => trader.location === category && user.user_id === trader.traderOwnerId
            );
            // Return a new object with the filtered traders
            return {
                ...user,
                traders: filteredTraders,
            };
        })
        .slice(0, maxTraders);

    const tradersList = filteredUsers.map((user, index) =>
        user.traders.map((trader, traderIndex) => (
            <Trader key={`${index}-${traderIndex}`} user={user} trader={trader} />
        ))
    );

    const handleSectorClick = () => {
        // Update the clicked sector in state
        setClickedSector(category);
        setShowModal(true);

        // Set the current user
        const user = traders.find(user => user.current_user === 'current');
        setCurrentUser(user);
    };

    const handleAddTrader = () => {
        // Check if the number of traders in the selected sector is less than maxTraders
        const tradersInSelectedSector = filteredUsers.filter(
            user =>
                user.traders && // Ensure traders array is defined
                user.traders.some(trader => trader.location === clickedSector)
        );

        if (tradersInSelectedSector.length < maxTraders) {
            // Perform actions to add trader
            const newTraderKey = `trader-${clickedSector}-${(traders || []).length + 1}`;
            let user = traders.find(user => user.current_user === 'current');
            setCurrentUser(user);
            const newTraderData = {
                user_id: user.user_id,
                name: user.name,
                color: user.color,
                className: user.className,
                traders: [
                    {
                        traderOwnerId: user.user_id,
                        traderName: `Trader${tradersInSelectedSector.length + 1}`,
                        location: clickedSector,
                        goods: [
                            {
                                sector: clickedSector,
                                productName: 'Onion',
                                imageSrc: '../img/apples.svg',
                                wholesalePrice: '2',
                                retailPrice: '4',
                                possibleIncome: '2',
                                quantity_card: '16',
                            },
                            // ... Additional goods data
                        ],
                    },
                ],
            };

            // Update the traderData array using the setTraderData function passed from props
            setTraders(prevTraders => [...prevTraders, newTraderData]);

            // Update the currentUserData state based on the new trader
            setCurrentUserData(prevUserData => {
                if (!prevUserData) {
                    return null; // No need to update if currentUserData is not available
                }

                const updatedCoins = prevUserData.coins - 5;

                const updatedTraders = [
                    ...prevUserData.sectorsWithTraders,
                    newTraderData.traders[0].location
                ];

                return {
                    ...prevUserData,
                    tradersCount: prevUserData.tradersCount + 1,
                    sectorsWithTraders: updatedTraders,
                    coins: updatedCoins,
                };
            });


            // Close the modal
            setShowModal(false);
            setCurrentUser(null);
            console.log(tradersInSelectedSector.length);
            console.log('Updated traders state:', traders);
            console.log('Updated traders state:', traders);

            // You can perform other actions here based on the clicked sector,
            // such as sending it to a server, updating a context, etc.
        } else {
            // Notify the user that the maximum number of traders is reached
            setShowModal(false); // Close the current modal
            setShowMaxTradersModal(true); // Show the max traders modal
        }
    };


    // useEffect to log the updated state after rendering
    useEffect(() => {
        console.log('Updated traders state:', traders);
    }, []); // Dependency array ensures the effect runs only when 'traders' changes

    const sectorClassName = `sector border p-3 mb-3 ${category.toLowerCase()}`;

    return (
        <div className="col" ref={traderContainerRef}>
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
                <Modal.Body>Are you sure you want to add a trader to {category} sector?
                    <p>New Trader price is 5 coins</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleAddTrader}>
                        Add Trader
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Max Traders Modal */}
            <Modal show={showMaxTradersModal} onHide={() => setShowMaxTradersModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Maximum Traders Reached</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Maximum number of traders ({maxTraders}) reached in this sector. You cannot add another trader.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setShowMaxTradersModal(false)}>
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PrivozSector;
