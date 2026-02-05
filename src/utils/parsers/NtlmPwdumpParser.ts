/**
 * NTLM Pwdump Parser
 * Parses pwdump format: username:rid:LM_hash:NT_hash:comment:homedir:
 * Extracts usernames and NT hashes, filters machine accounts and empty LM hashes
 */

import { createCredential, isEmptyLMHash, parseLines } from './base';
import { LogParser, ParsedCredential, ParserInfo } from './types';

/**
 * Pwdump line format:
 * username:rid:LM_hash:NT_hash:comment:homedir:
 *
 * Examples:
 * Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
 * john.smith:1010:aad3b435b51404eeaad3b435b51404ee:b4b9b02e6f09a9bd760f388b67351e2b:::
 * WORKSTATION01$:1011:aad3b435b51404eeaad3b435b51404ee:5e6f5f5e7e8f9e0e1e2e3e4e5e6e7e8e:::
 */

const PWDUMP_REGEX = /^([^:]+):(\d+):([a-fA-F0-9]{32}):([a-fA-F0-9]{32}):/;

export class NtlmPwdumpParser implements LogParser {
  info: ParserInfo = {
    id: 'ntlm-pwdump',
    name: 'NTLM Pwdump',
    description: 'Parses Windows pwdump format with username:rid:LM:NT structure',
    supportedFormats: ['pwdump', 'mimikatz lsadump::sam', 'samdump'],
    hashTypeId: 1000,
    hashTypeName: 'NTLM',
    exampleInputs: [
      'Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::',
      'john.smith:1010:aad3b435b51404eeaad3b435b51404ee:b4b9b02e6f09a9bd760f388b67351e2b:::',
    ],
  };

  parse(input: string): ParsedCredential[] {
    return parseLines(input, line => this.parseLine(line));
  }

  private parseLine(line: string): ParsedCredential | null {
    const match = PWDUMP_REGEX.exec(line);
    if (!match) {
      return null;
    }

    const username = match[1];
    const rid = match[2];
    const lmHash = match[3];
    const ntHash = match[4];

    // Skip if NT hash is empty or invalid
    if (!ntHash || ntHash.length !== 32) {
      return null;
    }

    // Create credential with metadata
    return createCredential(username, ntHash, this.info.hashTypeId, this.info.hashTypeName, {
      rid,
      lmHash,
      lmHashEmpty: isEmptyLMHash(lmHash),
      sourceLine: line,
    });
  }
}

export default NtlmPwdumpParser;
