import { jest } from '@jest/globals';

const starRepoMock = { star: jest.fn(), unstar: jest.fn(), listForUser: jest.fn() };
const messageRepoMock = { getById: jest.fn() };
const chatServiceMock = { assertMembership: jest.fn() };

jest.unstable_mockModule('../../../src/repositories/star.repository.js', () => starRepoMock);
jest.unstable_mockModule('../../../src/repositories/message.repository.js', () => messageRepoMock);
jest.unstable_mockModule('../../../src/services/chat.service.js', () => chatServiceMock);

const starService = await import('../../../src/services/star.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MSG = 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm';

beforeEach(() => {
  jest.clearAllMocks();
  chatServiceMock.assertMembership.mockResolvedValue({});
});

describe('star.service', () => {
  test('star throws NotFound when message missing', async () => {
    messageRepoMock.getById.mockResolvedValue(null);
    await expect(starService.star(ME, MSG)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('star rejects non-member', async () => {
    messageRepoMock.getById.mockResolvedValue({ id: MSG, chat_id: CHAT });
    chatServiceMock.assertMembership.mockRejectedValueOnce(
      Object.assign(new Error('forbidden'), { statusCode: 403 }),
    );
    await expect(starService.star(ME, MSG)).rejects.toMatchObject({ statusCode: 403 });
  });

  test('star persists when caller is a member', async () => {
    messageRepoMock.getById.mockResolvedValue({ id: MSG, chat_id: CHAT });
    await starService.star(ME, MSG);
    expect(starRepoMock.star).toHaveBeenCalledWith({ userId: ME, messageId: MSG });
  });

  test('unstar always deletes (no auth needed beyond owner)', async () => {
    await starService.unstar(ME, MSG);
    expect(starRepoMock.unstar).toHaveBeenCalledWith({ userId: ME, messageId: MSG });
  });

  test('listStarred returns mapped rows', async () => {
    starRepoMock.listForUser.mockResolvedValue([
      {
        id: MSG, chat_id: CHAT, sender_id: ME, content: 'hi',
        reply_to_message_id: null, edited_at: null, deleted_at: null,
        created_at: new Date(), updated_at: new Date(),
        starred_at: new Date(),
      },
    ]);
    const out = await starService.listStarred(ME, { limit: 10, offset: 0 });
    expect(out).toHaveLength(1);
    expect(out[0].message.id).toBe(MSG);
  });
});
