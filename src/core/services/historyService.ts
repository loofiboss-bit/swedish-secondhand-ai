import { get, set } from 'idb-keyval';
import type { HistoryEntry } from '@core/types';

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

  async add(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): Promise<HistoryEntry> {
    const next: HistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    const current = await this.list();
    await set(KEY, [next, ...current]);
    return next;
  }

  async clear(): Promise<void> {
    await set(KEY, []);
  }
}

export const historyService = HistoryService.getInstance();
