import React from 'react';
import { useTranslation } from 'react-i18next';
import eventcards from '../data/eventcards.json';
import { DEFAULT_MAX_GAME_ROUNDS } from '../game/gameOutcome';
import { MAX_PLAYER_TRADERS, MAX_TRADER_GOODS } from '../game/placeTraderRules';

const SUPPORTED_LANGS = ['en', 'ua', 'ru', 'es'];

const COPY = {
  en: {
    title: 'Privoz - Version 4 (current rules)',
    badge: 'Current implemented version',
    intro:
      'These rules describe the mechanics that are currently implemented in the digital multiplayer prototype. Archived versions below may contain older or experimental mechanics that are not active now.',
    objectiveTitle: 'Goal and victory',
    objective: 'Earn more coins than the other players by hiring traders, buying goods, placing traders on the market and using Event Cards.',
    winner: 'After the final sale of round {rounds}, the player with the most coins wins. If several players share the highest total, they are co-winners.',
    tieBreakerTitle: 'What is a tie-breaker?',
    tieBreaker:
      'A tie-breaker is an additional rule used to choose one winner when two or more players finish with the same best result. Privoz currently has no tie-breaker: players tied for the highest final coin total are all co-winners.',
    setupTitle: 'Game setup',
    setupPlayers: '2-6 players can participate. Human and bot players use the same game rules.',
    setupCoins: 'Each player starts with 10 coins.',
    setupRounds: 'The current test game lasts {rounds} rounds. Round {rounds} is the final round.',
    tradersTitle: 'Traders',
    tradersLimit: 'A player may own at most {maxTraders} traders.',
    tradersPrice: 'Trader acquisition cost: 1st trader - 0 coins; 2nd - 15 coins; 3rd - 30 coins.',
    tradersPlacement: 'Placing an already acquired trader on the market is always free.',
    tradersFields: 'Trader cards contain their name, description, favorite sector and special characteristics. The rules below describe the mechanics currently enforced by the game engine.',
    wholesaleTitle: 'Wholesale market and goods',
    wholesaleBuy: 'During the wholesale step, a player may buy available goods while they have enough coins and the product is still available. The wholesale price is deducted immediately.',
    wholesaleFlow: 'After a purchase, the player may continue shopping or go to the market to place traders.',
    goodsLimit: 'Each trader may have at most {maxGoods} goods when placed on the market. You cannot assign more than {maxGoods} goods to one trader during placement.',
    legalGoods: 'Legal goods may be placed only in their matching sector.',
    illegalGoods: 'Illegal goods may be placed in any sector.',
    unassignedGoods: 'Goods that are not transferred to a trader remain in the player inventory and are not sold in that round.',
    placementTitle: 'Placing traders on the market',
    placementStep1: 'Choose one of your traders that is still in hand for the current round.',
    placementStep2: 'Choose a market sector with available capacity.',
    placementStep3: 'Choose up to {maxGoods} compatible goods and confirm placement.',
    placementStep4: 'The trader is placed for 0 coins. The selected goods move from the player inventory to that trader.',
    placementStep5: 'Each successful trader placement awards one random Event Card from the active deck.',
    eventTitle: 'Event Cards',
    eventIntro: 'After all players finish their turns, the game enters the personal Event Card phase. According to the current eventcards.json data, the active deck contains {cardTypes} active card types and {activeCopies} active card copies in total. These numbers are dynamic and may change when the deck is rebalanced.',
    positiveTitle: 'Positive cards',
    positiveRule: 'A positive card can be played immediately or kept for a future round. Keeping a positive card costs 5 coins. If the player cannot afford to keep it, the choice is normalized to playing it now.',
    negativeTitle: 'Negative cards',
    negativeRule: 'Negative cards are played against opponents. When required, the player chooses a valid target such as an opponent sector or trader. After resolution the played card is consumed.',
    effectsTitle: 'Effects currently supported',
    effects: [
      'coin fines;',
      'confiscation of goods and returning an affected trader to hand;',
      'temporary trader action/status effects;',
      'reducing selling prices in a targeted sector;',
      'protection from illegal-goods inspection;',
      'increasing selling prices for goods;',
      'adding extra goods to traders.',
    ],
    deckTitle: 'Current Event Card deck',
    positive: 'Positive',
    negative: 'Negative',
    noDescription: 'No description',
    roundTitle: 'Round flow',
    roundSteps: [
      'Trader step - acquire a new trader if desired/possible and the player has fewer than the maximum.',
      'Wholesale step - buy goods.',
      'Market step - place available traders and assign goods to them.',
      'End turn - play passes to the next player.',
      'Personal Event Cards - after all players have finished, every player resolves their cards.',
      'Round settlement - goods currently assigned to placed traders are sold.',
    ],
    settlementTitle: 'Sales and end of round',
    settlement: 'At settlement, each good on a placed trader is sold at its current selling price multiplied by its quantity. The proceeds are added to the owner\'s coins.',
    reset: 'After sales, traders return to hand for the next round, their market locations are cleared and sold goods are removed from the traders.',
    finalRound: 'After settlement of round {rounds}, the game does not create round {nextRound}. It enters Game End and calculates the final ranking.',
    multiplayerTitle: 'Multiplayer and bots',
    multiplayer: 'The host owns the authoritative game state. Player actions - including bot actions - go through the same host validation and reducer flow before the updated state is broadcast to the other clients.',
    bot: 'Bots therefore follow the same purchase, placement, Event Card and end-turn rules as human players. Bot behavior profiles only change how they choose between legal actions.',
    archiveTitle: 'About older rule versions',
    archive: 'Older versions shown below are kept as project history. If an older text mentions mechanics that conflict with Version 4, Version 4 describes the current playable implementation.',
  },
  ru: {
    title: 'Привоз - версия 4 (действующие правила)',
    badge: 'Текущая реализованная версия',
    intro:
      'Эти правила описывают механику, которая прямо сейчас реализована в цифровом мультиплеерном прототипе. Архивные версии ниже могут содержать старые или экспериментальные механики, которые сейчас не действуют.',
    objectiveTitle: 'Цель игры и победа',
    objective: 'Заработать больше монет, чем соперники, нанимая продавцов, закупая товары, размещая продавцов на рынке и используя карты событий.',
    winner: 'После финальной продажи {rounds}-го раунда побеждает игрок с наибольшим количеством монет. Если максимальная сумма одинаковая у нескольких игроков, все они считаются со-победителями.',
    tieBreakerTitle: 'Что такое тай-брейкер?',
    tieBreaker:
      'Тай-брейкер - это дополнительное правило, которое при равном лучшем результате определяет одного победителя. Сейчас в «Привозе» тай-брейкера нет: если несколько игроков заканчивают игру с одинаковым максимальным количеством монет, все они считаются со-победителями.',
    setupTitle: 'Подготовка игры',
    setupPlayers: 'В игре участвуют от 2 до 6 игроков. Люди и боты играют по одним и тем же правилам.',
    setupCoins: 'Каждый игрок начинает с 10 монетами.',
    setupRounds: 'Текущая тестовая партия длится {rounds} раундов. {rounds}-й раунд - последний.',
    tradersTitle: 'Продавцы',
    tradersLimit: 'У игрока может быть не более {maxTraders} продавцов.',
    tradersPrice: 'Стоимость приобретения продавцов: 1-й - 0 монет; 2-й - 15 монет; 3-й - 30 монет.',
    tradersPlacement: 'Размещение уже приобретённого продавца на рынке всегда бесплатно.',
    tradersFields: 'У карт продавцов есть имя, описание, любимый сектор и специальные характеристики. Ниже описаны механики, которые в текущей версии реально контролируются игровым движком.',
    wholesaleTitle: 'Оптовый рынок и товары',
    wholesaleBuy: 'На этапе опта игрок может покупать доступные товары, пока хватает монет и товар остаётся в наличии. Оптовая цена списывается сразу при покупке.',
    wholesaleFlow: 'После покупки можно продолжить закупки или перейти на рынок к размещению продавцов.',
    goodsLimit: 'У каждого продавца при размещении на базаре может быть максимум {maxGoods} товара. Назначить одному продавцу больше {maxGoods} товаров нельзя.',
    legalGoods: 'Легальный товар можно разместить только в соответствующем ему секторе.',
    illegalGoods: 'Нелегальный товар можно разместить в любом секторе.',
    unassignedGoods: 'Товары, которые не были переданы продавцу, остаются в инвентаре игрока и в этом раунде не продаются.',
    placementTitle: 'Размещение продавцов на рынке',
    placementStep1: 'Выберите своего продавца, который в текущем раунде ещё находится в руке.',
    placementStep2: 'Выберите сектор рынка, в котором есть свободное место.',
    placementStep3: 'Выберите до {maxGoods} подходящих товаров и подтвердите размещение.',
    placementStep4: 'Продавец размещается за 0 монет. Выбранные товары переходят из инвентаря игрока к этому продавцу.',
    placementStep5: 'За каждое успешное размещение продавца игрок получает одну случайную карту события из активной колоды.',
    eventTitle: 'Карты событий',
    eventIntro: 'После того как все игроки закончили свои ходы, начинается фаза личных карт событий. По текущим данным eventcards.json действующая колода содержит {cardTypes} активных типов карт и всего {activeCopies} активных экземпляров карт. Эти числа рассчитываются динамически и могут меняться при дальнейшем ребалансе колоды.',
    positiveTitle: 'Позитивные карты',
    positiveRule: 'Позитивную карту можно сыграть сразу или сохранить на будущий раунд. Сохранение позитивной карты стоит 5 монет. Если монет недостаточно, выбор автоматически приводится к использованию карты сейчас.',
    negativeTitle: 'Негативные карты',
    negativeRule: 'Негативные карты играются против соперников. Когда карта требует цель, игрок выбирает допустимый сектор или продавца соперника. После разрешения сыгранная карта сгорает.',
    effectsTitle: 'Поддерживаемые сейчас эффекты',
    effects: [
      'штрафы монетами;',
      'конфискация товаров и возврат затронутого продавца в руку;',
      'временные действия/статусы продавца;',
      'снижение цены продажи товаров в выбранном секторе;',
      'защита от проверки нелегальных товаров;',
      'повышение цены продажи товаров;',
      'добавление дополнительных товаров продавцам.',
    ],
    deckTitle: 'Действующая колода карт событий',
    positive: 'Позитивная',
    negative: 'Негативная',
    noDescription: 'Описание отсутствует',
    roundTitle: 'Последовательность раунда',
    roundSteps: [
      'Продавец - при желании/возможности приобрести нового продавца, если ещё не достигнут лимит.',
      'Опт - купить товары.',
      'Рынок - разместить свободных продавцов и передать им товары.',
      'Конец хода - ход переходит следующему игроку.',
      'Личные карты событий - после завершения ходов всеми игроками каждый разрешает свои карты.',
      'Расчёт раунда - продаются товары, которые находятся у размещённых продавцов.',
    ],
    settlementTitle: 'Продажи и конец раунда',
    settlement: 'При расчёте раунда каждый товар у размещённого продавца продаётся по его текущей цене продажи, умноженной на количество. Выручка добавляется к монетам владельца.',
    reset: 'После продажи продавцы возвращаются в руку на следующий раунд, их сектор очищается, а проданные товары удаляются у продавцов.',
    finalRound: 'После расчёта {rounds}-го раунда игра не создаёт {nextRound}-й раунд, а переходит в состояние окончания игры и рассчитывает итоговый рейтинг.',
    multiplayerTitle: 'Мультиплеер и боты',
    multiplayer: 'Авторитетное состояние игры хранит хост. Действия игроков, включая ботов, проходят через одинаковую проверку правил и reducer на хосте, после чего новое состояние рассылается клиентам.',
    bot: 'Поэтому боты подчиняются тем же правилам покупки, размещения, карт событий и конца хода, что и люди. Профиль бота влияет только на выбор среди допустимых действий.',
    archiveTitle: 'О старых версиях правил',
    archive: 'Старые версии ниже сохранены как история проекта. Если старый текст противоречит версии 4, именно версия 4 описывает текущую играбельную реализацию.',
  },
  ua: {
    title: 'Привоз - версія 4 (чинні правила)',
    badge: 'Поточна реалізована версія',
    intro:
      'Ці правила описують механіку, яка зараз реалізована в цифровому мультиплеєрному прототипі. Архівні версії нижче можуть містити старі або експериментальні механіки, які зараз не діють.',
    objectiveTitle: 'Мета гри та перемога',
    objective: 'Заробити більше монет, ніж суперники, наймаючи продавців, купуючи товари, розміщуючи продавців на ринку та використовуючи карти подій.',
    winner: 'Після фінального продажу {rounds}-го раунду перемагає гравець з найбільшою кількістю монет. Якщо максимальна сума однакова у кількох гравців, усі вони вважаються співпереможцями.',
    tieBreakerTitle: 'Що таке тай-брейкер?',
    tieBreaker:
      'Тай-брейкер - це додаткове правило, яке за однакового найкращого результату визначає одного переможця. Зараз у «Привозі» тай-брейкера немає: якщо кілька гравців завершують гру з однаковою максимальною кількістю монет, усі вони вважаються співпереможцями.',
    setupTitle: 'Підготовка гри',
    setupPlayers: 'У грі беруть участь від 2 до 6 гравців. Люди й боти грають за однаковими правилами.',
    setupCoins: 'Кожен гравець починає з 10 монетами.',
    setupRounds: 'Поточна тестова партія триває {rounds} раундів. {rounds}-й раунд - останній.',
    tradersTitle: 'Продавці',
    tradersLimit: 'Гравець може мати не більше {maxTraders} продавців.',
    tradersPrice: 'Вартість придбання продавців: 1-й - 0 монет; 2-й - 15 монет; 3-й - 30 монет.',
    tradersPlacement: 'Розміщення вже придбаного продавця на ринку завжди безкоштовне.',
    tradersFields: 'Карти продавців мають ім’я, опис, улюблений сектор і спеціальні характеристики. Нижче описані механіки, які в поточній версії фактично контролює ігровий рушій.',
    wholesaleTitle: 'Оптовий ринок і товари',
    wholesaleBuy: 'На етапі опту гравець може купувати доступні товари, доки вистачає монет і товар є в наявності. Оптова ціна списується одразу під час покупки.',
    wholesaleFlow: 'Після покупки можна продовжити закупівлі або перейти на ринок до розміщення продавців.',
    goodsLimit: 'У кожного продавця під час розміщення на базарі може бути максимум {maxGoods} товари. Призначити одному продавцю більше {maxGoods} товарів не можна.',
    legalGoods: 'Легальний товар можна розмістити лише у відповідному йому секторі.',
    illegalGoods: 'Нелегальний товар можна розмістити в будь-якому секторі.',
    unassignedGoods: 'Товари, які не були передані продавцю, залишаються в інвентарі гравця і в цьому раунді не продаються.',
    placementTitle: 'Розміщення продавців на ринку',
    placementStep1: 'Оберіть свого продавця, який у поточному раунді ще перебуває в руці.',
    placementStep2: 'Оберіть сектор ринку, у якому є вільне місце.',
    placementStep3: 'Оберіть до {maxGoods} відповідних товарів і підтвердьте розміщення.',
    placementStep4: 'Продавець розміщується за 0 монет. Обрані товари переходять з інвентарю гравця до цього продавця.',
    placementStep5: 'За кожне успішне розміщення продавця гравець отримує одну випадкову карту події з активної колоди.',
    eventTitle: 'Карти подій',
    eventIntro: 'Після того як усі гравці завершили свої ходи, починається фаза особистих карт подій. За поточними даними eventcards.json чинна колода містить {cardTypes} активних типів карт і загалом {activeCopies} активних екземплярів карт. Ці числа обчислюються динамічно й можуть змінюватися під час подальшого балансування колоди.',
    positiveTitle: 'Позитивні карти',
    positiveRule: 'Позитивну карту можна зіграти одразу або зберегти на майбутній раунд. Збереження позитивної карти коштує 5 монет. Якщо монет недостатньо, вибір автоматично нормалізується до використання карти зараз.',
    negativeTitle: 'Негативні карти',
    negativeRule: 'Негативні карти граються проти суперників. Коли карта потребує цілі, гравець обирає допустимий сектор або продавця суперника. Після розіграшу зіграна карта витрачається.',
    effectsTitle: 'Ефекти, які зараз підтримуються',
    effects: [
      'штрафи монетами;',
      'конфіскація товарів і повернення зачепленого продавця в руку;',
      'тимчасові дії/статуси продавця;',
      'зниження ціни продажу товарів у вибраному секторі;',
      'захист від перевірки нелегальних товарів;',
      'підвищення ціни продажу товарів;',
      'додавання додаткових товарів продавцям.',
    ],
    deckTitle: 'Чинна колода карт подій',
    positive: 'Позитивна',
    negative: 'Негативна',
    noDescription: 'Опис відсутній',
    roundTitle: 'Послідовність раунду',
    roundSteps: [
      'Продавець - за бажанням/можливістю придбати нового продавця, якщо ліміт ще не досягнуто.',
      'Опт - купити товари.',
      'Ринок - розмістити вільних продавців і передати їм товари.',
      'Кінець ходу - хід переходить до наступного гравця.',
      'Особисті карти подій - після завершення ходів усіма гравцями кожен розігрує свої карти.',
      'Розрахунок раунду - продаються товари, які знаходяться у розміщених продавців.',
    ],
    settlementTitle: 'Продажі та кінець раунду',
    settlement: 'Під час розрахунку раунду кожен товар у розміщеного продавця продається за його поточною ціною продажу, помноженою на кількість. Виручка додається до монет власника.',
    reset: 'Після продажу продавці повертаються в руку на наступний раунд, їхній сектор очищується, а продані товари видаляються у продавців.',
    finalRound: 'Після розрахунку {rounds}-го раунду гра не створює {nextRound}-й раунд, а переходить до завершення гри та обчислює підсумковий рейтинг.',
    multiplayerTitle: 'Мультиплеєр і боти',
    multiplayer: 'Авторитетний стан гри зберігає хост. Дії гравців, включно з ботами, проходять однакову перевірку правил і reducer на хості, після чого новий стан розсилається клієнтам.',
    bot: 'Тому боти підкоряються тим самим правилам покупки, розміщення, карт подій і завершення ходу, що й люди. Профіль бота впливає лише на вибір серед дозволених дій.',
    archiveTitle: 'Про старі версії правил',
    archive: 'Старі версії нижче збережені як історія проєкту. Якщо старий текст суперечить версії 4, саме версія 4 описує поточну іграбельну реалізацію.',
  },
  es: {
    title: 'Privoz - versión 4 (reglas actuales)',
    badge: 'Versión implementada actualmente',
    intro:
      'Estas reglas describen las mecánicas que están implementadas ahora mismo en el prototipo multijugador digital. Las versiones archivadas que aparecen más abajo pueden contener mecánicas antiguas o experimentales que ya no están activas.',
    objectiveTitle: 'Objetivo y victoria',
    objective: 'Ganar más monedas que los rivales contratando vendedores, comprando productos, colocando vendedores en el mercado y usando cartas de evento.',
    winner: 'Después de la venta final de la ronda {rounds}, gana el jugador con más monedas. Si varios jugadores comparten la cantidad máxima, todos son co-ganadores.',
    tieBreakerTitle: '¿Qué es un desempate (tie-breaker)?',
    tieBreaker:
      'Un tie-breaker o regla de desempate es una regla adicional que elige a un único ganador cuando dos o más jugadores terminan con el mismo mejor resultado. Actualmente Privoz no tiene desempate: todos los jugadores empatados con la mayor cantidad final de monedas son co-ganadores.',
    setupTitle: 'Preparación de la partida',
    setupPlayers: 'Pueden participar de 2 a 6 jugadores. Los jugadores humanos y los bots utilizan las mismas reglas.',
    setupCoins: 'Cada jugador comienza con 10 monedas.',
    setupRounds: 'La partida de prueba actual dura {rounds} rondas. La ronda {rounds} es la última.',
    tradersTitle: 'Vendedores',
    tradersLimit: 'Un jugador puede tener como máximo {maxTraders} vendedores.',
    tradersPrice: 'Coste de adquirir vendedores: 1.º - 0 monedas; 2.º - 15 monedas; 3.º - 30 monedas.',
    tradersPlacement: 'Colocar en el mercado un vendedor ya adquirido siempre es gratis.',
    tradersFields: 'Las cartas de vendedor contienen nombre, descripción, sector favorito y características especiales. Las reglas siguientes describen las mecánicas que el motor aplica actualmente.',
    wholesaleTitle: 'Mercado mayorista y productos',
    wholesaleBuy: 'Durante la fase mayorista, el jugador puede comprar productos disponibles mientras tenga suficientes monedas y quede stock. El precio mayorista se descuenta inmediatamente.',
    wholesaleFlow: 'Después de una compra se puede seguir comprando o pasar al mercado para colocar vendedores.',
    goodsLimit: 'Cada vendedor puede tener como máximo {maxGoods} productos al colocarse en el mercado. No se pueden asignar más de {maxGoods} productos a un mismo vendedor durante la colocación.',
    legalGoods: 'Los productos legales solo pueden colocarse en su sector correspondiente.',
    illegalGoods: 'Los productos ilegales pueden colocarse en cualquier sector.',
    unassignedGoods: 'Los productos que no se entregan a un vendedor permanecen en el inventario del jugador y no se venden en esa ronda.',
    placementTitle: 'Colocación de vendedores en el mercado',
    placementStep1: 'Elige uno de tus vendedores que todavía esté en la mano durante la ronda actual.',
    placementStep2: 'Elige un sector del mercado con capacidad disponible.',
    placementStep3: 'Elige hasta {maxGoods} productos compatibles y confirma la colocación.',
    placementStep4: 'El vendedor se coloca por 0 monedas. Los productos seleccionados pasan del inventario del jugador a ese vendedor.',
    placementStep5: 'Cada colocación correcta de un vendedor otorga una carta de evento aleatoria de la baraja activa.',
    eventTitle: 'Cartas de evento',
    eventIntro: 'Cuando todos los jugadores han terminado sus turnos comienza la fase de cartas de evento personales. Según los datos actuales de eventcards.json, la baraja activa contiene {cardTypes} tipos de cartas activos y {activeCopies} copias activas en total. Estas cifras se calculan dinámicamente y pueden cambiar cuando se vuelva a equilibrar la baraja.',
    positiveTitle: 'Cartas positivas',
    positiveRule: 'Una carta positiva puede jugarse inmediatamente o guardarse para una ronda futura. Guardarla cuesta 5 monedas. Si el jugador no puede pagar, la elección se normaliza a jugarla ahora.',
    negativeTitle: 'Cartas negativas',
    negativeRule: 'Las cartas negativas se juegan contra los rivales. Cuando la carta necesita un objetivo, el jugador elige un sector o vendedor rival válido. Después de resolverse, la carta jugada se consume.',
    effectsTitle: 'Efectos admitidos actualmente',
    effects: [
      'multas en monedas;',
      'confiscación de productos y devolución del vendedor afectado a la mano;',
      'acciones/estados temporales del vendedor;',
      'reducción del precio de venta en un sector objetivo;',
      'protección frente a inspecciones de productos ilegales;',
      'aumento del precio de venta de productos;',
      'adición de productos extra a los vendedores.',
    ],
    deckTitle: 'Baraja actual de cartas de evento',
    positive: 'Positiva',
    negative: 'Negativa',
    noDescription: 'Sin descripción',
    roundTitle: 'Secuencia de una ronda',
    roundSteps: [
      'Vendedor - adquirir un nuevo vendedor si se desea/es posible y aún no se alcanzó el límite.',
      'Mayorista - comprar productos.',
      'Mercado - colocar vendedores disponibles y asignarles productos.',
      'Fin del turno - el turno pasa al siguiente jugador.',
      'Cartas de evento personales - cuando todos han terminado, cada jugador resuelve sus cartas.',
      'Liquidación de la ronda - se venden los productos asignados a vendedores colocados.',
    ],
    settlementTitle: 'Ventas y final de ronda',
    settlement: 'Durante la liquidación, cada producto de un vendedor colocado se vende por su precio de venta actual multiplicado por la cantidad. Los ingresos se añaden a las monedas del propietario.',
    reset: 'Después de vender, los vendedores vuelven a la mano para la siguiente ronda, se limpia su ubicación en el mercado y los productos vendidos se eliminan del vendedor.',
    finalRound: 'Después de liquidar la ronda {rounds}, el juego no crea la ronda {nextRound}. Pasa a Fin de partida y calcula la clasificación final.',
    multiplayerTitle: 'Multijugador y bots',
    multiplayer: 'El host mantiene el estado autoritativo de la partida. Las acciones de los jugadores, incluidas las de los bots, pasan por la misma validación y reducer del host antes de distribuir el nuevo estado a los clientes.',
    bot: 'Por tanto, los bots siguen las mismas reglas de compra, colocación, cartas de evento y fin de turno que los humanos. El perfil del bot solo cambia cómo elige entre acciones válidas.',
    archiveTitle: 'Sobre las versiones antiguas',
    archive: 'Las versiones anteriores que aparecen más abajo se conservan como historial del proyecto. Si un texto antiguo contradice la versión 4, la versión 4 describe la implementación jugable actual.',
  },
};

