import { get, set } from 'idb-keyval';
import type { ComparableRecord } from '@core/types';

const KEY = 'swedish-secondhand-ai:manual-comps';

class ManualCompsService {
  private static instance: ManualCompsService;

  static getInstance(): ManualCompsService {
    if (!ManualCompsService.instance) {
      ManualCompsService.instance = new ManualCompsService();
    }
    return ManualCompsService.instance;
  }

  async list(): Promise<ComparableRecord[]> {
    return (await get<ComparableRecord[]>(KEY)) ?? [];
  }

  async add(comp: Omit<ComparableRecord, 'id' | 'source'>): Promise<ComparableRecord> {
    const list = await this.list();
    const next: ComparableRecord = {
      ...comp,
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: 'manual',
    };
    await set(KEY, [next, ...list]);
    return next;
  }

  async remove(id: string): Promise<ComparableRecord[]> {
    const next = (await this.list()).filter((item) => item.id !== id);
    await set(KEY, next);
    return next;
  }

  async replace(items: ComparableRecord[]): Promise<void> {
    await set(KEY, items);
  }
}

export const manualCompsService = ManualCompsService.getInstance();
