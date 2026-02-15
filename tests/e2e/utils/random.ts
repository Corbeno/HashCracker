import { randomBytes } from 'crypto';

export function randomHex(byteLength = 16): string {
  return randomBytes(byteLength).toString('hex');
}