function normalizeLanguage(language) {
  const short = String(language || 'en').toLowerCase().split('-')[0];
  if (short === 'uk') return 'ua';
  return SUPPORTED_LANGS.includes(short) ? short : 'en';
}

function localize(value, lang) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object' || Array.isArray(value)) return String(value);
  return value[lang] || value.en || value.ru || value.ua || value.es || '';
}

function interpolate(text, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text
  );
}

function RuleSection({ title, children }) {
  return (
    <section className="mb-4">
      <h4 className="h5 mb-2">{title}</h4>
      {children}
    </section>
  );
}

export default function CurrentRulesVersion() {
  const { i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.language);
  const copy = COPY[lang];
  const activeEventCards = eventcards.filter(
    card => Number(card.quantity_active || 0) > 0
  );
  const activeEventCardCopies = activeEventCards.reduce(
    (total, card) => total + Number(card.quantity_active || 0),
    0
  );

  const values = {
    rounds: DEFAULT_MAX_GAME_ROUNDS,
    nextRound: DEFAULT_MAX_GAME_ROUNDS + 1,
    maxTraders: MAX_PLAYER_TRADERS,
    maxGoods: MAX_TRADER_GOODS,
    cardTypes: activeEventCards.length,
    activeCopies: activeEventCardCopies,
  };

  const text = value => interpolate(value, values);

  return (
    <article className="card border-success shadow-sm mb-4 w-100 text-start">
      <div className="card-header bg-light d-flex flex-wrap justify-content-between gap-2 align-items-center">
        <h3 className="h4 mb-0">{copy.title}</h3>
        <span className="badge text-bg-success">{copy.badge}</span>
      </div>

      <div className="card-body">
        <div className="alert alert-success">{copy.intro}</div>

        <RuleSection title={copy.objectiveTitle}>
          <p>{copy.objective}</p>
          <p>{text(copy.winner)}</p>
          <p className="mb-0">
            <strong>{copy.tieBreakerTitle}</strong> {copy.tieBreaker}
          </p>
        </RuleSection>

        <RuleSection title={copy.setupTitle}>
          <ul className="mb-0">
            <li>{copy.setupPlayers}</li>
            <li>{copy.setupCoins}</li>
            <li>{text(copy.setupRounds)}</li>
          </ul>
        </RuleSection>

        <RuleSection title={copy.tradersTitle}>
          <ul className="mb-0">
            <li>{text(copy.tradersLimit)}</li>
            <li>{copy.tradersPrice}</li>
            <li>{copy.tradersPlacement}</li>
            <li>{copy.tradersFields}</li>
          </ul>
        </RuleSection>

        <RuleSection title={copy.wholesaleTitle}>
          <ul className="mb-0">
            <li>{copy.wholesaleBuy}</li>
            <li>{copy.wholesaleFlow}</li>
            <li>{text(copy.goodsLimit)}</li>
            <li>{copy.legalGoods}</li>
            <li>{copy.illegalGoods}</li>
            <li>{copy.unassignedGoods}</li>
          </ul>
        </RuleSection>

        <RuleSection title={copy.placementTitle}>
          <ol className="mb-0">
            <li>{copy.placementStep1}</li>
            <li>{copy.placementStep2}</li>
            <li>{text(copy.placementStep3)}</li>
            <li>{copy.placementStep4}</li>
            <li>{copy.placementStep5}</li>
          </ol>
        </RuleSection>

        <RuleSection title={copy.eventTitle}>
          <p>{text(copy.eventIntro)}</p>
          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-6">
              <div className="border rounded p-3 h-100">
                <strong>{copy.positiveTitle}</strong>
                <p className="mb-0 mt-2">{copy.positiveRule}</p>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="border rounded p-3 h-100">
                <strong>{copy.negativeTitle}</strong>
                <p className="mb-0 mt-2">{copy.negativeRule}</p>
              </div>
            </div>
          </div>

          <h5 className="h6">{copy.effectsTitle}</h5>
          <ul>
            {copy.effects.map(effect => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>

          <h5 className="h6 mt-3">{copy.deckTitle}</h5>
          <div className="row g-2">
            {activeEventCards.map(card => (
              <div className="col-12 col-lg-6" key={card.id}>
                <div className="border rounded p-2 h-100">
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <strong>{localize(card.title, lang) || card.id}</strong>
                    <span
                      className={`badge ${
                        card.fortune === 'positive' ? 'text-bg-success' : 'text-bg-danger'
                      }`}
                    >
                      {card.fortune === 'positive' ? copy.positive : copy.negative}
                    </span>
                  </div>
                  <div className="small text-muted mt-1">
                    {localize(card.description, lang) || copy.noDescription}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </RuleSection>

        <RuleSection title={copy.roundTitle}>
          <ol className="mb-0">
            {copy.roundSteps.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </RuleSection>

        <RuleSection title={copy.settlementTitle}>
          <p>{copy.settlement}</p>
          <p>{copy.reset}</p>
          <p className="mb-0">{text(copy.finalRound)}</p>
        </RuleSection>

        <RuleSection title={copy.multiplayerTitle}>
          <p>{copy.multiplayer}</p>
          <p className="mb-0">{copy.bot}</p>
        </RuleSection>

        <div className="alert alert-secondary mb-0">
          <strong>{copy.archiveTitle}</strong>
          <div className="mt-1">{copy.archive}</div>
        </div>
      </div>
    </article>
  );
}
