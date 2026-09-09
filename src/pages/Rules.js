// import React from 'react';
// import Menu from '../components/Menu'; // Import the Menu component

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Menu from '../components/Menu';
import rulesTranslations from '../data/rulesTranslations';

const Rules = () => {
  const [showOldRules, setShowOldRules] = useState(false);
  const { t, i18n } = useTranslation();

  const lang = ['ru', 'ua', 'es', 'en'].includes(i18n.language) ? i18n.language : 'en';

  const r = rulesTranslations[lang];

  return (
    <div className="container-fluid">
      <div className="row flex-column flex-sm-row">
        <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column justify-content-center align-items-center text-center">
          <h2 className="mb-4">{r.pageTitle}</h2>

          <div className="card mb-4 text-start w-100">
            <div className="card-body">
              <h5 className="card-title">{r.testingTitle}</h5>

              <p className="card-text">{r.testingIntro}</p>

              <div className="d-flex flex-wrap gap-2 mb-4">
                <Link to="/" className="btn btn-outline-secondary">
                  {t('menu_start_page')}
                </Link>

                <Link to="/create" className="btn btn-primary">
                  {t('create_game')}
                </Link>

                <Link to="/JoinGamePage" className="btn btn-success">
                  {t('join_game')}
                </Link>
              </div>

              <ol className="mb-3">
                {r.steps.map((step, index) => (
                  <li key={index} className="mb-3">
                    {step}
                  </li>
                ))}
              </ol>

              <div className="alert alert-info mb-0">
                <strong>{r.feedbackTitle}</strong> {r.feedbackText}
              </div>
            </div>
          </div>

          {/* Версия 3 */}
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">{r.currentTitle}</h5>

              <p className="card-text">
                <strong>{r.goalLabel}</strong> {r.goal}
              </p>

              <p className="card-text">
                <strong>{r.preparation}</strong>
                <br />
                {r.players}
                <br />
                {r.duration}
              </p>

              <p className="card-text">
                <strong>{r.components}</strong>
              </p>

              <ul className="list-group list-group-flush">
                {r.componentItems.map((item, index) => (
                  <li key={index} className="list-group-item">
                    {item}
                  </li>
                ))}
              </ul>

              <p className="card-text">
                <strong>{r.roundFlow}</strong>
              </p>

              <ol>
                {r.roundSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
          <div className="my-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowOldRules(prev => !prev)}
              aria-expanded={showOldRules}
            >
              {showOldRules ? r.hideOld : r.showOld}
            </button>
          </div>

          {showOldRules && (
            <div className="w-100">
              {/* Версия 1 */}
              <div className="card mb-4">
                <div className="card-body">
                  <h5 className="card-title">Настольная игра "Привоз" - версия 1</h5>
                  <p className="card-text">
                    <strong>Цель игры:</strong> Заработать как можно больше денег, управляя сетью
                    продавцов на знаменитом рынке.
                  </p>
                  <p className="card-text">
                    <strong>Подготовка:</strong>
                    <br />
                    <strong>Игроки:</strong> 2-6
                    <br />
                    <strong>Время игры:</strong> 7, 14, 21 или 28 раундов (1 раунд = 1 день)
                    <br />
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
                      <strong>Определение положения на карте:</strong> Игроки по очереди выбирают
                      места для своих продавцов в зонах. Стоимость продавцов: 1 бесплатный, 2 - 10
                      монет, 3 - 20 и т.д.
                    </li>
                    <li className="list-group-item">
                      <strong>Специальные карты:</strong> Игроки получают Специальные карты каждый
                      раунд и они бывают 2 видов:
                      <ul>
                        <li>Позитивные (увеличивают спрос, снижают цены)</li>
                        <li>Негативные (штрафы, снижение продаж)</li>
                      </ul>
                      Неиспользованные карты событий в будущем можно будет отложить за 3 монеты.
                    </li>
                    <li className="list-group-item">
                      <strong>Получение карт товаров:</strong> На оптовом рынке открываются карты
                      легальных и нелегальных товаров. Количество карт зависит от числа игроков и их
                      продавцов и в каких секторах находятся продавцы.
                    </li>
                    <li className="list-group-item">
                      <strong>Открытие карты недели:</strong> Определяется зона повышенного спроса.
                    </li>
                    <li className="list-group-item">
                      <strong>Открытие негативной карты:</strong> Все игроки получают по 1
                      негативной карте (штрафы, снижение продаж) или она одна разыгрывается на всех.
                    </li>
                    <li className="list-group-item">
                      <strong>Розыгрыш карт событий:</strong> Игроки разыгрывают карты событий,
                      купленные или отложенные ранее.
                    </li>
                    <li className="list-group-item">
                      <strong>Продажа:</strong> Продавцы продают товары по номинальной стоимости,
                      увеличенной в зависимости от спроса или действия спец карт. Нелегальная
                      торговля может привести к штрафам, но она очень выгодна.
                    </li>
                    <li className="list-group-item">
                      <strong>Прокорм:</strong> Игроки платят 1 монету за каждого продавца.
                      Активируются эффекты спецкарт.
                    </li>
                  </ol>
                  <p className="card-text mt-4">
                    <strong>В конце раунда:</strong>
                    <br />
                    Продавцы, не выполнившие план продаж, увольняются. Игроки получают прибыль.
                  </p>
                  <p className="card-text mt-4">
                    <strong>Побеждает:</strong> Игрок, заработавший больше всех денег.
                  </p>
                </div>
              </div>
              {/* Версия 2 */}
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Настольная игра "Привоз" - версия 2</h5>
                  <p className="card-text">
                    <strong>Цель игры:</strong> Заработать как можно больше денег, управляя сетью
                    продавцов на знаменитом рынке.
                  </p>
                  <p className="card-text">
                    <strong>Подготовка:</strong>
                    <br />
                    <strong>Игроки:</strong> 2-6
                    <br />
                    <strong>Время игры:</strong> 7, 14, 21 или 28 раундов (1 раунд = 1 день)
                  </p>
                  <p className="card-text">
                    <strong>Компоненты:</strong>
                  </p>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item">Игровое поле с 6 легальными зонами</li>
                    <li className="list-group-item">Карты товаров (легальные и нелегальные)</li>
                    <li className="list-group-item">Карты событий</li>
                    <li className="list-group-item">Фигурки продавцов</li>
                    <li className="list-group-item">Монеты</li>
                    <li className="list-group-item">
                      Герой (фигурка игрока, у каждого свой любимый отдел)
                    </li>
                    <li className="list-group-item">
                      Покупатель (у каждого покупателя есть набор продуктов в корзинке, например:
                      молоко, лук, помидор, свинина, шляпа; розыгрыш продажи товара по очереди у
                      каждого игрока есть меняющаяся очередность, номер 1 — ...)
                    </li>
                  </ul>
                  <p className="card-text mt-4">
                    <strong>Ход игры:</strong>
                  </p>
                  <ol className="list-group list-group-numbered">
                    <li className="list-group-item">
                      <strong>Получение карт товаров:</strong>
                      <ul>
                        <li>Например: 7 карт на руку (в том числе положительные карты ивентов).</li>
                        <li>Вариант — покупка товара игроком безлимитно.</li>
                        <li>Вариант — без ивентов.</li>
                      </ul>
                    </li>
                    <li className="list-group-item">
                      <strong>Определение положения на карте:</strong>
                      <ul>
                        <li>Игроки по очереди выбирают места для своих продавцов в зонах.</li>
                        <li>
                          Стоимость продавцов: 1 — бесплатно, 2-й — 10 монет, 3-й — 20 монет и т.д.
                        </li>
                      </ul>
                    </li>
                    <li className="list-group-item">
                      <strong>Розыгрыш карт событий и покупателей:</strong>
                      <ul>
                        <li>
                          Ивенты положительные — с руки, отрицательные — из колоды, вместо дней
                          недели.
                        </li>
                        <li>Покупатели разыгрываются по количеству игроков (продавцов).</li>
                        <li>
                          Варианты: 7 карт покупателей; ивенты отдельной фазой; ивенты раздельно
                          положительные и отрицательные.
                        </li>
                      </ul>
                    </li>
                    <li className="list-group-item">
                      <strong>Прокорм:</strong> Игроки платят 1 монету за каждого продавца (аренда
                      лотка).
                    </li>
                    <li className="list-group-item">
                      <strong>В конце раунда:</strong>
                      <ul>
                        <li>Продавцы, не выполнившие план продаж, увольняются.</li>
                        <li>Игроки получают прибыль.</li>
                      </ul>
                    </li>
                  </ol>
                  <p className="card-text mt-4">
                    <strong>Побеждает:</strong> Игрок, заработавший больше всех денег.
                  </p>
                  <p className="card-text">
                    <strong>Вариации:</strong>
                  </p>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item">Дополнение "Контрабанда"</li>
                    <li className="list-group-item">Дополнение "Туристический сезон"</li>
                  </ul>
                  <div className="alert alert-warning mt-4">
                    <strong>Настольная игра "Привоз"</strong> — это динамичная и азартная игра,
                    которая позволит вам испытать себя в роли успешного предпринимателя!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="col-12 col-sm-3 order-1 order-sm-2 border-start">
          <Menu />
        </div>
      </div>
    </div>
  );
};

export default Rules;
