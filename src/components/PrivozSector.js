import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Row, Col } from "react-bootstrap";
import Trader from "./Trader";

import { handleSectorClickLogic, handleAddTraderLogic } from "../logic/logic";

import productsData from "../products.json"; // Data with all products

const PrivozSector = ({
    category,
    maxTraders,
    traders,
    setTraders,
    setCurrentUserData,
    currentUserData,
    otherUsers
}) => {
    const [clickedSector, setClickedSector] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showNotEnoughMoneyModal, setShowNotEnoughMoneyModal] = useState(false);
    const [showMaxTradersModal, setShowMaxTradersModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null); // !!!
    const [coinsDecrease, setCoinsDecrease] = useState(0); // Declare coinsDecrease here
    const traderContainerRef = useRef(null); // Create a ref for the container   
    const [showUpdatedInfoModal, setShowUpdatedInfoModal] = useState(false);
    const [showWholeModal, setShowWholeModal] = useState(false);
    const [sectorProducts, setSectorProducts] = useState([]);

    const handleUpdatedInfoModalClose = () => {
        setShowUpdatedInfoModal(false);
        generateSectorProducts();
        setShowWholeModal(true);
    };

    const handleWholeModalClose = () => {
        setShowWholeModal(false);
    };

    // Ensure users and users.traders are defined
    const filteredUsers = traders
        .filter(
            (user) =>
                user.traders &&
                user.traders.some((trader) => trader.location === category)
        )
        .map((user) => {
            // Filter traders based on location and user ID
            const filteredTraders = user.traders.filter(
                (trader) =>
                    trader.location === category && user.user_id === trader.traderOwnerId
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
        handleSectorClickLogic(
            category,
            setClickedSector,
            setShowModal,
            setCurrentUser,
            setCurrentUserData,
            setCoinsDecrease,
            traders
        );
    };

    const handleAddTrader = () => {
        handleAddTraderLogic(
            clickedSector,
            maxTraders,
            setShowModal,
            setShowMaxTradersModal,
            setShowNotEnoughMoneyModal,
            setTraders,
            setCurrentUserData,
            setShowUpdatedInfoModal,
            currentUser,
            traders,
            setCurrentUser
        );
    };

    useEffect(() => {
        //console.log('Updated traders state:', traders);
    }, []);

    const generateSectorProducts = () => {
        // Ensure productsData has the expected structure
        if (!productsData || !Array.isArray(productsData.sectors)) {
            console.error('Invalid products data:', productsData);
            return;
        }
        // Log the category value
        console.log('Category:', category);

        // Convert category to lowercase
        const lowercaseCategory = category.toLowerCase();

        // Log the lowercase category value
        console.log('Lowercase Category:', lowercaseCategory);

        // // Find the product data for the current sector
        // const sectorData = productsData.sectors.find(
        //     (sector) => sector.sector === lowercaseCategory
        // );

        const IllegalProducts = productsData.sectors
            .find(sector => sector.sector === 'illegal')
            .products.filter(product => product.quantity_card > 0);

        console.log(IllegalProducts);
        console.log('otherUsers:', otherUsers);
        console.log('currentUserData:', currentUserData);
        // Combine otherUsers and currentUserData into a single array
        const allUsers = otherUsers.concat(currentUserData);

        // Function to count traders in each location for all users
        const countTradersByLocation = (users) => {
            const traderCounts = {};
            users.forEach((user) => {
                if (user.traders) {
                    user.traders.forEach((trader) => {
                        const location = trader.location;
                        if (!traderCounts[location]) {
                            traderCounts[location] = 1;
                        } else {
                            traderCounts[location]++;
                        }
                    });
                }
            });
            return traderCounts;
        };

        // Count traders for all users
        const allUsersTraderCounts = countTradersByLocation(allUsers);
        console.log('All Users Trader Counts:', allUsersTraderCounts);

        // Initialize activeProducts array
        const activeProducts = [];
        // Iterate over each location in allUsersTraderCounts
        for (const location in allUsersTraderCounts) {
            if (allUsersTraderCounts.hasOwnProperty(location)) {
                // Find the sector data for the current location
                const sectorData = productsData.sectors.find(sector => sector.sector.toLowerCase() === location.toLowerCase());

                if (sectorData && Array.isArray(sectorData.products)) {
                    // Shuffle products to get random selection
                    const shuffledProducts = sectorData.products.sort(() => Math.random() - 0.5);

                    // Take the first three products (or less if there are fewer)
                    const selectedProducts = shuffledProducts.slice(0, Math.min(3, shuffledProducts.length));

                    // Add the selected products to activeProducts array
                    activeProducts.push({
                        location,
                        products: selectedProducts
                    });
                }
            }
        }

        // Add illegal products to activeProducts if available
        if (IllegalProducts && IllegalProducts.length > 0) {
            activeProducts.push({
                location: 'Illegal',
                products: IllegalProducts
            });
        }


        console.log('Active Products:', activeProducts);
        // Generate sector products list
        const sectorProductsList = activeProducts.map(({ location, products }) => ({
            traderId: location, // Assuming traderId is set to location for simplicity
            traderLocation: location,
            products: products
        }));





        // // Log the sectorData value
        // console.log('productsData:', productsData);
        // console.log('Sector Data:', sectorData);
        // // Log the sectorData value
        // //    console.log('Sector Data:', sectorData);


        // // Ensure sectorData has a valid structure
        // if (!sectorData || !Array.isArray(sectorData.products)) {
        //     console.error('Invalid sector data:', sectorData);
        //     return;
        // }

        // // Generate a list of products for each trader in the sector
        // const tradersInSector = traders.filter(
        //     (user) =>
        //         user.traders &&
        //         user.traders.some((trader) => trader.location === category)
        // );

        // const sectorProductsList = tradersInSector.map((trader) => {
        //     const traderProducts = Array.from({ length: 3 }, () => {
        //         const randomIndex = Math.floor(
        //             Math.random() * sectorData.products.length
        //         );
        //         return sectorData.products[randomIndex];
        //     });

        //     return {
        //         traderId: trader.user_id,
        //         traderLocation: trader.location,
        //         products: traderProducts,
        //     };
        // });

        setSectorProducts(sectorProductsList);
    };



    const sectorClassName = `sector border p-3 mb-3 ${category.toLowerCase()}`;

    return (
        <div className="col" ref={traderContainerRef}>
            <div className={sectorClassName} onClick={handleSectorClick}>
                <div className="row gap-1">
                    {tradersList.length > 0 ? (
                        tradersList
                    ) : (
                        <div className="col">
                            <p>No traders in this sector</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Trader Addition</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to add a trader to {category} sector?
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

            <Modal show={showMaxTradersModal} onHide={() => setShowMaxTradersModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Maximum Traders Reached</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Maximum number of traders ({maxTraders}) reached in this sector. You
                    cannot add another trader.
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="primary"
                        onClick={() => setShowMaxTradersModal(false)}
                    >
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={showNotEnoughMoneyModal}
                onHide={() => setShowNotEnoughMoneyModal(false)}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Not Enough Money</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    You do not have enough money to add a trader. Please acquire more
                    coins before adding a trader.
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="primary"
                        onClick={() => setShowNotEnoughMoneyModal(false)}
                    >
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showUpdatedInfoModal} onHide={handleUpdatedInfoModalClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Trader Added Successfully!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>Your traders have been updated:</div>

                    {currentUserData &&
                        currentUserData.traders &&
                        currentUserData.traders.length > 0 ? (
                        <ul>
                            {currentUserData.traders.map((trader, index) => (
                                <li key={index}>
                                    <p>Trader: {trader.traderName}</p>
                                    <p>Location: {trader.location}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No traders have been updated.</p>
                    )}

                    <div>You get a new Event Card:</div>

                    {currentUserData &&
                        currentUserData.eventCards &&
                        currentUserData.eventCards.length > 0 ? (
                        <ul>
                            {currentUserData.eventCards.map((card, index) => (
                                <li key={index}>{card.title}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No new Event Cards.</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleUpdatedInfoModalClose}>
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={showWholeModal}
                onHide={handleWholeModalClose}
                dialogClassName="modal-dialog-centered wholesale-window"

            >
                <Modal.Header closeButton>
                    <Modal.Title>Wholesale Marketplace</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {sectorProducts.map((sectorProduct) => (
                        <Row key={sectorProduct.traderId}>
                            <Col>
                                <h5>{`Products in ${sectorProduct.traderLocation}`}</h5>
                                <ul>
                                    {sectorProduct.products.map((product, index) => (
                                        <li key={index}>
                                            {product.productName} - ${product.wholesalePrice}
                                        </li>
                                    ))}
                                </ul>
                            </Col>
                        </Row>
                    ))}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleWholeModalClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

        </div>
    );
};

export default PrivozSector;
