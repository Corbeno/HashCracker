export const PENDING_CRACKER_TRANSFER_KEY = 'pendingCrackerVaultTransfer';

export interface PendingCrackerVaultTransfer {
  hashes: string[];
  hashType: number;
}

export function parsePendingCrackerTransfer(raw: string): PendingCrackerVaultTransfer | null {
  const parsed = JSON.parse(raw) as {
    hashes?: unknown;
    hashType?: unknown;
  };

  if (parsed.hashType == null) return null;

  const hashType = Number(parsed.hashType);
  if (!Number.isFinite(hashType)) return null;

  const hashes = Array.isArray(parsed.hashes)
    ? parsed.hashes.map(hash => String(hash ?? '').trim()).filter(Boolean)
    : [];
  if (hashes.length === 0) return null;

  return {
    hashes,
    hashType,
  };
}
