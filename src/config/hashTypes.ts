/**
 * Hash type definitions for hashcat
 */
export interface HashType {
  id: number;
  name: string;
  category?: string;
  regex: string;
  isCaseSensitive?: boolean;
}

export interface HashTypes {
  [key: string]: HashType;
}

/**
 * Determines if a hash type is case-sensitive
 * Most hash types using hexadecimal characters are case-insensitive
 */
export function isHashTypeCaseSensitive(hashType: HashType): boolean {
  // If explicitly set, use that value
  if (typeof hashType.isCaseSensitive === 'boolean') {
    return hashType.isCaseSensitive;
  }
  
  // Otherwise determine by regex pattern
  // If regex contains hex character class, it's likely case-insensitive
  return !hashType.regex.includes('a-fA-F0-9');
}

const hashTypes: HashTypes = {
  '900': {
    id: 900,
    name: 'MD4',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '0': {
    id: 0,
    name: 'MD5',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '100': {
    id: 100,
    name: 'SHA1',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '1300': {
    id: 1300,
    name: 'SHA2-224',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{56}\\b',
  },
  '1400': {
    id: 1400,
    name: 'SHA2-256',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '10800': {
    id: 10800,
    name: 'SHA2-384',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{96}\\b',
  },
  '1700': {
    id: 1700,
    name: 'SHA2-512',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '17300': {
    id: 17300,
    name: 'SHA3-224',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{56}\\b',
  },
  '17400': {
    id: 17400,
    name: 'SHA3-256',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '17500': {
    id: 17500,
    name: 'SHA3-384',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{96}\\b',
  },
  '17600': {
    id: 17600,
    name: 'SHA3-512',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '6000': {
    id: 6000,
    name: 'RIPEMD-160',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '600': {
    id: 600,
    name: 'BLAKE2b-512',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '11700': {
    id: 11700,
    name: 'GOST R 34.11-2012 (Streebog) 256-bit',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '11800': {
    id: 11800,
    name: 'GOST R 34.11-2012 (Streebog) 512-bit',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '6900': {
    id: 6900,
    name: 'GOST R 34.11-94',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '17010': {
    id: 17010,
    name: 'GPG (AES-128/AES-256 (SHA-1($pass)))',
    category: 'Raw Hash',
    regex: '',
  },
  '5100': {
    id: 5100,
    name: 'Half MD5',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{16}\\b',
  },
  '17700': {
    id: 17700,
    name: 'Keccak-224',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{56}\\b',
  },
  '17800': {
    id: 17800,
    name: 'Keccak-256',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '17900': {
    id: 17900,
    name: 'Keccak-384',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{96}\\b',
  },
  '18000': {
    id: 18000,
    name: 'Keccak-512',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '6100': {
    id: 6100,
    name: 'Whirlpool',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '10100': {
    id: 10100,
    name: 'SipHash',
    category: 'Raw Hash',
    regex: '',
  },
  '70': {
    id: 70,
    name: 'md5(utf16le($pass))',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '170': {
    id: 170,
    name: 'sha1(utf16le($pass))',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '1470': {
    id: 1470,
    name: 'sha256(utf16le($pass))',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '10870': {
    id: 10870,
    name: 'sha384(utf16le($pass))',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{96}\\b',
  },
  '1770': {
    id: 1770,
    name: 'sha512(utf16le($pass))',
    category: 'Raw Hash',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '610': {
    id: 610,
    name: 'BLAKE2b-512($pass.$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '',
  },
  '620': {
    id: 620,
    name: 'BLAKE2b-512($salt.$pass)',
    category: 'Raw Hash salted and/or iterated',
    regex: '',
  },
  '10': {
    id: 10,
    name: 'md5($pass.$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '20': {
    id: 20,
    name: 'md5($salt.$pass)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '3800': {
    id: 3800,
    name: 'md5($salt.$pass.$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '3710': {
    id: 3710,
    name: 'md5($salt.md5($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '4110': {
    id: 4110,
    name: 'md5($salt.md5($pass.$salt))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '4010': {
    id: 4010,
    name: 'md5($salt.md5($salt.$pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '21300': {
    id: 21300,
    name: 'md5($salt.sha1($salt.$pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '40': {
    id: 40,
    name: 'md5($salt.utf16le($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '2600': {
    id: 2600,
    name: 'md5(md5($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '3910': {
    id: 3910,
    name: 'md5(md5($pass).md5($salt))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '3500': {
    id: 3500,
    name: 'md5(md5(md5($pass)))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '4400': {
    id: 4400,
    name: 'md5(sha1($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '4410': {
    id: 4410,
    name: 'md5(sha1($pass).$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '20900': {
    id: 20900,
    name: 'md5(sha1($pass).md5($pass).sha1($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '21200': {
    id: 21200,
    name: 'md5(sha1($salt).md5($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '4300': {
    id: 4300,
    name: 'md5(strtoupper(md5($pass)))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '30': {
    id: 30,
    name: 'md5(utf16le($pass).$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '110': {
    id: 110,
    name: 'sha1($pass.$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '120': {
    id: 120,
    name: 'sha1($salt.$pass)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '4900': {
    id: 4900,
    name: 'sha1($salt.$pass.$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '4520': {
    id: 4520,
    name: 'sha1($salt.sha1($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '24300': {
    id: 24300,
    name: 'sha1($salt.sha1($pass.$salt))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '140': {
    id: 140,
    name: 'sha1($salt.utf16le($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '19300': {
    id: 19300,
    name: 'sha1($salt1.$pass.$salt2)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '14400': {
    id: 14400,
    name: 'sha1(CX)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '4700': {
    id: 4700,
    name: 'sha1(md5($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '4710': {
    id: 4710,
    name: 'sha1(md5($pass).$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '21100': {
    id: 21100,
    name: 'sha1(md5($pass.$salt))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '18500': {
    id: 18500,
    name: 'sha1(md5(md5($pass)))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '4500': {
    id: 4500,
    name: 'sha1(sha1($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '4510': {
    id: 4510,
    name: 'sha1(sha1($pass).$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '5000': {
    id: 5000,
    name: 'sha1(sha1($salt.$pass.$salt))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '130': {
    id: 130,
    name: 'sha1(utf16le($pass).$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '1410': {
    id: 1410,
    name: 'sha256($pass.$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '1420': {
    id: 1420,
    name: 'sha256($salt.$pass)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '22300': {
    id: 22300,
    name: 'sha256($salt.$pass.$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '20720': {
    id: 20720,
    name: 'sha256($salt.sha256($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '21420': {
    id: 21420,
    name: 'sha256($salt.sha256_bin($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '1440': {
    id: 1440,
    name: 'sha256($salt.utf16le($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '20800': {
    id: 20800,
    name: 'sha256(md5($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '20710': {
    id: 20710,
    name: 'sha256(sha256($pass).$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '21400': {
    id: 21400,
    name: 'sha256(sha256_bin($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '1430': {
    id: 1430,
    name: 'sha256(utf16le($pass).$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '10810': {
    id: 10810,
    name: 'sha384($pass.$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{96}\\b',
  },
  '10820': {
    id: 10820,
    name: 'sha384($salt.$pass)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{96}\\b',
  },
  '10840': {
    id: 10840,
    name: 'sha384($salt.utf16le($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{96}\\b',
  },
  '10830': {
    id: 10830,
    name: 'sha384(utf16le($pass).$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{96}\\b',
  },
  '1710': {
    id: 1710,
    name: 'sha512($pass.$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '1720': {
    id: 1720,
    name: 'sha512($salt.$pass)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '1740': {
    id: 1740,
    name: 'sha512($salt.utf16le($pass))',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '1730': {
    id: 1730,
    name: 'sha512(utf16le($pass).$salt)',
    category: 'Raw Hash salted and/or iterated',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '50': {
    id: 50,
    name: 'HMAC-MD5 (key = $pass)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '60': {
    id: 60,
    name: 'HMAC-MD5 (key = $salt)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '150': {
    id: 150,
    name: 'HMAC-SHA1 (key = $pass)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '160': {
    id: 160,
    name: 'HMAC-SHA1 (key = $salt)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{40}\\b',
  },
  '1450': {
    id: 1450,
    name: 'HMAC-SHA256 (key = $pass)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '1460': {
    id: 1460,
    name: 'HMAC-SHA256 (key = $salt)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '1750': {
    id: 1750,
    name: 'HMAC-SHA512 (key = $pass)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '1760': {
    id: 1760,
    name: 'HMAC-SHA512 (key = $salt)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '11750': {
    id: 11750,
    name: 'HMAC-Streebog-256 (key = $pass)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '11760': {
    id: 11760,
    name: 'HMAC-Streebog-256 (key = $salt)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{64}\\b',
  },
  '11850': {
    id: 11850,
    name: 'HMAC-Streebog-512 (key = $pass)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '11860': {
    id: 11860,
    name: 'HMAC-Streebog-512 (key = $salt)',
    category: 'Raw Hash authenticated',
    regex: '\\b[a-fA-F0-9]{128}\\b',
  },
  '28700': {
    id: 28700,
    name: 'Amazon AWS4-HMAC-SHA256',
    category: 'Raw Hash authenticated',
    regex: '',
  },
  '11500': {
    id: 11500,
    name: 'CRC32',
    category: 'Raw Checksum',
    regex: '\\b[a-fA-F0-9]{8}\\b',
  },
  '27900': {
    id: 27900,
    name: 'CRC32C',
    category: 'Raw Checksum',
    regex: '\\b[a-fA-F0-9]{8}\\b',
  },
  '28000': {
    id: 28000,
    name: 'CRC64Jones',
    category: 'Raw Checksum',
    regex: '\\b[a-fA-F0-9]{16}\\b',
  },
  '18700': {
    id: 18700,
    name: 'Java Object hashCode()',
    category: 'Raw Checksum',
    regex: '\\b[a-fA-F0-9]{8}\\b',
  },
  '25700': {
    id: 25700,
    name: 'MurmurHash',
    category: 'Raw Checksum',
    regex: '\\b[a-fA-F0-9]{8}\\b',
  },
  '27800': {
    id: 27800,
    name: 'MurmurHash3',
    category: 'Raw Checksum',
    regex: '\\b[a-fA-F0-9]{8}\\b',
  },
  '1000': {
    id: 1000,
    name: 'NTLM',
    category: 'Operating System',
    regex: '\\b([a-fA-F0-9]{32}:)?([a-fA-F0-9]{32})\\b',
  },
  '3000': {
    id: 3000,
    name: 'LM',
    category: 'Operating System',
    regex: '\\b[a-fA-F0-9]{32}\\b',
  },
  '400': {
    id: 400,
    name: 'phpass',
    category: 'Generic KDF',
    regex: '',
  },
  '11900': {
    id: 11900,
    name: 'PBKDF2-HMAC-MD5',
    category: 'Generic KDF',
    regex: '',
  },
  '12000': {
    id: 12000,
    name: 'PBKDF2-HMAC-SHA1',
    category: 'Generic KDF',
    regex: '',
  },
  '10900': {
    id: 10900,
    name: 'PBKDF2-HMAC-SHA256',
    category: 'Generic KDF',
    regex: '',
  },
  '12100': {
    id: 12100,
    name: 'PBKDF2-HMAC-SHA512',
    category: 'Generic KDF',
    regex: '',
  },
  '8900': {
    id: 8900,
    name: 'scrypt',
    category: 'Generic KDF',
    regex: '',
  },
  '3200': {
    id: 3200,
    name: 'bcrypt $2*$, Blowfish (Unix)',
    category: 'Operating System',
    regex: '\\$2[ayb]\\$.{56}',
  },
  '500': {
    id: 500,
    name: 'md5crypt, MD5 (Unix), Cisco-IOS $1$ (MD5)',
    category: 'Operating System',
    regex: '\\$1\\$[a-zA-Z0-9./]{0,8}\\$[a-zA-Z0-9./]{22}',
  },
  '7400': {
    id: 7400,
    name: 'sha256crypt $5$, SHA256 (Unix)',
    category: 'Operating System',
    regex: '\\$5\\$[a-zA-Z0-9./]{0,16}\\$[a-zA-Z0-9./]{43}',
  },
  '1800': {
    id: 1800,
    name: 'sha512crypt $6$, SHA512 (Unix)',
    category: 'Operating System',
    regex: '\\$6\\$[a-zA-Z0-9./]{0,16}\\$[a-zA-Z0-9./]{86}',
  },
  '300': {
    id: 300,
    name: 'MySQL4.1/MySQL5',
    category: 'Database Server',
    regex: '\\*[a-fA-F0-9]{40}',
  },
  '200': {
    id: 200,
    name: 'MySQL323',
    category: 'Database Server',
    regex: '[a-fA-F0-9]{16}',
  },
  '12': {
    id: 12,
    name: 'PostgreSQL',
    category: 'Database Server',
    regex: 'md5[a-fA-F0-9]{32}',
  },
  '131': {
    id: 131,
    name: 'MSSQL (2000)',
    category: 'Database Server',
    regex: '[a-fA-F0-9]{32}:',
  },
  '132': {
    id: 132,
    name: 'MSSQL (2005)',
    category: 'Database Server',
    regex: '[a-fA-F0-9]{128}:',
  },
  '1731': {
    id: 1731,
    name: 'MSSQL (2012, 2014)',
    category: 'Database Server',
    regex: '[a-fA-F0-9]{128}:',
  },
  '3100': {
    id: 3100,
    name: 'Oracle H: Type (Oracle 7+)',
    category: 'Database Server',
    regex: '[a-fA-F0-9]{16}',
  },
  '112': {
    id: 112,
    name: 'Oracle S: Type (Oracle 11+)',
    category: 'Database Server',
    regex: '[a-fA-F0-9]{60}',
  },
  '12300': {
    id: 12300,
    name: 'Oracle T: Type (Oracle 12+)',
    category: 'Database Server',
    regex: '[a-fA-F0-9]{60}',
  },
  '16500': {
    id: 16500,
    name: 'JWT (JSON Web Token)',
    category: 'Network Protocol',
    regex: '',
  },
  '2500': {
    id: 2500,
    name: 'WPA-EAPOL-PBKDF2',
    category: 'Network Protocol',
    regex: '',
  },
  '16800': {
    id: 16800,
    name: 'WPA-PBKDF2-PMKID+EAPOL',
    category: 'Network Protocol',
    regex: '',
  },
  '10500': {
    id: 10500,
    name: 'PDF 1.4 - 1.6 (Acrobat 5 - 8)',
    category: 'Document',
    regex: '',
  },
  '10700': {
    id: 10700,
    name: 'PDF 1.7 Level 8 (Acrobat 10 - 11)',
    category: 'Document',
    regex: '',
  },
  '9400': {
    id: 9400,
    name: 'MS Office 2007',
    category: 'Document',
    regex: '',
  },
  '9500': {
    id: 9500,
    name: 'MS Office 2010',
    category: 'Document',
    regex: '',
  },
  '9600': {
    id: 9600,
    name: 'MS Office 2013',
    category: 'Document',
    regex: '',
  },
  '13400': {
    id: 13400,
    name: 'KeePass 1 (AES/Twofish) and KeePass 2 (AES)',
    category: 'Password Manager',
    regex: '',
  },
  '6800': {
    id: 6800,
    name: 'LastPass + LastPass sniffed',
    category: 'Password Manager',
    regex: '',
  },
  '11600': {
    id: 11600,
    name: '7-Zip',
    category: 'Archive',
    regex: '',
  },
  '12500': {
    id: 12500,
    name: 'RAR3-hp',
    category: 'Archive',
    regex: '',
  },
  '13000': {
    id: 13000,
    name: 'RAR5',
    category: 'Archive',
    regex: '',
  },
  '17200': {
    id: 17200,
    name: 'PKZIP (Compressed)',
    category: 'Archive',
    regex: '',
  },
  '13600': {
    id: 13600,
    name: 'WinZip',
    category: 'Archive',
    regex: '',
  },
  '14800': {
    id: 14800,
    name: 'iTunes backup >= 10.0',
    category: 'Archive',
    regex: '',
  },
  '11300': {
    id: 11300,
    name: 'Bitcoin/Litecoin wallet.dat',
    category: 'Cryptocurrency Wallet',
    regex: '',
  },
  '15600': {
    id: 15600,
    name: 'Ethereum Wallet, PBKDF2-HMAC-SHA256',
    category: 'Cryptocurrency Wallet',
    regex: '',
  },
  '15700': {
    id: 15700,
    name: 'Ethereum Wallet, SCRYPT',
    category: 'Cryptocurrency Wallet',
    regex: '',
  },
  '16600': {
    id: 16600,
    name: 'Electrum Wallet (Salt-Type 1-3)',
    category: 'Cryptocurrency Wallet',
    regex: '',
  },
};

export default hashTypes;
