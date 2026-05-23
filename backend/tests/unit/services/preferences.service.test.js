import { jest } from '@jest/globals';

const prefsRepoMock = {
  getUserPrefs: jest.fn(),
  upsertUserPrefs: jest.fn(),
  getChatPrefs: jest.fn(),
  upsertChatPrefs: jest.fn(),
};
const chatServiceMock = { assertMembership: jest.fn() };

jest.unstable_mockModule(
  '../../../src/repositories/preferences.repository.js',
  () => prefsRepoMock,
);
jest.unstable_mockModule('../../../src/services/chat.service.js', () => chatServiceMock);

const prefsService = await import('../../../src/services/preferences.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

beforeEach(() => {
  jest.clearAllMocks();
  chatServiceMock.assertMembership.mockResolvedValue({});
});

describe('preferences.service.getUserPrefs', () => {
  test('returns defaults when no row exists', async () => {
    prefsRepoMock.getUserPrefs.mockResolvedValue(undefined);
    const out = await prefsService.getUserPrefs(ME);
    expect(out).toEqual({ darkMode: false, notificationsEnabled: true });
  });

  test('maps row to dto', async () => {
    const updatedAt = new Date('2026-04-01');
    prefsRepoMock.getUserPrefs.mockResolvedValue({
      user_id: ME, dark_mode: true, notifications_enabled: false, updated_at: updatedAt,
    });
    const out = await prefsService.getUserPrefs(ME);
    expect(out).toEqual({ darkMode: true, notificationsEnabled: false, updatedAt });
  });
});

describe('preferences.service.updateUserPrefs', () => {
  test('forwards patch to repo and maps result', async () => {
    const updatedAt = new Date('2026-04-02');
    prefsRepoMock.upsertUserPrefs.mockResolvedValue({
      user_id: ME, dark_mode: true, notifications_enabled: true, updated_at: updatedAt,
    });
    const out = await prefsService.updateUserPrefs(ME, { darkMode: true });
    expect(prefsRepoMock.upsertUserPrefs).toHaveBeenCalledWith(ME, { darkMode: true });
    expect(out).toEqual({ darkMode: true, notificationsEnabled: true, updatedAt });
  });
});

describe('preferences.service.getChatPrefs', () => {
  test('requires membership', async () => {
    chatServiceMock.assertMembership.mockRejectedValue(
      Object.assign(new Error('forbidden'), { statusCode: 403 }),
    );
    await expect(prefsService.getChatPrefs(ME, CHAT)).rejects.toMatchObject({ statusCode: 403 });
    expect(prefsRepoMock.getChatPrefs).not.toHaveBeenCalled();
  });

  test('returns defaults when no row exists', async () => {
    prefsRepoMock.getChatPrefs.mockResolvedValue(undefined);
    const out = await prefsService.getChatPrefs(ME, CHAT);
    expect(out).toEqual({ mutedUntil: null, archived: false, notifications: 'default' });
  });

  test('maps existing row to dto', async () => {
    const mutedUntil = new Date('2026-05-01');
    const updatedAt = new Date('2026-04-10');
    prefsRepoMock.getChatPrefs.mockResolvedValue({
      chat_id: CHAT, user_id: ME, muted_until: mutedUntil,
      archived: true, notifications: 'mentions', updated_at: updatedAt,
    });
    const out = await prefsService.getChatPrefs(ME, CHAT);
    expect(out).toEqual({
      chatId: CHAT, mutedUntil, archived: true, notifications: 'mentions', updatedAt,
    });
  });
});

describe('preferences.service.updateChatPrefs', () => {
  test('requires membership before writing', async () => {
    chatServiceMock.assertMembership.mockRejectedValue(
      Object.assign(new Error('forbidden'), { statusCode: 403 }),
    );
    await expect(
      prefsService.updateChatPrefs(ME, CHAT, { archived: true }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(prefsRepoMock.upsertChatPrefs).not.toHaveBeenCalled();
  });

  test('forwards patch and maps result', async () => {
    const updatedAt = new Date('2026-04-11');
    prefsRepoMock.upsertChatPrefs.mockResolvedValue({
      chat_id: CHAT, user_id: ME, muted_until: null,
      archived: true, notifications: 'default', updated_at: updatedAt,
    });
    const out = await prefsService.updateChatPrefs(ME, CHAT, { archived: true });
    expect(prefsRepoMock.upsertChatPrefs).toHaveBeenCalledWith(CHAT, ME, { archived: true });
    expect(out).toEqual({
      chatId: CHAT, mutedUntil: null, archived: true, notifications: 'default', updatedAt,
    });
  });
});
