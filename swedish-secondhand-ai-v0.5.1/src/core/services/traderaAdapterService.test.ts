import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettingsMock } = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
}));

vi.mock('@core/services/settingsService', () => ({
  settingsService: {
    getSettings: getSettingsMock,
  },
}));

import { traderaAdapterService } from './traderaAdapterService';

describe('traderaAdapterService', () => {
  beforeEach(() => {
    getSettingsMock.mockResolvedValue({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: 'token-123',
      traderaBaseUrl: 'https://api.tradera.com/v3',
    });
  });

  it('maps comparables from api response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            itemId: '1',
            title: 'IKEA Poang Chair',
            finalPrice: 450,
            soldAt: '2026-02-01T00:00:00.000Z',
            url: 'https://tradera/item/1',
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await traderaAdapterService.getComparables({ title: 'IKEA Poang' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].priceSek).toBe(450);
    expect(result[0].source).toBe('tradera');
    expect(result[0].sourceQuality).toBeGreaterThan(0);
  });

  it('returns empty when tradera api key is missing', async () => {
    getSettingsMock.mockResolvedValueOnce({
      language: 'sv',
      currency: 'SEK',
      geminiApiKey: '',
      traderaApiKey: '',
      traderaBaseUrl: 'https://api.tradera.com/v3',
    });

    const result = await traderaAdapterService.getComparables({ title: 'IKEA Poang' });
    expect(result).toEqual([]);
  });
});
