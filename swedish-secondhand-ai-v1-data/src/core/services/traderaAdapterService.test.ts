import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettingsMock, fetchComparablesMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  fetchComparablesMock: vi.fn(),
}));

vi.mock('@core/services/settingsService', () => ({
  settingsService: { getSettings: getSettingsMock },
}));

import { traderaAdapterService } from './traderaAdapterService';

describe('traderaAdapterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettingsMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      traderaBaseUrl: 'https://api.tradera.com/v3',
      secretStatus: {
        geminiConfigured: false,
        traderaConfigured: true,
        encryptionAvailable: true,
        migrationStatus: 'not-needed',
      },
    });
    window.desktop = {
      platform: 'linux',
      secrets: { getStatus: vi.fn(), update: vi.fn(), delete: vi.fn() },
      ai: { analyzeGemini: vi.fn(), testGeminiConnection: vi.fn() },
      marketplace: { fetchTraderaComparables: fetchComparablesMock },
    };
  });

  it('maps comparable data returned by the protected main-process adapter', async () => {
    fetchComparablesMock.mockResolvedValue({
      configured: true,
      data: {
        items: [
          {
            itemId: '1',
            title: 'IKEA Poang Chair',
            finalPrice: 450,
            soldAt: '2026-02-01T00:00:00.000Z',
            url: 'https://tradera/item/1',
          },
        ],
      },
    });

    const result = await traderaAdapterService.getComparables({ title: 'IKEA Poang' });

    expect(fetchComparablesMock).toHaveBeenCalledWith({
      baseUrl: 'https://api.tradera.com/v3',
      query: 'IKEA Poang',
      category: undefined,
      limit: 20,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ priceSek: 450, source: 'tradera' });
  });

  it('returns empty when the main process reports that Tradera is not configured', async () => {
    fetchComparablesMock.mockResolvedValue({ configured: false, data: null });
    await expect(traderaAdapterService.getComparables({ title: 'IKEA Poang' })).resolves.toEqual(
      [],
    );
  });
});
