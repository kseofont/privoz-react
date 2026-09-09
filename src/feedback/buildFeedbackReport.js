import { getAppVersionInfo } from './appVersion';

const MAX_DIAGNOSTIC_STRING_LENGTH = 1000;
const MAX_DIAGNOSTIC_ARRAY_ITEMS = 50;
const MAX_DIAGNOSTIC_OBJECT_KEYS = 50;
const MAX_DIAGNOSTIC_DEPTH = 6;
const MAX_EVENT_LOG_LINES_PER_PLAYER = 10;
const MAX_COINS_LOG_ENTRIES = 20;

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  );
}

function localizedLabel(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;

  return firstDefined(value.ru, value.ua, value.en, value.es);
}

function safeDiagnosticValue(value, depth = 0, seen = new WeakSet()) {
  if (value === null) return null;

  const type = typeof value;

  if (type === 'string') {
    return value.length > MAX_DIAGNOSTIC_STRING_LENGTH
      ? `${value.slice(0, MAX_DIAGNOSTIC_STRING_LENGTH)}…`
      : value;
  }

  if (type === 'number' || type === 'boolean') return value;
  if (type === 'bigint') return value.toString();
  if (type === 'undefined' || type === 'function' || type === 'symbol') return undefined;

  if (value instanceof Error) {
    return compactObject({
      name: value.name,
      message: value.message,
    });
  }

  if (depth >= MAX_DIAGNOSTIC_DEPTH) return '[max-depth]';

  if (type === 'object') {
    if (seen.has(value)) return '[circular]';
    seen.add(value);

    if (Array.isArray(value)) {
      const result = value
        .slice(0, MAX_DIAGNOSTIC_ARRAY_ITEMS)
        .map(item => safeDiagnosticValue(item, depth + 1, seen));
      seen.delete(value);
      return result;
    }

    const result = {};
    Object.entries(value)
      .slice(0, MAX_DIAGNOSTIC_OBJECT_KEYS)
      .forEach(([key, item]) => {
        const safeValue = safeDiagnosticValue(item, depth + 1, seen);
        if (safeValue !== undefined) result[key] = safeValue;
      });

    seen.delete(value);
    return result;
  }

  return String(value);
}

function summarizeProduct(product) {
  if (!product || typeof product !== 'object') return null;

  return compactObject({
    productId: product.productId,
    name: localizedLabel(product.productName),
    sector: firstDefined(product.sector, product.product_sector),
    wholesalePrice: product.wholesalePrice,
    sellingPrice: product.sellingPrice,
    legality: product.legality,
    quantityFree: product.quantity_free_card,
    quantityPlayer: product.quantity_player_card,
  });
}

function summarizeTrader(trader) {
  if (!trader || typeof trader !== 'object') return null;

  const goods = Array.isArray(trader.goods)
    ? trader.goods.map(summarizeProduct).filter(Boolean)
    : [];

  return compactObject({
    traderId: trader.traderId,
    name: localizedLabel(trader.name),
    taken: trader.taken,
    traderOwnerId: firstDefined(trader.traderOwnerId, trader.ownerId, trader.user_id),
    cardInGame: trader.card_in_game,
    location: trader.location,
    traderAction: trader.trader_action,
    illegalProtection: firstDefined(trader.Illigal_protection, trader.illegal_protection),
    goods,
  });
}

function summarizeEventCard(card, { includeEffect = true } = {}) {
  if (!card || typeof card !== 'object') return null;

  return compactObject({
    id: card.id,
    title: localizedLabel(card.title),
    fortune: card.fortune,
    quantityActive: card.quantity_active,
    positionInGame: card.position_in_game,
    goalAction: card.goal_action,
    goalItem: card.goal_item,
    effect: includeEffect ? safeDiagnosticValue(card.effect) : undefined,
  });
}

