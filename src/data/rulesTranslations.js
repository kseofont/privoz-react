const rulesTranslations = {
  ru: {
    pageTitle: 'Правила и тестирование',
    testingTitle: 'Как имитировать многопользовательскую игру',
    testingIntro:
      'Сейчас «Привоз» находится в стадии игрового прототипа. Несколько игроков можно тестировать на одном компьютере — каждый игрок открывается в отдельном окне браузера.',

    steps: [
      'Перейди на стартовую страницу и нажми «Создать игру».',
      'Откроется страница создания игры как хост. Укажи имя, выбери цвет и количество игроков.',
      'Запусти игру. После запуска хоста появится кнопка «Добавить виртуального игрока».',
      'Нажимай «Добавить виртуального игрока», чтобы открыть дополнительных тестовых игроков. Каждый игрок откроется в отдельном окне и автоматически подключится к текущему хосту.',
      'Когда нужные игроки подключились, в окне хоста нажми кнопку завершения добавления игроков и начала игры.',
      'За каждого игрока выбери продавца. Действия выполняются по очереди в соответствующих окнах игроков.',
      'Перейди на оптовый рынок и купи товары. После покупки перейди на страницу расстановки продавцов и размести их по секторам.',
      'Затем переходи через меню к следующим этапам: картам событий, «Привозу» и завершению хода. Пока это прототип, часть переходов выполняется вручную через меню.',
      'Повтори действия во всех окнах. Проверяй, одинаково ли у хоста и клиентов отображаются деньги, товары, продавцы, текущий ход, раунд и результаты событий.',
    ],

    feedbackTitle: 'Нашёл проблему или есть предложение?',
    feedbackText:
      'Нажми в меню кнопку «Обратная связь», коротко опиши проблему или пожелание и отправь отчёт. Лучше сделать это сразу после обнаружения проблемы, до следующих действий — тогда диагностический snapshot будет наиболее полезным.',

    currentTitle: 'Настольная игра «Привоз» — текущая версия правил',
    goalLabel: 'Цель игры:',
    goal:
      'Заработать как можно больше денег, управляя сетью продавцов на знаменитом рынке.',
    preparation: 'Подготовка:',
    players: 'Игроки: 2–6',
    duration: 'Время игры: 7, 14, 21 или 28 раундов (1 раунд = 1 день)',
    components: 'Компоненты:',
    componentItems: [
      'Игровое поле с секторами (легальные и нелегальные)',
      'Карты товаров (фрукты, овощи, мясо, рыба и др.)',
      'Карты событий (позитивные и негативные)',
      'Фигурки продавцов (по 3 на каждого игрока)',
      'Монеты',
      'Карты покупателей',
      'Фишки для обозначения выбранных секторов',
    ],
    roundFlow: 'Ход раунда:',
    roundSteps: [
      'Выбор продавца по очереди. У каждого продавца есть своя способность и бонус в любимом секторе. Максимум 3 товара на одного продавца.',
      'Закупка товаров на оптовом рынке. Количество доступных товаров зависит от числа продавцов.',
      'Выбор сектора для каждого продавца по очереди.',
      'Получение случайной карты события. Негативные карты можно использовать против других игроков, позитивные — применять или сохранять за монеты.',
      'Появление глобального события для всех игроков.',
      'Появление покупателей. Их количество зависит от количества продавцов.',
      'Фаза продаж и прокорма.',
    ],

    showOld: 'Показать старые версии правил',
    hideOld: 'Скрыть старые версии правил',
  },

  ua: {
    pageTitle: 'Правила та тестування',
    testingTitle: 'Як імітувати багатокористувацьку гру',
    testingIntro:
      'Зараз «Привоз» перебуває на стадії ігрового прототипу. Кількох гравців можна тестувати на одному комп’ютері — кожен гравець відкривається в окремому вікні браузера.',

    steps: [
      'Перейди на стартову сторінку та натисни «Створити гру».',
      'Відкриється сторінка створення гри як хост. Вкажи ім’я, вибери колір і кількість гравців.',
      'Запусти гру. Після запуску хоста з’явиться кнопка «Додати віртуального гравця».',
      'Натискай «Додати віртуального гравця», щоб відкрити додаткових тестових гравців. Кожен відкриється в окремому вікні та автоматично підключиться до поточного хоста.',
      'Коли потрібні гравці підключилися, у вікні хоста заверши додавання гравців і почни гру.',
      'За кожного гравця вибери продавця. Дії виконуються по черзі у відповідних вікнах.',
      'Перейди на оптовий ринок і купи товари. Після покупки перейди на сторінку розміщення продавців і розстав їх по секторах.',
      'Потім переходь через меню до наступних етапів: карт подій, «Привозу» та завершення ходу. Поки це прототип, частина переходів виконується вручну через меню.',
      'Повтори дії в усіх вікнах. Перевіряй, чи однаково у хоста та клієнтів відображаються гроші, товари, продавці, поточний хід, раунд і результати подій.',
    ],

    feedbackTitle: 'Знайшов проблему або маєш пропозицію?',
    feedbackText:
      'Натисни в меню кнопку «Зворотний зв’язок», коротко опиши проблему або побажання та надішли звіт. Найкраще зробити це одразу після виявлення проблеми, до наступних дій — тоді діагностичний snapshot буде найбільш корисним.',

    currentTitle: 'Настільна гра «Привоз» — поточна версія правил',
    goalLabel: 'Мета гри:',
    goal:
      'Заробити якомога більше грошей, керуючи мережею продавців на знаменитому ринку.',
    preparation: 'Підготовка:',
    players: 'Гравці: 2–6',
    duration: 'Тривалість гри: 7, 14, 21 або 28 раундів (1 раунд = 1 день)',
    components: 'Компоненти:',
    componentItems: [
      'Ігрове поле із секторами (легальні та нелегальні)',
      'Карти товарів (фрукти, овочі, м’ясо, риба тощо)',
      'Карти подій (позитивні та негативні)',
      'Фігурки продавців (по 3 на кожного гравця)',
      'Монети',
      'Карти покупців',
      'Фішки для позначення вибраних секторів',
    ],
    roundFlow: 'Хід раунду:',
    roundSteps: [
      'Вибір продавця по черзі. Кожен продавець має власну здібність і бонус у своєму улюбленому секторі. Максимум 3 товари на одного продавця.',
      'Закупівля товарів на оптовому ринку. Кількість доступних товарів залежить від кількості продавців.',
      'Вибір сектора для кожного продавця по черзі.',
      'Отримання випадкової карти події. Негативні карти можна використовувати проти інших гравців, позитивні — застосовувати або зберігати за монети.',
      'Поява глобальної події для всіх гравців.',
      'Поява покупців. Їхня кількість залежить від кількості продавців.',
      'Фаза продажу та утримання продавців.',
    ],

    showOld: 'Показати старі версії правил',
    hideOld: 'Приховати старі версії правил',
  },

  en: {
    pageTitle: 'Rules and testing',
    testingTitle: 'How to simulate a multiplayer game',
    testingIntro:
      'Privoz is currently a gameplay prototype. You can test several players on one computer — each player opens in a separate browser window.',

    steps: [
      'Go to the start page and click “Create Game”.',
      'The host game creation page will open. Enter a name, choose a color, and select the number of players.',
      'Start the game. Once the host is running, the “Add virtual player” button will appear.',
      'Click “Add virtual player” to open additional test players. Each player opens in a separate window and automatically connects to the current host.',
      'When all required players are connected, use the host window to finish adding players and start the game.',
      'Choose a trader for each player. Perform actions in turn in the corresponding player windows.',
      'Go to the wholesale market and buy products. After buying, open the trader placement page and place the traders in sectors.',
      'Then use the menu to move through the next stages: event cards, Privoz, and ending the turn. Because this is still a prototype, some stage transitions are currently performed manually through the menu.',
      'Repeat the actions in every player window. Check that the host and clients show the same money, products, traders, current turn, round, and event results.',
    ],

    feedbackTitle: 'Found a problem or have a suggestion?',
    feedbackText:
      'Use the “Send feedback” button in the menu, briefly describe the problem or suggestion, and send the report. It is best to do this immediately after noticing the issue, before making more game actions, so the diagnostic snapshot contains the most useful state.',

    currentTitle: 'Privoz board game — current rules',
    goalLabel: 'Goal:',
    goal:
      'Earn as much money as possible by managing a network of traders at the famous market.',
    preparation: 'Setup:',
    players: 'Players: 2–6',
    duration: 'Game length: 7, 14, 21, or 28 rounds (1 round = 1 day)',
    components: 'Components:',
    componentItems: [
      'Game board with legal and illegal sectors',
      'Product cards (fruit, vegetables, meat, fish, etc.)',
      'Positive and negative event cards',
      'Trader figures (up to 3 per player)',
      'Coins',
      'Customer cards',
      'Markers for selected sectors',
    ],
    roundFlow: 'Round flow:',
    roundSteps: [
      'Choose a trader in turn order. Each trader has a special ability and a bonus in a preferred sector. A trader can carry up to 3 products.',
      'Buy products at the wholesale market. The number of available products depends on the number of traders.',
      'Choose a sector for each trader in turn order.',
      'Receive a random event card. Negative cards can be used against other players; positive cards can be used or kept by paying coins.',
      'A global event appears and affects all players.',
      'Customers appear. Their number depends on the number of traders.',
      'Sales and upkeep phase.',
    ],

    showOld: 'Show older rule versions',
    hideOld: 'Hide older rule versions',
  },

  es: {
    pageTitle: 'Reglas y pruebas',
    testingTitle: 'Cómo simular una partida multijugador',
    testingIntro:
      'Actualmente «Privoz» está en fase de prototipo jugable. Puedes probar varios jugadores en un mismo ordenador: cada jugador se abre en una ventana independiente del navegador.',

    steps: [
      'Ve a la página de inicio y pulsa «Crear partida».',
      'Se abrirá la página para crear la partida como anfitrión. Introduce un nombre, elige un color y selecciona el número de jugadores.',
      'Inicia la partida. Cuando el anfitrión esté activo aparecerá el botón «Añadir jugador virtual».',
      'Pulsa «Añadir jugador virtual» para abrir jugadores de prueba adicionales. Cada jugador se abrirá en una ventana independiente y se conectará automáticamente al anfitrión actual.',
      'Cuando todos los jugadores necesarios estén conectados, desde la ventana del anfitrión termina de añadir jugadores e inicia la partida.',
      'Elige un vendedor para cada jugador. Realiza las acciones por turnos en las ventanas correspondientes.',
      'Ve al mercado mayorista y compra productos. Después de comprar, abre la página de colocación de vendedores y distribúyelos por los sectores.',
      'Después continúa desde el menú con las siguientes fases: cartas de eventos, Privoz y final del turno. Como todavía es un prototipo, algunas transiciones entre fases se realizan manualmente desde el menú.',
      'Repite las acciones en todas las ventanas. Comprueba que el anfitrión y los clientes muestran el mismo dinero, productos, vendedores, turno actual, ronda y resultados de eventos.',
    ],

    feedbackTitle: '¿Has encontrado un problema o tienes una sugerencia?',
    feedbackText:
      'Pulsa «Enviar comentarios» en el menú, describe brevemente el problema o la sugerencia y envía el informe. Es mejor hacerlo inmediatamente después de detectar el problema, antes de realizar más acciones, para que el snapshot de diagnóstico conserve el estado más útil.',

    currentTitle: 'Juego de mesa «Privoz» — reglas actuales',
    goalLabel: 'Objetivo:',
    goal:
      'Ganar la mayor cantidad de dinero posible gestionando una red de vendedores en el famoso mercado.',
    preparation: 'Preparación:',
    players: 'Jugadores: 2–6',
    duration: 'Duración: 7, 14, 21 o 28 rondas (1 ronda = 1 día)',
    components: 'Componentes:',
    componentItems: [
      'Tablero con sectores legales e ilegales',
      'Cartas de productos (fruta, verdura, carne, pescado, etc.)',
      'Cartas de eventos positivas y negativas',
      'Figuras de vendedores (hasta 3 por jugador)',
      'Monedas',
      'Cartas de clientes',
      'Marcadores para los sectores seleccionados',
    ],
    roundFlow: 'Desarrollo de la ronda:',
    roundSteps: [
      'Elegir un vendedor por orden de turno. Cada vendedor tiene una habilidad especial y una bonificación en su sector preferido. Un vendedor puede llevar hasta 3 productos.',
      'Comprar productos en el mercado mayorista. La cantidad de productos disponibles depende del número de vendedores.',
      'Elegir un sector para cada vendedor por orden de turno.',
      'Recibir una carta de evento aleatoria. Las cartas negativas pueden utilizarse contra otros jugadores; las positivas pueden utilizarse o conservarse pagando monedas.',
      'Aparece un evento global que afecta a todos los jugadores.',
      'Aparecen los clientes. Su cantidad depende del número de vendedores.',
      'Fase de ventas y mantenimiento.',
    ],

    showOld: 'Mostrar versiones anteriores de las reglas',
    hideOld: 'Ocultar versiones anteriores de las reglas',
  },
};

export default rulesTranslations;
