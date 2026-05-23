import { jest } from '@jest/globals';

const chatRepoMock = {
  createChat: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  getChatById: jest.fn(),
  getMembers: jest.fn(),
  getMembership: jest.fn(),
  getUserChats: jest.fn(),
  findDirectChatBetween: jest.fn(),
};

const userRepoMock = {
  findById: jest.fn(),
};

jest.unstable_mockModule('../../../src/repositories/chat.repository.js', () => chatRepoMock);
jest.unstable_mockModule('../../../src/repositories/user.repository.js', () => userRepoMock);

const chatService = await import('../../../src/services/chat.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const THIRD = '33333333-3333-3333-3333-333333333333';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('chat.service.createDirectChat', () => {
  test('rejects creating a chat with yourself', async () => {
    await expect(chatService.createDirectChat(ME, ME)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('throws NotFound when other user does not exist', async () => {
    userRepoMock.findById.mockResolvedValue(null);
    await expect(chatService.createDirectChat(ME, OTHER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('returns existing direct chat (idempotent)', async () => {
    userRepoMock.findById.mockResolvedValue({ id: OTHER });
    const existing = {
      id: 'chat1',
      type: 'direct',
      name: null,
      created_by: ME,
      created_at: new Date(),
    };
    chatRepoMock.findDirectChatBetween.mockResolvedValue(existing);

    const result = await chatService.createDirectChat(ME, OTHER);
    expect(result.id).toBe('chat1');
    expect(chatRepoMock.createChat).not.toHaveBeenCalled();
  });

  test('creates new direct chat with both members when none exists', async () => {
    userRepoMock.findById.mockResolvedValue({ id: OTHER });
    chatRepoMock.findDirectChatBetween.mockResolvedValue(null);
    chatRepoMock.createChat.mockResolvedValue({
      id: 'chat2',
      type: 'direct',
      name: null,
      created_by: ME,
      created_at: new Date(),
    });

    const result = await chatService.createDirectChat(ME, OTHER);
    expect(result.id).toBe('chat2');
    expect(chatRepoMock.addMember).toHaveBeenCalledTimes(2);
    const userIds = chatRepoMock.addMember.mock.calls.map((c) => c[0].userId);
    expect(userIds.sort()).toEqual([ME, OTHER].sort());
  });
});

describe('chat.service.createGroupChat', () => {
  test('rejects empty name', async () => {
    await expect(
      chatService.createGroupChat(ME, { name: '   ', memberIds: [OTHER] }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('makes creator admin and members members; deduplicates creator', async () => {
    chatRepoMock.createChat.mockResolvedValue({
      id: 'gchat',
      type: 'group',
      name: 'My Group',
      created_by: ME,
      created_at: new Date(),
    });

    await chatService.createGroupChat(ME, {
      name: '  My Group  ',
      memberIds: [ME, OTHER, THIRD],
    });

    expect(chatRepoMock.createChat).toHaveBeenCalledWith({
      type: 'group',
      name: 'My Group',
      createdBy: ME,
    });
    expect(chatRepoMock.addMember).toHaveBeenCalledTimes(3);
    const calls = chatRepoMock.addMember.mock.calls.map((c) => c[0]);
    const me = calls.find((c) => c.userId === ME);
    const other = calls.find((c) => c.userId === OTHER);
    expect(me.role).toBe('admin');
    expect(other.role).toBe('member');
  });
});

describe('chat.service.addMembers', () => {
  test('throws NotFound when chat is missing', async () => {
    chatRepoMock.getChatById.mockResolvedValue(null);
    await expect(chatService.addMembers(ME, 'gone', [OTHER])).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('rejects adding to a direct chat', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'c1', type: 'direct' });
    await expect(chatService.addMembers(ME, 'c1', [OTHER])).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('rejects when caller is not a member', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'g1', type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue(null);
    await expect(chatService.addMembers(ME, 'g1', [OTHER])).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('adds requested members and returns roster', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'g1', type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({
      chat_id: 'g1', user_id: ME, role: 'admin',
    });
    chatRepoMock.getMembers.mockResolvedValue([
      makeMemberRow(ME, 'admin'),
      makeMemberRow(OTHER, 'member'),
    ]);

    const members = await chatService.addMembers(ME, 'g1', [OTHER]);
    expect(chatRepoMock.addMember).toHaveBeenCalledWith({
      chatId: 'g1',
      userId: OTHER,
      role: 'member',
    });
    expect(members).toHaveLength(2);
  });
});

describe('chat.service.removeMember', () => {
  test('non-admin cannot remove someone else', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'g1', type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({
      chat_id: 'g1', user_id: ME, role: 'member',
    });

    await expect(chatService.removeMember(ME, 'g1', OTHER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('member can remove themselves (kick == leave for self)', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'g1', type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({
      chat_id: 'g1', user_id: ME, role: 'member',
    });
    chatRepoMock.removeMember.mockResolvedValue(1);

    await chatService.removeMember(ME, 'g1', ME);
    expect(chatRepoMock.removeMember).toHaveBeenCalledWith('g1', ME);
  });

  test('admin can remove others', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'g1', type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({
      chat_id: 'g1', user_id: ME, role: 'admin',
    });
    chatRepoMock.removeMember.mockResolvedValue(1);

    await chatService.removeMember(ME, 'g1', OTHER);
    expect(chatRepoMock.removeMember).toHaveBeenCalledWith('g1', OTHER);
  });

  test('throws NotFound when target was not a member', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'g1', type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({
      chat_id: 'g1', user_id: ME, role: 'admin',
    });
    chatRepoMock.removeMember.mockResolvedValue(0);

    await expect(chatService.removeMember(ME, 'g1', OTHER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('rejects removing from a direct chat', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'd1', type: 'direct' });
    await expect(chatService.removeMember(ME, 'd1', OTHER)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('chat.service.leaveChat', () => {
  test('rejects leaving a direct chat', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'd1', type: 'direct' });
    await expect(chatService.leaveChat(ME, 'd1')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('removes self from group chat', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'g1', type: 'group' });
    chatRepoMock.removeMember.mockResolvedValue(1);
    await chatService.leaveChat(ME, 'g1');
    expect(chatRepoMock.removeMember).toHaveBeenCalledWith('g1', ME);
  });

  test('throws Conflict if not a member', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'g1', type: 'group' });
    chatRepoMock.removeMember.mockResolvedValue(0);
    await expect(chatService.leaveChat(ME, 'g1')).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('chat.service.getChat', () => {
  test('rejects non-members', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: 'g1', type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue(null);
    await expect(chatService.getChat(ME, 'g1')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('returns chat with members for member', async () => {
    chatRepoMock.getChatById.mockResolvedValue({
      id: 'g1', type: 'group', name: 'g', created_by: ME, created_at: new Date(),
    });
    chatRepoMock.getMembership.mockResolvedValue({
      chat_id: 'g1', user_id: ME, role: 'admin',
    });
    chatRepoMock.getMembers.mockResolvedValue([makeMemberRow(ME, 'admin')]);

    const chat = await chatService.getChat(ME, 'g1');
    expect(chat.id).toBe('g1');
    expect(chat.members).toHaveLength(1);
    expect(chat.members[0].user.username).toBe('alice');
  });
});

describe('chat.service.listMyChats', () => {
  test('forwards pagination options and maps rows', async () => {
    chatRepoMock.getUserChats.mockResolvedValue([
      {
        id: 'c1', type: 'group', name: 'g', created_by: ME, created_at: new Date(),
        my_role: 'admin', my_joined_at: new Date(),
      },
    ]);
    const list = await chatService.listMyChats(ME, { limit: 25, offset: 50 });
    expect(chatRepoMock.getUserChats).toHaveBeenCalledWith(ME, {
      limit: 25, offset: 50,
    });
    expect(list[0].myRole).toBe('admin');
    expect(list[0].otherUser).toBeNull();
  });

  test('exposes the other user on direct chats', async () => {
    chatRepoMock.getUserChats.mockResolvedValue([
      {
        id: 'd1', type: 'direct', name: null, created_by: ME, created_at: new Date(),
        my_role: 'member', my_joined_at: new Date(),
        other_user_id: 'u2', other_username: 'bob', other_email: 'b@x.com',
        other_avatar_url: null, other_bio: null, other_last_seen_at: null,
        other_created_at: new Date(), other_updated_at: new Date(),
      },
    ]);
    const list = await chatService.listMyChats(ME);
    expect(list[0].otherUser).toMatchObject({ id: 'u2', username: 'bob' });
  });
});

function makeMemberRow(userId, role) {
  return {
    chat_id: 'g1',
    user_id: userId,
    role,
    joined_at: new Date(),
    username: 'alice',
    email: 'a@x.com',
    avatar_url: null,
    bio: null,
    last_seen_at: null,
    user_created_at: new Date(),
    user_updated_at: new Date(),
  };
}
