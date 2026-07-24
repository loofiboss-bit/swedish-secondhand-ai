import type { HistoryEntry, SaleStatus } from '@core/types';
import { readVersionedDataset, writeVersionedDataset } from './persistenceService';

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<HistoryEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.createdAt === 'string' &&
    typeof entry.fingerprint === 'object' &&
    typeof entry.valuation === 'object' &&
    Array.isArray(entry.templates) &&
    ['pending', 'sold', 'not_sold'].includes(String(entry.saleStatus))
  );
}

export function isHistoryDataset(value: unknown): value is HistoryEntry[] {
  return Array.isArray(value) && value.every(isHistoryEntry);
}

class HistoryService {
  private static instance: HistoryService;

  static getInstance(): HistoryService {
    if (!HistoryService.instance) {
      HistoryService.instance = new HistoryService();
    }
    return HistoryService.instance;
  }

  async list(limit = 50): Promise<HistoryEntry[]> {
    const entries =
      (await readVersionedDataset('history', isHistoryDataset, (legacy) => {
        if (!isHistoryDataset(legacy)) throw new Error('Invalid legacy history dataset.');
        return legacy;
      })) ?? [];
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
    await writeVersionedDataset('history', [next, ...current]);
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
    await writeVersionedDataset('history', next);
    return next;
  }

  async clear(): Promise<void> {
    await writeVersionedDataset('history', []);
  }

  async replace(entries: HistoryEntry[]): Promise<void> {
    if (!isHistoryDataset(entries)) throw new Error('Invalid history dataset.');
    await writeVersionedDataset('history', entries);
  }
}

export const historyService = HistoryService.getInstance();
