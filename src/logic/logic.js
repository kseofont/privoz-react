import usersData from '../users.json';
import eventCardsData from '../eventcards.json';

export const processUsersData = () => {
    return usersData.map(user => ({
        ...user,
        traders: user.traders.map(trader => ({
            ...trader,
            goods: trader.goods.map(good => ({
                ...good,
                imageSrc: `../img/${good.imageSrc}`
            }))
        }))
    }));
};

export const extractCurrentUser = () => {
    const currentUser = usersData.find(user => user.current_user === 'current');

    if (currentUser) {
        const { name, className, color, coins, traders } = currentUser;
        const sectorsWithTraders = traders.map(trader => trader.location);

        return {
            name,
            className,
            color,
            coins,
            tradersCount: traders.length,
            sectorsWithTraders,
            position_in_game: "hand",
        };
    }

    return null;
};

export const handleSectorClickLogic = (category, setClickedSector, setShowModal, setCurrentUser, setCurrentUserData, setCoinsDecrease, traders) => {
    setClickedSector(category);

    const user = traders.find(user => user.current_user === 'current');
    setCurrentUser(user);

    setCurrentUserData(prevUserData => {
        const totalTradersCount = user.traders.length + prevUserData.tradersCount;
        const coinsDecrease = totalTradersCount <= 1 ? 0 : (totalTradersCount - 1) * 5;
        setCoinsDecrease(coinsDecrease);

        setShowModal(true);

        return {
            ...prevUserData,
        };
    });
};

export const handleAddTraderLogic = (clickedSector, maxTraders, setShowModal, setShowMaxTradersModal, setShowNotEnoughMoneyModal, setTraders, setCurrentUserData, setShowUpdatedInfoModal, setUpdatedInfo, currentUser, traders, setCurrentUser) => {
    const tradersInSelectedSector = traders.filter(
        user =>
            user.traders &&
            user.traders.some(trader => trader.location === clickedSector)
    );

    if (tradersInSelectedSector.length < maxTraders) {

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
            // Get the corresponding card data from the imported JSON file
            const card = eventCardsData.find(card => card.id === eventCardsData[sectorIndex].id);

            if (card) {
                const updatedEventCards = [...eventCardsData];
                const selectedCard = updatedEventCards[sectorIndex];

                // Add more information to the selected card
                selectedCard.quantity_active--; // Assuming you still want to decrement this property

                // Add additional properties
                selectedCard.id = card.id;
                selectedCard.title = card.title;
                selectedCard.goal_action = card.goal_action;
                selectedCard.goal_item = card.goal_item;
                selectedCard.effect = [...card.effect];

                updatedEventCards[sectorIndex].quantity_active--;

            }
        }

        setCurrentUser(null);
    } else {
        setShowModal(false); // Close the current modal
        setShowMaxTradersModal(true); // Show the max traders modal
    }
};