function summarizePlayer(player) {
  if (!player || typeof player !== 'object') return null;

  const roundEffects = Object.fromEntries(
    Object.entries(player)
      .filter(([key]) => key.startsWith('effect_'))
      .map(([key, value]) => [key, safeDiagnosticValue(value)])
  );

  return compactObject({
    userId: player.user_id,
    name: player.name,
    className: player.className,
    color: player.color,
    isHost: player.isHost,
    disconnected: player.disconnected,
    coins: player.coins,
    tradersCount: player.tradersCount,
    sectorsWithTraders: safeDiagnosticValue(player.sectorsWithTraders),
    positionInGame: player.position_in_game,
    configuredPlayerCount: player.playerCount,
    products: Array.isArray(player.products)
      ? player.products.map(summarizeProduct).filter(Boolean)
      : [],
    traders: Array.isArray(player.traders)
      ? player.traders.map(summarizeTrader).filter(Boolean)
      : [],
    eventCards: Array.isArray(player.eventCards)
      ? player.eventCards.map(card => summarizeEventCard(card)).filter(Boolean)
      : [],
    roundEffects: Object.keys(roundEffects).length ? roundEffects : undefined,
  });
}

function getGlobalProducts(gameState) {
  if (Array.isArray(gameState?.products)) return gameState.products;
  if (Array.isArray(gameState?.products?.products)) return gameState.products.products;
  return [];
}

function summarizeEventResultLog(log) {
  if (!log || typeof log !== 'object') return undefined;

  const result = {};

  Object.entries(log).forEach(([userId, lines]) => {
    if (!Array.isArray(lines) || lines.length === 0) return;
    result[userId] = lines.slice(-MAX_EVENT_LOG_LINES_PER_PLAYER).map(line => String(line));
  });

  return Object.keys(result).length ? result : undefined;
}

function summarizeCoinsLog(gameState, myUserId) {
  if (typeof window === 'undefined' || !myUserId) return [];

  const gameId = gameState?.gameId || 'defaultGame';
  const storageKey = `coinsLog:${gameId}:${myUserId}`;

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, MAX_COINS_LOG_ENTRIES).map(entry =>
      compactObject({
        ts: entry?.ts,
        before: entry?.before,
        delta: entry?.delta,
        after: entry?.after,
        reason: entry?.reason,
        source: entry?.source,
        cardId: entry?.cardId,
        sectorId: entry?.sectorId,
        context: safeDiagnosticValue(entry?.context),
      })
    );
  } catch (error) {
    return [];
  }
}

function buildNetworkSummary({ gameState, myUserId, connection, connectionsRef }) {
  const browserWindow = typeof window !== 'undefined' ? window : null;
  const currentPlayer = gameState?.players?.find(player => player.user_id === myUserId) || null;
  const globalConnection = browserWindow?.currentPrivozConnection || null;
  const effectiveConnection = connection || globalConnection || null;
  const peer = browserWindow?.currentPrivozPeer || null;
  const peerId = firstDefined(peer?.id, browserWindow?.peerId, myUserId);

  const role = effectiveConnection
    ? 'client'
    : currentPlayer?.isHost || currentPlayer?.className === 'host'
      ? 'host'
      : 'unknown';

  const hostPlayer = Array.isArray(gameState?.players)
    ? gameState.players.find(player => player.isHost || player.className === 'host')
    : null;

  if (role === 'client') {
    return compactObject({
      role,
      peerId,
      hostPeerId: effectiveConnection?.peer || hostPlayer?.user_id,
      peerOpen: peer?.open,
      peerDestroyed: peer?.destroyed,
      peerDisconnected: peer?.disconnected,
      connectionOpen: effectiveConnection?.open === true,
      connectionCount: effectiveConnection ? 1 : 0,
    });
  }

  const hostConnections = Array.isArray(connectionsRef?.current) ? connectionsRef.current : [];
  const connectionPeers = hostConnections.map(conn =>
    compactObject({
      peerId: conn?.peer,
      open: conn?.open === true,
    })
  );

  return compactObject({
    role,
    peerId,
    hostPeerId: firstDefined(hostPlayer?.user_id, peerId),
    peerOpen: peer?.open,
    peerDestroyed: peer?.destroyed,
    peerDisconnected: peer?.disconnected,
    connectionCount: hostConnections.length,
    openConnectionCount: hostConnections.filter(conn => conn?.open).length,
    connections: connectionPeers,
  });
}

