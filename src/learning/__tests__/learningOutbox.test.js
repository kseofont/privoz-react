import { flushLearningOutbox, getLearningOutboxSize, sendLearningRecordReliably } from '../learningOutbox';

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

function record(eventId = 'LE-BUY-2-0-16-0-8') {
  return {
    schemaVersion: 4,
    gameId: 'GAME-20260910-TEST1234',
    eventId,
    selectedAction: { type: 'BUY_PRODUCT', productId: 16 },
  };
}

test('queues a learning decision after a transient network failure', async () => {
  global.fetch.mockRejectedValueOnce(new TypeError('network down'));

  await expect(sendLearningRecordReliably(record())).rejects.toMatchObject({ learningQueued: true });
  expect(getLearningOutboxSize()).toBe(1);
});

test('flushes queued learning records when the endpoint succeeds', async () => {
  global.fetch
    .mockRejectedValueOnce(new TypeError('network down'))
    .mockResolvedValue({ ok: true, status: 201, json: async () => ({ saved: true }) });

  await expect(sendLearningRecordReliably(record())).rejects.toBeTruthy();
  expect(getLearningOutboxSize()).toBe(1);

  const result = await flushLearningOutbox();
  expect(result).toEqual({ sent: 1, remaining: 0 });
  expect(getLearningOutboxSize()).toBe(0);
});

test('does not queue permanent 400 validation failures', async () => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status: 400,
    json: async () => ({ saved: false, error: 'Invalid record' }),
  });

  await expect(sendLearningRecordReliably(record())).rejects.toMatchObject({ status: 400 });
  expect(getLearningOutboxSize()).toBe(0);
});
