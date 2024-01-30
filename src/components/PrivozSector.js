import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import Trader from './Trader';

// Import your event cards data
import eventCardsData from '../eventcards.json';

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
        // Update the clicked sector in state
        setClickedSector(category);

        // Set the current user
        const user = traders.find(user => user.current_user === 'current');
        setCurrentUser(user);

        // Use the callback function of setCurrentUserData to access the previous state
        setCurrentUserData(prevUserData => {
            // Calculate the total number of traders (previous + new)
            const totalTradersCount = user.traders.length + prevUserData.tradersCount;

            // Calculate the coins decrease based on the total number of traders
            const coinsDecrease = totalTradersCount <= 1 ? 0 : (totalTradersCount - 1) * 5;
            setCoinsDecrease(coinsDecrease);

            // Show the modal
            setShowModal(true);

            // Return the updated state
            return {
                ...prevUserData,
                // You can update other properties of prevUserData here if needed
            };
        });
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
                                imageSrc: '../img/onion.svg',
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

                const currentUserTraders = currentUser ? currentUser.traders.length : 0;
                const totalTradersCount = currentUserTraders + prevUserData.tradersCount;

                // Increment coinsDecrease by 5 for every additional trader (starting from 2)
                const coinsDecrease = totalTradersCount <= 1 ? 0 : (totalTradersCount - 1) * 5;

                const updatedCoins = prevUserData.coins - coinsDecrease;
                if (updatedCoins < 0) {
                    // Show a message or handle the scenario where coins go below zero
                    setShowNotEnoughMoneyModal(true);
                    return prevUserData;
                }

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


            // Select a random card from eventCardsData with "position_in_game": "deck" and "quantity_active" more than 0
            const availableCards = eventCardsData.filter(card => card.position_in_game === 'deck' && card.quantity_active > 0);
            const randomCardsForTraders = []; // Array to store random cards for each trader

            // Loop through the traders of the current user and assign a random card to each
            const updatedTraders = user.traders.map(trader => {
                // Select a random card from the available cards
                const randomCardIndex = Math.floor(Math.random() * availableCards.length);
                const randomCard = availableCards[randomCardIndex];

                // Update the card's position_in_game to "hand"
                randomCard.position_in_game = "hand";

                // Decrement the quantity_active for the selected card
                randomCard.quantity_active--;

                // Remove the card from available cards if its quantity becomes 0
                if (randomCard.quantity_active === 0) {
                    availableCards.splice(randomCardIndex, 1);
                }

                // Store the random card for this trader
                randomCardsForTraders.push(randomCard);

                // Return the updated trader with the assigned card
                return {
                    ...trader,
                    eventCard: randomCard, // Add a new property to store the assigned event card
                };
            });

            // Show modal with information about the updated current user traders and the randomly selected card
            setShowUpdatedInfoModal(true);
            setUpdatedInfo({
                traders: updatedTraders,
                randomCard: randomCardsForTraders,
            });
            // Add the new card to the sector if it's not already present
            const sectorIndex = eventCardsData.findIndex(card => card.position_in_game === 'deck' && card.quantity_active > 0 && card.goal_action === 'sector' && card.goal_item === clickedSector);
            if (sectorIndex !== -1) {
                // Decrement the quantity_active for the selected card
                const updatedEventCards = [...eventCardsData];
                updatedEventCards[sectorIndex].quantity_active--;

            }

            setCurrentUser(null);
        } else {
            setShowModal(false); // Close the current modal
            setShowMaxTradersModal(true); // Show the max traders modal
        }
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
            <Modal show={showUpdatedInfoModal} onHide={handleUpdatedInfoModalClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Trader Added Successfully!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Your traders have been updated:</p>
                    {updatedInfo.traders.map((trader, index) => (
                        <p key={index}>{trader.traderName} in {trader.location}</p>
                    ))}
                    <p>You've received a new event card:</p>
                    <p>{updatedInfo.randomCard ? (

                        <p>{updatedInfo.randomCard.title}</p>

                    ) : (
                        <p>No event card received</p>
                    )}</p>
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
