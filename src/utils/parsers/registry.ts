/**
 * Parser Registry
 * Central registry for all log parsers
 * Supports pluggable architecture for easy extension
 */

import { deduplicateCredentials, filterMachineAccounts, filterInvalidHashes } from './base';
import { AutoParseResult, LogParser, ParseResult, ParsedCredential, ParserInfo } from './types';

/**
 * Parser Registry Class
 * Manages all registered parsers and provides parsing operations
 */
class ParserRegistry {
  private parsers: Map<string, LogParser> = new Map();

  /**
   * Register a parser
   */
  register(parser: LogParser): void {
    this.parsers.set(parser.info.id, parser);
  }

  /**
   * Unregister a parser
   */
  unregister(parserId: string): boolean {
    return this.parsers.delete(parserId);
  }

  /**
   * Get a parser by ID
   */
  getParser(id: string): LogParser | undefined {
    return this.parsers.get(id);
  }

  /**
   * List all registered parsers
   */
  listParsers(): ParserInfo[] {
    return Array.from(this.parsers.values()).map(p => p.info);
  }

  /**
   * Check if a parser is registered
   */
  hasParser(id: string): boolean {
    return this.parsers.has(id);
  }

  /**
   * Parse text using a specific parser
   */
  parse(parserId: string, text: string, options: ParseOptions = {}): ParseResult {
    const parser = this.getParser(parserId);
    if (!parser) {
      throw new Error(`Parser not found: ${parserId}`);
    }

    const rawCredentials = parser.parse(text);
    return this.processResults(rawCredentials, parser.info, options);
  }

  /**
   * Auto-parse text using all parsers
   * Returns results from the parser that found the most credentials
   */
  autoParse(text: string, options: ParseOptions = {}): AutoParseResult {
    const allResults: AutoParseResult['allResults'] = [];

    // Try all parsers
    for (const parser of this.parsers.values()) {
      try {
        const rawCredentials = parser.parse(text);
        if (rawCredentials.length > 0) {
          allResults.push({
            parserId: parser.info.id,
            parserName: parser.info.name,
            credentials: rawCredentials,
            count: rawCredentials.length,
          });
        }
      } catch (error) {
        // Silently skip parsers that fail
        console.warn(`Parser ${parser.info.id} failed:`, error);
      }
    }

    // Sort by count descending
    allResults.sort((a, b) => b.count - a.count);

    // Use the best result (most credentials)
    const bestResult = allResults[0];
    if (!bestResult) {
      return {
        credentials: [],
        parser: 'none',
        count: 0,
        parserUsed: 'none',
        allResults: [],
      };
    }

    const parser = this.getParser(bestResult.parserId)!;
    const processed = this.processResults(bestResult.credentials, parser.info, options);

    return {
      ...processed,
      parserUsed: bestResult.parserId,
      allResults: allResults.map(r => ({
        parserId: r.parserId,
        parserName: r.parserName,
        credentials: r.credentials,
        count: r.count,
      })),
    };
  }

  /**
   * Process raw parsing results with filtering
   */
  private processResults(
    credentials: ParsedCredential[],
    parserInfo: ParserInfo,
    options: ParseOptions
  ): ParseResult {
    let result = [...credentials];
    const stats = {
      machineAccounts: 0,
      emptyHashes: 0,
      duplicates: 0,
      invalidHashes: 0,
    };

    // Filter machine accounts
    if (options.filterMachineAccounts !== false) {
      const { filtered, count } = filterMachineAccounts(result);
      result = filtered;
      stats.machineAccounts = count;
    }

    // Deduplicate
    if (options.deduplicate !== false) {
      const beforeCount = result.length;
      result = deduplicateCredentials(result);
      stats.duplicates = beforeCount - result.length;
    }

    // Validate hashes
    if (options.validateHashes && options.hashValidator) {
      const { valid, count } = filterInvalidHashes(result, options.hashValidator);
      result = valid;
      stats.invalidHashes = count;
    }

    return {
      credentials: result,
      parser: parserInfo.id,
      count: result.length,
      filtered: stats,
      raw: {
        totalLines: credentials.length,
        matchedLines: result.length,
      },
    };
  }

  /**
   * Get the count of registered parsers
   */
  get count(): number {
    return this.parsers.size;
  }

  /**
   * Clear all registered parsers
   */
  clear(): void {
    this.parsers.clear();
  }
}

/**
 * Parse options
 */
interface ParseOptions {
  filterMachineAccounts?: boolean;
  deduplicate?: boolean;
  validateHashes?: boolean;
  hashValidator?: (hash: string) => boolean;
}

// Create singleton instance
const registry = new ParserRegistry();

// Export both the singleton and the class for testing
export { registry as default, ParserRegistry };

// Convenience exports
export const registerParser = registry.register.bind(registry);
export const unregisterParser = registry.unregister.bind(registry);
export const getParser = registry.getParser.bind(registry);
export const listParsers = registry.listParsers.bind(registry);
export const hasParser = registry.hasParser.bind(registry);
export const parseWithParser = registry.parse.bind(registry);
export const autoParse = registry.autoParse.bind(registry);
export const getParserCount = () => registry.count;
export const clearParsers = registry.clear.bind(registry);

// Import and register built-in parsers
// Using dynamic require to avoid circular dependencies during module load
function registerBuiltinParsers() {
  const { NtlmPwdumpParser } = require('./NtlmPwdumpParser');
  const { NtlmNetNtlmv2Parser } = require('./NtlmNetNtlmv2Parser');

  registry.register(new NtlmPwdumpParser());
  registry.register(new NtlmNetNtlmv2Parser());
}

registerBuiltinParsers();
