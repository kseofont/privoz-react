import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import Trader from './Trader';

import { handleSectorClickLogic, handleAddTraderLogic } from '../logic/logic';


const PrivozSector = ({ category, maxTraders, traders, setTraders, setCurrentUserData }) => {
    const [clickedSector, setClickedSector] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showNotEnoughMoneyModal, setShowNotEnoughMoneyModal] = useState(false);
    const [showMaxTradersModal, setShowMaxTradersModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [coinsDecrease, setCoinsDecrease] = useState(0); // Declare coinsDecrease here
    const status = 'Your player: X';
    const traderContainerRef = useRef(null); // Create a ref for the container

    // Modal for showing updated information
    const [showUpdatedInfoModal, setShowUpdatedInfoModal] = useState(false);
    const [updatedInfo, setUpdatedInfo] = useState({ traders: [], randomCard: null });
    const handleUpdatedInfoModalClose = () => setShowUpdatedInfoModal(false);



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
        handleSectorClickLogic(category, setClickedSector, setShowModal, setCurrentUser, setCurrentUserData, setCoinsDecrease, traders);
    };




    const handleAddTrader = () => {
        handleAddTraderLogic(clickedSector, maxTraders, setShowModal, setShowMaxTradersModal, setShowNotEnoughMoneyModal, setTraders, setCurrentUserData, setShowUpdatedInfoModal, setUpdatedInfo, currentUser, traders, setCurrentUser);
    };




    // useEffect to log the updated state after rendering
    useEffect(() => {
        //console.log('Updated traders state:', traders);
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
                    <p>New Trader price is {coinsDecrease} coins</p>

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
            {/* // Modal component for "Not Enough Money" */}
            <Modal show={showNotEnoughMoneyModal} onHide={() => setShowNotEnoughMoneyModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Not Enough Money</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    You do not have enough money to add a trader. Please acquire more coins before adding a trader.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setShowNotEnoughMoneyModal(false)}>
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>
            {/* Modal for showing updated information */}
            {/* Modal for showing updated information */}
            <Modal show={showUpdatedInfoModal} onHide={handleUpdatedInfoModalClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Trader Added Successfully!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>Your traders have been updated:</div>
                    {updatedInfo.traders.map((trader, index) => (
                        <div key={index}>{trader.traderName} in {trader.location}</div>
                    ))}
                    <div>You've received a new event card:</div>
                    {updatedInfo.randomCard ? (
                        console.log({ updatedInfo }),
                        <div>{updatedInfo.randomCard.title}</div>
                    ) : (
                        <div>No event card received</div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleUpdatedInfoModalClose}>
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>


        </div>
    );
};

export default PrivozSector;
