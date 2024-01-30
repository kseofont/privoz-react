import React from 'react';
import eventCardsData from '../eventcards.json';
import FortuneCards from '../components/FortuneCards';
import Menu from '../components/Menu'; // Import the Menu component

const EventCard = () => {
    // Separate positive and negative fortune cards
    const positiveFortuneCards = eventCardsData.filter(card => card.fortune === 'positive');
    const negativeFortuneCards = eventCardsData.filter(card => card.fortune === 'negative');

    return (
        <div className="container">
            <div className="row">
                <div className="col-9">

                    <h2>Event Cards</h2>
                    <div className="row positive-row">
                        <FortuneCards cards={positiveFortuneCards} title="Positive Fortune Cards" />
                    </div>
                    <div className="row negative-row">
                        <FortuneCards cards={negativeFortuneCards} title="Negative Fortune Cards" />
                    </div>

                </div>

                <div className="col-3">
                    <Menu />
                </div>
            </div>
        </div>
    );
};

export default EventCard;
