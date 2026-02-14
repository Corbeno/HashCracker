import fs from 'fs';
import path from 'path';

import Database from 'better-sqlite3';

import { withSqlErrorLogging } from './sqliteUtils';

const HASH_VAULT_DB_PATH = path.join(process.cwd(), 'data', 'hash-vault.sqlite');

let database: Database.Database | null = null;

export interface HashVaultRow {
  hash_type: number;
  hash: string;
  cracked_hash: string;
}

function ensureHashVaultDbParentExists(): void {
  const directory = path.dirname(HASH_VAULT_DB_PATH);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

const withHashVaultSql = <T>(operation: string, execute: () => T, context?: unknown): T =>
  withSqlErrorLogging('Hash vault', operation, execute, context);

function getDatabase(): Database.Database {
  if (database) return database;

  withHashVaultSql('database.init', () => {
    ensureHashVaultDbParentExists();
    database = new Database(HASH_VAULT_DB_PATH);
    database.pragma('journal_mode = WAL');
    database.exec(`
      CREATE TABLE IF NOT EXISTS hash_vault (
        hash_type INTEGER NOT NULL,
        hash TEXT NOT NULL,
        cracked_hash TEXT NOT NULL,
        PRIMARY KEY (hash_type, hash)
      );
    `);
  });

  if (!database) {
    throw new Error('Failed to initialize hash vault database');
  }

  return database;
}

export function withHashVaultTransaction<T>(action: () => T): T {
  return withHashVaultSql('transaction.execute', () => {
    const db = getDatabase();
    const transaction = db.transaction(action);
    return transaction();
  });
}

export function upsertHashVaultRow(row: HashVaultRow): void {
  withHashVaultSql(
    'hashVault.upsert',
    () =>
      getDatabase()
        .prepare<HashVaultRow>(
          `
            INSERT INTO hash_vault (hash_type, hash, cracked_hash)
            VALUES (@hash_type, @hash, @cracked_hash)
            ON CONFLICT(hash_type, hash)
            DO UPDATE SET cracked_hash = excluded.cracked_hash
          `
        )
        .run(row),
    row
  );
}

export function getAllHashVaultRows(): HashVaultRow[] {
  return withHashVaultSql('hashVault.getAll', () =>
    getDatabase()
      .prepare<
        [],
        HashVaultRow
      >('SELECT hash_type, hash, cracked_hash FROM hash_vault ORDER BY hash_type ASC, hash ASC')
      .all()
  );
}

export function getHashVaultRowsByType(hashType: number): HashVaultRow[] {
  return withHashVaultSql(
    'hashVault.getByType',
    () =>
      getDatabase()
        .prepare<
          { hashType: number },
          HashVaultRow
        >('SELECT hash_type, hash, cracked_hash FROM hash_vault WHERE hash_type = @hashType ORDER BY hash ASC')
        .all({ hashType }),
    { hashType }
  );
}
