import { logger } from './logger';

function toErrorPayload(error: unknown): unknown {
  if (!(error instanceof Error)) return error;
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

export function withSqlErrorLogging<T>(
  scope: string,
  operation: string,
  execute: () => T,
  context?: unknown
): T {
  try {
    return execute();
  } catch (error) {
    void logger.debug(`${scope} SQL query failed`, {
      operation,
      context,
      error: toErrorPayload(error),
    });
    throw error;
  }
}
