import { jest } from '@jest/globals';

const repoMock = {
  getByUserId: jest.fn(),
  upsert: jest.fn(),
};

const realtimeMock = {
  emitToUser: jest.fn(),
  emitToChat: jest.fn(),
};

jest.unstable_mockModule(
  '../../../src/repositories/privacySettings.repository.js',
  () => repoMock,
);
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);

const privacyService = await import('../../../src/services/privacy.service.js');

const ME = '11111111-1111-1111-1111-111111111111';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('privacy.service.getMine', () => {
  test('returns defaults when no row exists', async () => {
    repoMock.getByUserId.mockResolvedValue(null);
    const dto = await privacyService.getMine(ME);
    expect(dto).toEqual({
      whoCanMessage: 'everyone',
      lastSeenVisibility: 'everyone',
      profilePhotoVisibility: 'everyone',
      updatedAt: null,
    });
  });

  test('maps existing row', async () => {
    repoMock.getByUserId.mockResolvedValue({
      who_can_message: 'friends',
      last_seen_visibility: 'nobody',
      profile_photo_visibility: 'friends',
      updated_at: '2026-01-01T00:00:00Z',
    });
    const dto = await privacyService.getMine(ME);
    expect(dto.whoCanMessage).toBe('friends');
    expect(dto.lastSeenVisibility).toBe('nobody');
    expect(dto.profilePhotoVisibility).toBe('friends');
  });
});

describe('privacy.service.updateMine', () => {
  test('rejects invalid mode', async () => {
    await expect(
      privacyService.updateMine(ME, { lastSeenVisibility: 'bogus' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects empty payload', async () => {
    await expect(privacyService.updateMine(ME, {})).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('accepts bare string for back-compat', async () => {
    repoMock.upsert.mockResolvedValue({
      who_can_message: 'friends',
      last_seen_visibility: 'everyone',
      profile_photo_visibility: 'everyone',
      updated_at: new Date(),
    });
    const dto = await privacyService.updateMine(ME, 'friends');
    expect(repoMock.upsert).toHaveBeenCalledWith(ME, {
      whoCanMessage: 'friends',
      lastSeenVisibility: undefined,
      profilePhotoVisibility: undefined,
    });
    expect(dto.whoCanMessage).toBe('friends');
  });

  test('updates multiple fields and emits event', async () => {
    repoMock.upsert.mockResolvedValue({
      who_can_message: 'everyone',
      last_seen_visibility: 'friends',
      profile_photo_visibility: 'nobody',
      updated_at: new Date(),
    });
    await privacyService.updateMine(ME, {
      lastSeenVisibility: 'friends',
      profilePhotoVisibility: 'nobody',
    });
    expect(realtimeMock.emitToUser).toHaveBeenCalledWith(
      ME,
      'privacy:updated',
      expect.objectContaining({
        lastSeenVisibility: 'friends',
        profilePhotoVisibility: 'nobody',
      }),
    );
  });
});

describe('privacy.service.applyPrivacy', () => {
  const them = {
    id: 'them',
    username: 'them',
    lastSeenAt: '2026-01-01T00:00:00Z',
    avatarUrl: 'a',
    customPhotoUrl: 'b',
    avatarGlbUrl: 'c',
    displayAvatarUrl: 'b',
  };

  test('returns self unchanged', () => {
    const result = privacyService.applyPrivacy('them', them, {
      lastSeenVisibility: 'nobody',
      profilePhotoVisibility: 'nobody',
    });
    expect(result).toBe(them);
  });

  test('masks last seen when nobody', () => {
    const result = privacyService.applyPrivacy(ME, them, {
      lastSeenVisibility: 'nobody',
      profilePhotoVisibility: 'everyone',
    });
    expect(result.lastSeenAt).toBeNull();
    expect(result.avatarUrl).toBe('a');
  });

  test('masks avatar when friends-only and not a friend', () => {
    const result = privacyService.applyPrivacy(
      ME,
      them,
      { lastSeenVisibility: 'everyone', profilePhotoVisibility: 'friends' },
      { isFriend: false },
    );
    expect(result.avatarUrl).toBeNull();
    expect(result.customPhotoUrl).toBeNull();
    expect(result.displayAvatarUrl).toBeNull();
    expect(result.lastSeenAt).toBe('2026-01-01T00:00:00Z');
  });

  test('passes through when friends-only and is a friend', () => {
    const result = privacyService.applyPrivacy(
      ME,
      them,
      { lastSeenVisibility: 'friends', profilePhotoVisibility: 'friends' },
      { isFriend: true },
    );
    expect(result.avatarUrl).toBe('a');
    expect(result.lastSeenAt).toBe('2026-01-01T00:00:00Z');
  });
});
