import type { SellerCategory, VerifiedProductFacts } from '@core/types';

export interface CategoryFactRequirement {
  key: string;
  label: string;
  level: 'required' | 'recommended';
}

export interface CategoryPhotoRequirement {
  role: 'cover' | 'angle' | 'defect' | 'label_model' | 'accessories';
  label: string;
  level: 'required' | 'recommended';
}

export interface CategoryProfile {
  id: SellerCategory;
  facts: CategoryFactRequirement[];
  photos: CategoryPhotoRequirement[];
}

const COMMON_PHOTOS: CategoryPhotoRequirement[] = [
  { role: 'cover', label: 'Tydlig omslagsbild', level: 'required' },
  { role: 'angle', label: 'Flera vinklar', level: 'recommended' },
  { role: 'defect', label: 'Kända defekter', level: 'recommended' },
];

const PROFILES: Record<SellerCategory, CategoryProfile> = {
  Electronics: {
    id: 'Electronics',
    facts: [
      { key: 'brand', label: 'Varumärke', level: 'required' },
      { key: 'model', label: 'Modell', level: 'required' },
      { key: 'testedStatus', label: 'Teststatus', level: 'required' },
      { key: 'conditionGrade', label: 'Skick', level: 'required' },
      { key: 'attributes.storage', label: 'Lagring eller kapacitet', level: 'recommended' },
      { key: 'includedAccessories', label: 'Tillbehör', level: 'recommended' },
    ],
    photos: [
      ...COMMON_PHOTOS,
      { role: 'label_model', label: 'Modell- eller serienummer', level: 'required' },
      { role: 'accessories', label: 'Tillbehör', level: 'recommended' },
    ],
  },
  Fashion: {
    id: 'Fashion',
    facts: [
      { key: 'brand', label: 'Varumärke', level: 'required' },
      { key: 'attributes.size', label: 'Storlek', level: 'required' },
      { key: 'conditionGrade', label: 'Skick', level: 'required' },
      { key: 'attributes.material', label: 'Material', level: 'recommended' },
      { key: 'attributes.measurements', label: 'Mått', level: 'recommended' },
    ],
    photos: [
      ...COMMON_PHOTOS,
      { role: 'label_model', label: 'Storleks- och materialetikett', level: 'required' },
    ],
  },
  Furniture: {
    id: 'Furniture',
    facts: [
      { key: 'conditionGrade', label: 'Skick', level: 'required' },
      { key: 'attributes.dimensions', label: 'Mått', level: 'required' },
      { key: 'attributes.material', label: 'Material', level: 'recommended' },
      { key: 'brand', label: 'Tillverkare', level: 'recommended' },
    ],
    photos: COMMON_PHOTOS,
  },
  Collectibles: {
    id: 'Collectibles',
    facts: [
      { key: 'title', label: 'Identifiering', level: 'required' },
      { key: 'conditionGrade', label: 'Skick', level: 'required' },
      { key: 'authenticityStatus', label: 'Äkthetsstatus', level: 'required' },
      { key: 'attributes.edition', label: 'Utgåva eller år', level: 'recommended' },
      { key: 'attributes.provenance', label: 'Proveniens', level: 'recommended' },
    ],
    photos: [
      ...COMMON_PHOTOS,
      { role: 'label_model', label: 'Märkning eller signatur', level: 'required' },
    ],
  },
  General: {
    id: 'General',
    facts: [
      { key: 'title', label: 'Varunamn', level: 'required' },
      { key: 'category', label: 'Kategori', level: 'required' },
      { key: 'conditionGrade', label: 'Skick', level: 'required' },
      { key: 'brand', label: 'Varumärke', level: 'recommended' },
      { key: 'model', label: 'Modell', level: 'recommended' },
    ],
    photos: COMMON_PHOTOS,
  },
};

const CATEGORY_ALIASES: Record<string, SellerCategory> = {
  electronics: 'Electronics',
  elektronik: 'Electronics',
  fashion: 'Fashion',
  mode: 'Fashion',
  clothing: 'Fashion',
  furniture: 'Furniture',
  möbler: 'Furniture',
  mobler: 'Furniture',
  collectibles: 'Collectibles',
  samlarobjekt: 'Collectibles',
};

export function normalizeSellerCategory(category?: string): SellerCategory {
  return CATEGORY_ALIASES[category?.trim().toLowerCase() ?? ''] ?? 'General';
}

export function getCategoryProfile(category?: string): CategoryProfile {
  return PROFILES[normalizeSellerCategory(category)];
}

export function readFactValue(facts: VerifiedProductFacts, key: string): string {
  if (key.startsWith('attributes.')) {
    return facts.attributes[key.slice('attributes.'.length)]?.value.trim() ?? '';
  }
  const fact = facts[key as keyof VerifiedProductFacts];
  if (!fact || typeof fact !== 'object' || !('value' in fact)) return '';
  const value = fact.value;
  if (Array.isArray(value)) return value.join(', ');
  return String(value).trim();
}

export function isRequirementComplete(facts: VerifiedProductFacts, key: string): boolean {
  const value = readFactValue(facts, key).toLowerCase();
  return Boolean(value) && !['unknown', 'unspecified item', 'okänd', 'okant'].includes(value);
}

export const categoryProfileService = {
  get: getCategoryProfile,
  normalize: normalizeSellerCategory,
  isRequirementComplete,
};
