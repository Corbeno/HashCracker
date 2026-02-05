/**
 * Log Parser Type Definitions
 * Types for the pluggable parser architecture
 */

/**
 * Result of parsing a single credential from log text
 */
export interface ParsedCredential {
  username: string | null;
  hash: string;
  hashTypeId: number;
  hashTypeName: string;
  metadata?: Record<string, any>;
}

/**
 * Parser metadata and capabilities
 */
export interface ParserInfo {
  id: string;
  name: string;
  description: string;
  supportedFormats: string[];
  hashTypeId: number;
  hashTypeName: string;
  exampleInputs?: string[];
}

/**
 * Log Parser interface - all parsers must implement this
 */
export interface LogParser {
  readonly info: ParserInfo;
  parse(input: string): ParsedCredential[];
}

/**
 * Parse result with statistics
 */
export interface ParseResult {
  credentials: ParsedCredential[];
  parser: string;
  count: number;
  filtered?: {
    machineAccounts: number;
    emptyHashes: number;
    duplicates: number;
    invalidHashes: number;
  };
  raw?: {
    totalLines: number;
    matchedLines: number;
  };
}

/**
 * Auto-parse result with all attempts
 */
export interface AutoParseResult extends ParseResult {
  parserUsed: string;
  allResults: Array<{
    parserId: string;
    parserName: string;
    credentials: ParsedCredential[];
    count: number;
  }>;
}
