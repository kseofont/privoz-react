function randomToken(length = 12) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    for (let index = 0; index < bytes.length; index += 1) {
      result += alphabet[bytes[index] % alphabet.length];
    }

    return result;
  }

  for (let index = 0; index < length; index += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return result;
}

export function createGameId(now = new Date()) {
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');

  return `GAME-${date}-${randomToken(12)}`;
}
