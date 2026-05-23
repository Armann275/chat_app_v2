import { jest } from '@jest/globals';

const linkPreviewRepoMock = {
  get: jest.fn(),
  upsert: jest.fn(),
};
const realtimeMock = {
  emitToChat: jest.fn(),
  setRealtimeEmitter: jest.fn(),
};
const loggerMock = {
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
};

jest.unstable_mockModule(
  '../../../src/repositories/linkPreview.repository.js',
  () => linkPreviewRepoMock,
);
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);
jest.unstable_mockModule('../../../src/config/logger.js', () => loggerMock);

const linkPreviewService = await import('../../../src/services/linkPreview.service.js');

const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MSG = 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm';

// The service uses queueMicrotask + awaited repo/fetch calls. Wait for all
// queued promise chains to resolve before asserting.
async function flushAsync() {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

const originalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('linkPreview.service.enqueueForMessage', () => {
  test('no URLs in content → no work scheduled', async () => {
    global.fetch = jest.fn();
    await linkPreviewService.enqueueForMessage({
      chatId: CHAT, messageId: MSG, content: 'hello world, no links here',
    });
    await flushAsync();
    expect(linkPreviewRepoMock.get).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(realtimeMock.emitToChat).not.toHaveBeenCalled();
  });

  test('fresh cache hit → emits without refetching', async () => {
    const fetchedAt = new Date();
    linkPreviewRepoMock.get.mockResolvedValue({
      url: 'https://example.com/page',
      title: 'Cached Title',
      description: 'cached',
      image_url: null,
      fetched_at: fetchedAt,
    });
    global.fetch = jest.fn();

    await linkPreviewService.enqueueForMessage({
      chatId: CHAT, messageId: MSG, content: 'see https://example.com/page for details',
    });
    await flushAsync();

    expect(linkPreviewRepoMock.get).toHaveBeenCalledWith('https://example.com/page');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(linkPreviewRepoMock.upsert).not.toHaveBeenCalled();
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'message:preview-attached',
      {
        messageId: MSG,
        preview: {
          url: 'https://example.com/page',
          title: 'Cached Title',
          description: 'cached',
          imageUrl: null,
          fetchedAt,
        },
      },
    );
  });

  test('stale cache → refetches, upserts, emits fresh preview', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    linkPreviewRepoMock.get.mockResolvedValue({
      url: 'https://example.com/x',
      title: 'old',
      description: null,
      image_url: null,
      fetched_at: eightDaysAgo,
    });

    const html = `
      <html><head>
        <title>Fallback Title</title>
        <meta property="og:title" content="New Title" />
        <meta property="og:description" content="New Description" />
        <meta property="og:image" content="https://img/cover.png" />
      </head></html>
    `;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => html,
    });

    const freshAt = new Date();
    linkPreviewRepoMock.upsert.mockResolvedValue({
      url: 'https://example.com/x',
      title: 'New Title',
      description: 'New Description',
      image_url: 'https://img/cover.png',
      fetched_at: freshAt,
    });

    await linkPreviewService.enqueueForMessage({
      chatId: CHAT, messageId: MSG, content: 'check https://example.com/x',
    });
    await flushAsync();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(linkPreviewRepoMock.upsert).toHaveBeenCalledWith({
      url: 'https://example.com/x',
      title: 'New Title',
      description: 'New Description',
      imageUrl: 'https://img/cover.png',
    });
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'message:preview-attached',
      {
        messageId: MSG,
        preview: {
          url: 'https://example.com/x',
          title: 'New Title',
          description: 'New Description',
          imageUrl: 'https://img/cover.png',
          fetchedAt: freshAt,
        },
      },
    );
  });

  test('no cache + fetch succeeds → upserts and emits', async () => {
    linkPreviewRepoMock.get.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><head><title>Hello</title></head></html>',
    });
    const fetchedAt = new Date();
    linkPreviewRepoMock.upsert.mockResolvedValue({
      url: 'https://foo.test/a',
      title: 'Hello',
      description: null,
      image_url: null,
      fetched_at: fetchedAt,
    });

    await linkPreviewService.enqueueForMessage({
      chatId: CHAT, messageId: MSG, content: 'visit https://foo.test/a today',
    });
    await flushAsync();

    expect(linkPreviewRepoMock.upsert).toHaveBeenCalledWith({
      url: 'https://foo.test/a',
      title: 'Hello',
      description: null,
      imageUrl: null,
    });
    expect(realtimeMock.emitToChat).toHaveBeenCalledTimes(1);
  });

  test('no cache + fetch returns non-ok → no upsert, no emit', async () => {
    linkPreviewRepoMock.get.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, text: async () => '' });

    await linkPreviewService.enqueueForMessage({
      chatId: CHAT, messageId: MSG, content: 'broken https://nope.test/p',
    });
    await flushAsync();

    expect(linkPreviewRepoMock.upsert).not.toHaveBeenCalled();
    expect(realtimeMock.emitToChat).not.toHaveBeenCalled();
  });

  test('no cache + fetch throws → caught, no emit, warning logged', async () => {
    linkPreviewRepoMock.get.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    await linkPreviewService.enqueueForMessage({
      chatId: CHAT, messageId: MSG, content: 'https://timeout.test/z',
    });
    await flushAsync();

    expect(linkPreviewRepoMock.upsert).not.toHaveBeenCalled();
    expect(realtimeMock.emitToChat).not.toHaveBeenCalled();
  });

  test('repo error is caught and logged as warn', async () => {
    linkPreviewRepoMock.get.mockRejectedValue(new Error('db unavailable'));
    global.fetch = jest.fn();

    await linkPreviewService.enqueueForMessage({
      chatId: CHAT, messageId: MSG, content: 'https://example.org/b',
    });
    await flushAsync();

    expect(loggerMock.logger.warn).toHaveBeenCalled();
    expect(realtimeMock.emitToChat).not.toHaveBeenCalled();
  });

  test('deduplicates duplicate URLs and strips trailing punctuation', async () => {
    linkPreviewRepoMock.get.mockResolvedValue({
      url: 'https://example.com/page',
      title: 't', description: null, image_url: null, fetched_at: new Date(),
    });

    await linkPreviewService.enqueueForMessage({
      chatId: CHAT, messageId: MSG,
      content: 'see https://example.com/page, and https://example.com/page.',
    });
    await flushAsync();

    expect(linkPreviewRepoMock.get).toHaveBeenCalledTimes(1);
    expect(linkPreviewRepoMock.get).toHaveBeenCalledWith('https://example.com/page');
  });
});

describe('linkPreview.service.getCached', () => {
  test('returns null when not cached', async () => {
    linkPreviewRepoMock.get.mockResolvedValue(undefined);
    expect(await linkPreviewService.getCached('https://x.test')).toBeNull();
  });

  test('maps row to dto', async () => {
    const fetchedAt = new Date('2026-03-01');
    linkPreviewRepoMock.get.mockResolvedValue({
      url: 'https://x.test',
      title: 'T',
      description: 'D',
      image_url: 'https://x.test/i.png',
      fetched_at: fetchedAt,
    });
    expect(await linkPreviewService.getCached('https://x.test')).toEqual({
      url: 'https://x.test',
      title: 'T',
      description: 'D',
      imageUrl: 'https://x.test/i.png',
      fetchedAt,
    });
  });
});
