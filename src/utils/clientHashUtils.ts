/**
 * Client-side hash utility functions
 * This file contains only browser-safe functions for hash handling
 */

/**
 * Compares two hashes, respecting the case-sensitivity setting
 * @param hash1 First hash to compare
 * @param hash2 Second hash to compare
 * @param isCaseSensitive Whether the hash comparison should be case-sensitive
 * @returns Boolean indicating if the hashes are equivalent
 */
export function compareHashes(hash1: string, hash2: string, isCaseSensitive: boolean): boolean {
  if (isCaseSensitive) {
    return hash1 === hash2;
  } else {
    return hash1.toLowerCase() === hash2.toLowerCase();
  }
} 