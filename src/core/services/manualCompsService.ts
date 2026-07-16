import type { ComparableRecord } from '@core/types';
import { readVersionedDataset, writeVersionedDataset } from './persistenceService';

type ManualComparableInput = Omit<ComparableRecord, 'id' | 'source' | 'sourceQuality'> &
  Partial<Pick<ComparableRecord, 'sourceQuality' | 'location' | 'shippingIncluded'>>;

function isComparableRecord(value: unknown): value is ComparableRecord {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<ComparableRecord>;
  return (
    typeof item.id === 'string' &&
    item.source === 'manual' &&
    typeof item.title === 'string' &&
    typeof item.priceSek === 'number' &&
    Number.isFinite(item.priceSek) &&
    item.priceSek > 0 &&
    item.priceSek <= 10_000_000 &&
    typeof item.soldAt === 'string' &&
    Number.isFinite(Date.parse(item.soldAt)) &&
    ['tradera', 'blocket', 'vinted'].includes(String(item.site)) &&
    (item.priceKind === undefined ||
      ['asking', 'realized', 'unknown'].includes(String(item.priceKind))) &&
    (item.marketState === undefined ||
      ['active', 'sold', 'unknown'].includes(String(item.marketState))) &&
    typeof item.url === 'string' &&
    item.url.length <= 2_048 &&
    (!item.url || /^https?:\/\//i.test(item.url))
  );
}

function normalizeManualComparable(item: ComparableRecord): ComparableRecord {
  return {
    ...item,
    priceKind: item.priceKind ?? 'unknown',
    marketState: item.marketState ?? 'unknown',
    observedAt: item.observedAt ?? item.soldAt,
    hitType: 'manual',
    queryVariantIds: [],
  };
}

export function isManualComparableDataset(value: unknown): value is ComparableRecord[] {
  return Array.isArray(value) && value.every(isComparableRecord);
}

class ManualCompsService {
  private static instance: ManualCompsService;

  static getInstance(): ManualCompsService {
    if (!ManualCompsService.instance) {
      ManualCompsService.instance = new ManualCompsService();
    }
    return ManualCompsService.instance;
  }

  async list(): Promise<ComparableRecord[]> {
    const items =
      (await readVersionedDataset('manual-comparables', isManualComparableDataset, (legacy) => {
        if (!isManualComparableDataset(legacy)) {
          throw new Error('Invalid legacy manual comparable dataset.');
        }
        return legacy;
      })) ?? [];
    return items.map(normalizeManualComparable);
  }

  async add(comp: ManualComparableInput): Promise<ComparableRecord> {
    if (comp.url && !/^https?:\/\//i.test(comp.url)) {
      throw new Error('Manual comparable URL must use HTTP or HTTPS.');
    }
    const list = await this.list();
    const next: ComparableRecord = {
      ...comp,
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: 'manual',
      sourceQuality: comp.sourceQuality ?? 0.55,
      hitType: 'manual',
      queryVariantIds: [],
    };
    await writeVersionedDataset('manual-comparables', [next, ...list]);
    return next;
  }

  async remove(id: string): Promise<ComparableRecord[]> {
    const next = (await this.list()).filter((item) => item.id !== id);
    await writeVersionedDataset('manual-comparables', next);
    return next;
  }

  async replace(items: ComparableRecord[]): Promise<void> {
    if (!isManualComparableDataset(items)) throw new Error('Invalid manual comparable dataset.');
    await writeVersionedDataset('manual-comparables', items.map(normalizeManualComparable));
  }
}

export const manualCompsService = ManualCompsService.getInstance();
