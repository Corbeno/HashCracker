import { HASH_TYPE_CASE_SENSITIVITY } from '@/config/hashTypes';

export function isHashTypeIdCaseSensitive(hashTypeId: number): boolean {
  // Default to case-sensitive if unknown.
  return HASH_TYPE_CASE_SENSITIVITY[hashTypeId] ?? true;
}

export function normalizeHashForType(hashTypeId: number, hash: string): string {
  const trimmed = hash.trim();
  if (!trimmed) return '';
  return isHashTypeIdCaseSensitive(hashTypeId) ? trimmed : trimmed.toLowerCase();
}
