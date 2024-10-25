import React from 'react';
import Menu from '../components/Menu'; // Import the Menu component

const Rules = () => {
    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-lg-9">
                    <h2 className="mb-4">Rules</h2>
                    <div className="card">
                        <div className="card-body">
                            <h5 className="card-title">Настольная игра "Привоз" - версия 1</h5>
                            <p className="card-text">
                                <strong>Цель игры:</strong> Заработать как можно больше денег, управляя сетью продавцов на знаменитом рынке.
                            </p>
                            <p className="card-text">
                                <strong>Подготовка:</strong><br />
                                <strong>Игроки:</strong> 2-6<br />
                                <strong>Время игры:</strong> 7, 14, 21 или 28 раундов (1 раунд = 1 день)<br />
                                <strong>Компоненты:</strong>
                            </p>
                            <ul className="list-group list-group-flush">
                                <li className="list-group-item">Игровое поле с 6 легальными зонами</li>
                                <li className="list-group-item">Карты товаров (легальные и нелегальные)</li>
                                <li className="list-group-item">Карты недели</li>
                                <li className="list-group-item">Карты событий</li>
                                <li className="list-group-item">Фигурки продавцов</li>
                                <li className="list-group-item">Монеты</li>
                                <li className="list-group-item">Карты покупателей</li>
                            </ul>
                            <p className="card-text mt-4">
                                <strong>Ход игры:</strong>
                            </p>
                            <ol className="list-group list-group-numbered">
                                <li className="list-group-item">
                                    <strong>Определение положения на карте:</strong> Игроки по очереди выбирают места для своих продавцов в зонах. Стоимость продавцов: 1 бесплатный, 2 - 10 монет, 3 - 20 и т.д.
                                </li>
                                <li className="list-group-item">
                                    <strong>Специальные карты:</strong> Игроки получают Специальные карты каждый раунд и они бывают 2 видов:
                                    <ul>
                                        <li>Позитивные (увеличивают спрос, снижают цены)</li>
                                        <li>Негативные (штрафы, снижение продаж)</li>
                                    </ul>
                                    Неиспользованные карты событий в будущем можно будет отложить за 3 монеты.
                                </li>
                                <li className="list-group-item">
                                    <strong>Получение карт товаров:</strong> На оптовом рынке открываются карты легальных и нелегальных товаров. Количество карт зависит от числа игроков и их продавцов и в каких секторах находятся продавцы.
                                </li>
                                <li className="list-group-item">
                                    <strong>Открытие карты недели:</strong> Определяется зона повышенного спроса.
                                </li>
                                <li className="list-group-item">
                                    <strong>Открытие негативной карты:</strong> Все игроки получают по 1 негативной карте (штрафы, снижение продаж) или она одна разыгрывается на всех.
                                </li>
                                <li className="list-group-item">
                                    <strong>Розыгрыш карт событий:</strong> Игроки разыгрывают карты событий, купленные или отложенные ранее.
                                </li>
                                <li className="list-group-item">
                                    <strong>Продажа:</strong> Продавцы продают товары по номинальной стоимости, увеличенной в зависимости от спроса или действия спец карт. Нелегальная торговля может привести к штрафам, но она очень выгодна.
                                </li>
                                <li className="list-group-item">
                                    <strong>Прокорм:</strong> Игроки платят 1 монету за каждого продавца. Активируются эффекты спецкарт.
                                </li>
                            </ol>
                            <p className="card-text mt-4">
                                <strong>В конце раунда:</strong><br />
                                Продавцы, не выполнившие план продаж, увольняются. Игроки получают прибыль.
                            </p>
                            <p className="card-text mt-4">
                                <strong>Побеждает:</strong> Игрок, заработавший больше всех денег.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3">
                    <Menu />
                </div>
            </div>
        </div>
    );
};

export default Rules;
