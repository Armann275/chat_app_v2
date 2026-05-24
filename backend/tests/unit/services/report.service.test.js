import { jest } from '@jest/globals';

const reportRepoMock = {
  create: jest.fn(),
  findRecentForPair: jest.fn(),
};
const userRepoMock = { findById: jest.fn() };
const loggerMock = { warn: jest.fn(), info: jest.fn(), error: jest.fn() };

jest.unstable_mockModule('../../../src/repositories/report.repository.js', () => reportRepoMock);
jest.unstable_mockModule('../../../src/repositories/user.repository.js', () => userRepoMock);
jest.unstable_mockModule('../../../src/config/logger.js', () => ({ logger: loggerMock }));

const service = await import('../../../src/services/report.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('report.service.report', () => {
  test('rejects self-report', async () => {
    await expect(
      service.report(ME, ME, { reason: 'spam' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects invalid reason', async () => {
    await expect(
      service.report(ME, OTHER, { reason: 'made-up' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects unknown user', async () => {
    userRepoMock.findById.mockResolvedValue(null);
    await expect(
      service.report(ME, OTHER, { reason: 'spam' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('rejects duplicate report within rate-limit window', async () => {
    userRepoMock.findById.mockResolvedValue({ id: OTHER });
    reportRepoMock.findRecentForPair.mockResolvedValue({ id: 'r1' });
    await expect(
      service.report(ME, OTHER, { reason: 'spam' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates report with trimmed details', async () => {
    userRepoMock.findById.mockResolvedValue({ id: OTHER });
    reportRepoMock.findRecentForPair.mockResolvedValue(null);
    reportRepoMock.create.mockResolvedValue({
      id: 'r1', reason: 'harassment', created_at: new Date(),
    });

    const dto = await service.report(ME, OTHER, {
      reason: 'harassment',
      details: '   bad stuff  ',
    });
    expect(reportRepoMock.create).toHaveBeenCalledWith({
      reporterId: ME, reportedId: OTHER, reason: 'harassment', details: 'bad stuff',
    });
    expect(dto.id).toBe('r1');
  });
});