function buildRuntimeSummary() {
  if (typeof window === 'undefined') return {};

  return compactObject({
    userAgent: navigator?.userAgent,
    language: navigator?.language,
    online: navigator?.onLine,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    visibilityState: document?.visibilityState,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    screen: window.screen
      ? {
          width: window.screen.width,
          height: window.screen.height,
        }
      : undefined,
  });
}

function makeFeedbackId() {
  const randomPart =
    typeof window !== 'undefined' && window.crypto?.randomUUID
      ? window.crypto.randomUUID().split('-')[0].toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  const datePart = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `FB-${datePart}-${randomPart}`;
}

function hashString(value) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildFeedbackReport({ gameState, myUserId, connection, connectionsRef }) {
  const players = Array.isArray(gameState?.players)
    ? gameState.players.map(summarizePlayer).filter(Boolean)
    : [];
  const products = getGlobalProducts(gameState).map(summarizeProduct).filter(Boolean);
  const traderList = Array.isArray(gameState?.traderList)
    ? gameState.traderList.map(summarizeTrader).filter(Boolean)
    : [];
  const eventDeck = Array.isArray(gameState?.eventcards)
    ? gameState.eventcards.map(card => summarizeEventCard(card, { includeEffect: false })).filter(Boolean)
    : [];

  const currentTurnPlayer = gameState?.players?.find(
    player => player.user_id === gameState?.currentTurnUserId
  );

  const gameSnapshot = compactObject({
    round: gameState?.round,
    phase: gameState?.phase,
    currentTurnUserId: gameState?.currentTurnUserId,
    waitingForHost: gameState?.waitingForHost,
    roundProcessing: gameState?.__roundProcessing,
    eventCardPhase: safeDiagnosticValue(gameState?.eventCardPhase),
    playerEventChoices: safeDiagnosticValue(gameState?.playerEventChoices),
    eventResultNonce: gameState?.eventResultNonce,
    eventResultLog: summarizeEventResultLog(gameState?.eventResultLog),
    lastAction: safeDiagnosticValue(gameState?.lastAction),
    lastEvent: safeDiagnosticValue(gameState?.lastEvent),
    players,
    traderList,
    products,
    eventDeck,
  });

  const serializedGameSnapshot = JSON.stringify(gameSnapshot);
  const network = buildNetworkSummary({ gameState, myUserId, connection, connectionsRef });

  return {
    schemaVersion: 1,
    feedbackId: makeFeedbackId(),
    capturedAt: new Date().toISOString(),
    comment: '',
    game: compactObject({
      gameId: gameState?.gameId || null,
      myUserId: myUserId || null,
      role: network.role,
      round: gameState?.round,
      phase: gameState?.phase,
      currentTurnUserId: gameState?.currentTurnUserId,
      currentTurnPlayerName: currentTurnPlayer?.name,
      isMyTurn: Boolean(myUserId && gameState?.currentTurnUserId === myUserId),
      playersCount: players.length,
    }),
    page: {
      pathname: typeof window !== 'undefined' ? window.location.pathname : null,
    },
    app: getAppVersionInfo(),
    network,
    runtime: buildRuntimeSummary(),
    diagnostics: {
      stateFingerprint: hashString(serializedGameSnapshot),
      selectedStateSizeBytes: new Blob([serializedGameSnapshot]).size,
      stateKeys: gameState && typeof gameState === 'object' ? Object.keys(gameState).sort() : [],
      coinsLog: summarizeCoinsLog(gameState, myUserId),
    },
    gameState: gameSnapshot,
  };
}
