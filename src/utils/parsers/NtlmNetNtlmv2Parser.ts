/**
 * NTLM NetNTLMv2 Parser
 * Parses NetNTLMv2 format: DOMAIN\user::challenge:NTproof:LMproof
 * Used for network authentication captures
 */

import { createCredential, parseLines } from './base';
import { registerParser } from './registry';
import { LogParser, ParsedCredential, ParserInfo } from './types';

/**
 * NetNTLMv2 formats supported:
 *
 * Format 1: DOMAIN\user::challenge:NTResponse:LMResponse
 * Example: ACME\john.smith::c4b6c7d8e9f0:5e6f5f5e7e8f9e0e1e2e3e4e5e6e7e8e:0102030405060708090a0b0c0d0e0f10
 *
 * Format 2: user::DOMAIN:challenge:NTResponse:LMResponse
 * Example: john.smith::ACME:c4b6c7d8e9f0:5e6f5f5e7e8f9e0e1e2e3e4e5e6e7e8e:0102030405060708
 *
 * Format 3 (with client challenge): user::DOMAIN:challenge:NTResponse:LMResponse:clientChallenge
 */

// Pattern 1: DOMAIN\user::challenge:NTResponse:LMResponse
const NETNTLMV2_PATTERN_1 =
  /^([^\\:]+)\\([^:]+)::([a-fA-F0-9]{16}):([a-fA-F0-9]{32,}):([a-fA-F0-9]{32,})(?::|$)/;

// Pattern 2: user::DOMAIN:challenge:NTResponse:LMResponse
const NETNTLMV2_PATTERN_2 =
  /^([^:]+)::([^:]+):([a-fA-F0-9]{16}):([a-fA-F0-9]{32,}):([a-fA-F0-9]{32,})(?::|$)/;

// Hashcat mode 5600 for NetNTLMv2
const HASH_TYPE_ID = 5600;
const HASH_TYPE_NAME = 'NetNTLMv2';

export class NtlmNetNtlmv2Parser implements LogParser {
  info: ParserInfo = {
    id: 'ntlm-netntlmv2',
    name: 'NTLM NetNTLMv2',
    description: 'Parses NetNTLMv2 network authentication captures',
    supportedFormats: ['NetNTLMv2', 'responder', 'ntlmssp'],
    hashTypeId: HASH_TYPE_ID,
    hashTypeName: HASH_TYPE_NAME,
    exampleInputs: [
      'ACME\\john.smith::c4b6c7d8e9f0a1b2:5e6f5f5e7e8f9e0e1e2e3e4e5e6e7e8e:0102030405060708',
      'john.smith::ACME:c4b6c7d8e9f0a1b2:5e6f5f5e7e8f9e0e1e2e3e4e5e6e7e8e:0102030405060708',
    ],
  };

  parse(input: string): ParsedCredential[] {
    return parseLines(input, line => this.parseLine(line));
  }

  private parseLine(line: string): ParsedCredential | null {
    // Try pattern 1 first: DOMAIN\user::challenge:NT:LM
    let match = NETNTLMV2_PATTERN_1.exec(line);
    if (match) {
      const domain = match[1];
      const username = match[2];
      const challenge = match[3];
      const ntProof = match[4];
      const lmProof = match[5];

      // Build hashcat format: username::domain:challenge:ntproof:lmproof
      const hashcatFormat = `${username}::${domain}:${challenge}:${ntProof}:${lmProof}`;

      return createCredential(
        `${domain}\\${username}`,
        hashcatFormat,
        HASH_TYPE_ID,
        HASH_TYPE_NAME,
        {
          domain,
          username,
          challenge,
          ntProof,
          lmProof,
          format: 'domain\\user',
          sourceLine: line,
        }
      );
    }

    // Try pattern 2: user::DOMAIN:challenge:NT:LM
    match = NETNTLMV2_PATTERN_2.exec(line);
    if (match) {
      const username = match[1];
      const domain = match[2];
      const challenge = match[3];
      const ntProof = match[4];
      const lmProof = match[5];

      // Build hashcat format: username::domain:challenge:ntproof:lmproof
      const hashcatFormat = `${username}::${domain}:${challenge}:${ntProof}:${lmProof}`;

      return createCredential(
        `${domain}\\${username}`,
        hashcatFormat,
        HASH_TYPE_ID,
        HASH_TYPE_NAME,
        {
          domain,
          username,
          challenge,
          ntProof,
          lmProof,
          format: 'user::domain',
          sourceLine: line,
        }
      );
    }

    return null;
  }

  /**
   * Parse the hashcat output format back to components
   * Useful for verification
   */
  parseHashcatFormat(hash: string): {
    username: string;
    domain: string;
    challenge: string;
    ntProof: string;
    lmProof: string;
  } | null {
    const parts = hash.split(':');
    if (parts.length < 5) return null;

    return {
      username: parts[0],
      domain: parts[2],
      challenge: parts[3],
      ntProof: parts[4],
      lmProof: parts[5] || '',
    };
  }
}

// Create singleton instance
const ntlmNetNtlmv2Parser = new NtlmNetNtlmv2Parser();

// Auto-register on import
registerParser(ntlmNetNtlmv2Parser);

export default ntlmNetNtlmv2Parser;
