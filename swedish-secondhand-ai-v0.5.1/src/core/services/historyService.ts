import { get, set } from 'idb-keyval';
import type { HistoryEntry, SaleStatus } from '@core/types';

const KEY = 'swedish-secondhand-ai:history';

class HistoryService {
  private static instance: HistoryService;

  static getInstance(): HistoryService {
    if (!HistoryService.instance) {
      HistoryService.instance = new HistoryService();
    }
    return HistoryService.instance;
  }

  async list(limit = 50): Promise<HistoryEntry[]> {
    const entries = (await get<HistoryEntry[]>(KEY)) ?? [];
    return entries.slice(0, limit);
  }

  async add(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'saleStatus'>): Promise<HistoryEntry> {
    const next: HistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      saleStatus: 'pending',
    };
    const current = await this.list(200);
    await set(KEY, [next, ...current]);
    return next;
  }

  async setSaleOutcome(
    id: string,
    saleStatus: SaleStatus,
    soldPriceSek?: number,
    soldAt?: string,
  ): Promise<HistoryEntry[]> {
    const current = await this.list(200);
    const next = current.map((entry) => {
      if (entry.id !== id) return entry;
      return {
        ...entry,
        saleStatus,
        soldPriceSek,
        soldAt: soldAt ?? (saleStatus === 'sold' ? new Date().toISOString() : undefined),
      };
    });
    await set(KEY, next);
    return next;
  }

  async clear(): Promise<void> {
    await set(KEY, []);
  }
}

export const historyService = HistoryService.getInstance();
