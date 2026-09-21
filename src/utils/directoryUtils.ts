import fs from 'fs';
import fsPromises from 'fs/promises';

interface DirectoryContext {
  caller: string;
  source: string;
}

function validateDirectory(directory: string, context: DirectoryContext): void {
  if (directory.trim()) return;

  const error = new Error(
    `Cannot create directory: empty or whitespace-only path ${JSON.stringify(directory)} ` +
      `in ${context.caller} (source: ${context.source}). Check this path configuration.`
  );
  // Do not use logger here: it creates its own directory through this helper.
  // Console diagnostics must remain available even when file logging cannot initialize.
  console.error('Directory creation rejected:', {
    ...context,
    directory,
    cwd: process.cwd(),
    message: error.message,
    stack: error.stack,
  });
  throw error;
}

export function ensureDirectorySync(directory: string, context: DirectoryContext): void {
  validateDirectory(directory, context);
  fs.mkdirSync(directory, { recursive: true });
}

export async function ensureDirectory(directory: string, context: DirectoryContext): Promise<void> {
  validateDirectory(directory, context);
  await fsPromises.mkdir(directory, { recursive: true });
}
