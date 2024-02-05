//import usersData from '../users.json';
import eventCardsData from '../eventcards.json';
// Assuming you're using axios for simplicity
import axios from 'axios';

export const processUsersData = async () => {
    try {
        // Make a GET request to the API endpoint
        const response = await axios.get('https://privoz-api.lavron.dev/fake/users', {
            headers: {
                'Accept': 'application/json'
            }
        });

        // Extract the user data from the API response
        const usersData = response.data;

        // Process and return the data as needed
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
    } catch (error) {
        console.error('Error fetching data from API:', error);
        // Handle errors appropriately (e.g., show a message to the user)
        return [];
    }
};


export const extractCurrentUser = async () => {
    try {
        // Make a GET request to the API endpoint
        const response = await axios.get('https://privoz-api.lavron.dev/fake/users', {
            headers: {
                'Accept': 'application/json'
            }
        });

        // Extract the user data from the API response
        const usersData = response.data;

        // Find the current user in the fetched data
        const currentUser = usersData.find(user => user.current_user === 'current');

        if (currentUser) {
            const { name, className, color, coins, traders } = currentUser;

            return {
                name,
                className,
                color,
                coins,
                tradersCount: traders.length,

                position_in_game: "hand",
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching data from API:', error);
        // Handle errors appropriately (e.g., show a message to the user)
        return null;
    }
};

export const handleSectorClickLogic = (category, setClickedSector, setShowModal, setCurrentUser, setCurrentUserData, setCoinsDecrease, traders) => {
    setClickedSector(category);

    // Check if traders is an array before using find
    const user = Array.isArray(traders)
        ? traders.find(user => user.current_user === 'current')
        : null;

    if (user) {
        setCurrentUser(user);

        setCurrentUserData(prevUserData => {
            const totalTradersCount = user.traders.length + (prevUserData ? prevUserData.tradersCount : 0);
            const coinsDecrease = totalTradersCount <= 1 ? 0 : (totalTradersCount - 1) * 5;
            setCoinsDecrease(coinsDecrease);

            setShowModal(true);

            return {
                ...prevUserData,
            };
        });
    } else {
        // Handle the case where 'user' is not found
        console.error('Current user not found in traders array.');
    }
};



export const handleAddTraderLogic = (clickedSector, maxTraders, setShowModal, setShowMaxTradersModal, setShowNotEnoughMoneyModal, setTraders, setCurrentUserData, setShowUpdatedInfoModal, currentUser, traders, setCurrentUser) => {
    const tradersArray = Array.isArray(traders) ? traders : [];
    const tradersInSelectedSector = tradersArray.filter(
        user => user.traders &&
            user.traders.some(trader => trader.location === clickedSector)
    );

    if (tradersInSelectedSector.length < maxTraders) {
        let user = tradersArray.find(user => user.current_user === 'current');
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
                        // {
                        //     sector: clickedSector,
                        //     productName: 'Onion',
                        //     imageSrc: '../img/onion.svg',
                        //     wholesalePrice: '2',
                        //     retailPrice: '4',
                        //     possibleIncome: '2',
                        //     quantity_card: '16',
                        // },
                        // ... Additional goods data
                    ],
                },
            ],
        };

        setTraders(prevTraders => [...prevTraders, newTraderData]);

        setCurrentUserData(prevUserData => {
            if (!prevUserData) {
                return null;
            }

            const currentUserTraders = currentUser ? currentUser.traders : [];
            const totalTradersCount = currentUserTraders.length + prevUserData.tradersCount;

            const coinsDecrease = totalTradersCount <= 1 ? 0 : (totalTradersCount - 1) * 5;
            const updatedCoins = prevUserData.coins - coinsDecrease;

            if (updatedCoins < 0) {
                setShowNotEnoughMoneyModal(true);
                return prevUserData;
            }

            const updatedTraders = [
                ...prevUserData.traders,
                ...newTraderData.traders, // Append the new trader data
            ];

            return {
                ...prevUserData,
                tradersCount: prevUserData.tradersCount + 1,

                traders: updatedTraders,
                coins: updatedCoins,
            };
        });

        setShowModal(false);

        const availableCards = eventCardsData.filter(card => card.position_in_game === 'deck' && card.quantity_active > 0);
        const randomCardIndex = Math.floor(Math.random() * availableCards.length);
        const randomCard = availableCards[randomCardIndex];

        randomCard.position_in_game = "hand";
        randomCard.quantity_active--;

        if (randomCard.quantity_active === 0) {
            availableCards.splice(randomCardIndex, 1);
        }

        setShowUpdatedInfoModal(true);

        setCurrentUserData(prevUserData => {
            if (!prevUserData) {
                return null;

            }

            // Ensure that eventCards is initialized as an array
            const eventCards = Array.isArray(prevUserData.eventCards) ? prevUserData.eventCards : [];


            const updatedEventCards = [
                ...eventCards,
                randomCard
            ];

            return {
                ...prevUserData,
                // tradersCount: prevUserData.tradersCount + 1,
                // sectorsWithTraders: updatedTraders,
                // coins: updatedCoins,
                eventCards: updatedEventCards,
            };
        });
        // setUpdatedInfo({
        //     traders: newTraderData.traders,
        //     randomCard: randomCard,
        // });
    } else {
        setShowModal(false);
        setShowMaxTradersModal(true);
    }
};

