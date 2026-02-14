import fs from 'fs';
import path from 'path';

import Database from 'better-sqlite3';

import { withSqlErrorLogging } from './sqliteUtils';

const VAULT_DB_PATH = path.join(process.cwd(), 'data', 'credential-vault.sqlite');

let database: Database.Database | null = null;

export interface VaultTabRow {
  id: string;
  name: string;
  position: number;
}

export interface VaultCredentialRow {
  id: string;
  tab_id: string;
  username: string;
  password: string;
  hash: string;
  hash_type: number | null;
  device: string;
  position: number;
}

interface CountRow {
  count: number;
}

interface ExistsRow {
  exists_flag: number;
}

export interface VaultTabParams {
  id: string;
  name: string;
  position: number;
}

export interface VaultCredentialParams {
  id: string;
  tabId: string;
  username: string;
  password: string;
  hash: string;
  hashType: number | null;
  device: string;
  position: number;
}

interface RenameTabParams {
  id: string;
  name: string;
}

interface DeleteTabParams {
  id: string;
}

interface TabIdParams {
  tabId: string;
}

interface CredentialLookupParams {
  tabId: string;
  credentialId: string;
}

export interface CredentialUpdateParams {
  tabId: string;
  credentialId: string;
  username: string;
  password: string;
  hash: string;
  hashType: number | null;
  device: string;
}

interface HashTypeParams {
  hashType: number;
}

interface UpdateCredentialPasswordParams {
  id: string;
  password: string;
}

export interface CredentialHashRow {
  id: string;
  hash: string;
}

function ensureVaultDbParentExists(): void {
  const directory = path.dirname(VAULT_DB_PATH);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

const withVaultSql = <T>(operation: string, execute: () => T, context?: unknown): T =>
  withSqlErrorLogging('Credential vault', operation, execute, context);

function getDatabase(): Database.Database {
  if (database) return database;

  withVaultSql('database.init', () => {
    ensureVaultDbParentExists();
    database = new Database(VAULT_DB_PATH);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    database.exec(`
      DROP TABLE IF EXISTS vault_metadata;

      CREATE TABLE IF NOT EXISTS vault_tabs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vault_credentials (
        id TEXT PRIMARY KEY,
        tab_id TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        hash TEXT NOT NULL,
        hash_type INTEGER,
        device TEXT NOT NULL,
        position INTEGER NOT NULL,
        FOREIGN KEY (tab_id) REFERENCES vault_tabs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_vault_credentials_tab_id
        ON vault_credentials(tab_id);

      CREATE INDEX IF NOT EXISTS idx_vault_credentials_hash_lookup
        ON vault_credentials(hash_type, hash);
    `);
  });

  if (!database) {
    throw new Error('Failed to initialize credential vault database');
  }

  return database;
}

export function withVaultTransaction<T>(action: () => T): T {
  return withVaultSql('transaction.execute', () => {
    const db = getDatabase();
    const transaction = db.transaction(action);
    return transaction();
  });
}

export function getAllTabs(): VaultTabRow[] {
  return withVaultSql('tabs.getAll', () =>
    getDatabase()
      .prepare<[], VaultTabRow>('SELECT id, name, position FROM vault_tabs ORDER BY position ASC')
      .all()
  );
}

export function getAllCredentials(): VaultCredentialRow[] {
  return withVaultSql('credentials.getAll', () =>
    getDatabase()
      .prepare<[], VaultCredentialRow>(
        `
          SELECT
            id,
            tab_id,
            username,
            password,
            hash,
            hash_type,
            device,
            position
          FROM vault_credentials
          ORDER BY tab_id ASC, position ASC
        `
      )
      .all()
  );
}

export function getCredentialsForTab(tabId: string): VaultCredentialRow[] {
  return withVaultSql(
    'credentials.getForTab',
    () =>
      getDatabase()
        .prepare<TabIdParams, VaultCredentialRow>(
          `
            SELECT
              id,
              tab_id,
              username,
              password,
              hash,
              hash_type,
              device,
              position
            FROM vault_credentials
            WHERE tab_id = @tabId
            ORDER BY position ASC
          `
        )
        .all({ tabId }),
    { tabId }
  );
}

export function countTabs(): number {
  const row = withVaultSql('tabs.count', () =>
    getDatabase().prepare<[], CountRow>('SELECT COUNT(*) as count FROM vault_tabs').get()
  );
  return row?.count ?? 0;
}

export function getMaxTabPosition(): number {
  const row = withVaultSql('tabs.getMaxPosition', () =>
    getDatabase()
      .prepare<
        [],
        { maxPosition: number | null }
      >('SELECT MAX(position) as maxPosition FROM vault_tabs')
      .get()
  );
  return row?.maxPosition ?? -1;
}

export function insertTab(params: VaultTabParams): void {
  withVaultSql(
    'tabs.insert',
    () =>
      getDatabase()
        .prepare<VaultTabParams>(
          'INSERT INTO vault_tabs (id, name, position) VALUES (@id, @name, @position)'
        )
        .run(params),
    params
  );
}

export function renameTabIfChanged(params: RenameTabParams): number {
  return withVaultSql(
    'tabs.renameIfChanged',
    () =>
      getDatabase()
        .prepare<RenameTabParams>(
          'UPDATE vault_tabs SET name = @name WHERE id = @id AND name <> @name'
        )
        .run(params).changes,
    params
  );
}

export function deleteTabById(id: string): number {
  return withVaultSql(
    'tabs.deleteById',
    () =>
      getDatabase().prepare<DeleteTabParams>('DELETE FROM vault_tabs WHERE id = @id').run({ id })
        .changes,
    { id }
  );
}

export function tabExists(id: string): boolean {
  const row = withVaultSql(
    'tabs.exists',
    () =>
      getDatabase()
        .prepare<
          DeleteTabParams,
          ExistsRow
        >('SELECT EXISTS(SELECT 1 FROM vault_tabs WHERE id = @id) as exists_flag')
        .get({ id }),
    { id }
  );
  return (row?.exists_flag ?? 0) === 1;
}

export function getMaxCredentialPositionForTab(tabId: string): number {
  const row = withVaultSql(
    'credentials.getMaxPositionForTab',
    () =>
      getDatabase()
        .prepare<
          TabIdParams,
          { maxPosition: number | null }
        >('SELECT MAX(position) as maxPosition FROM vault_credentials WHERE tab_id = @tabId')
        .get({ tabId }),
    { tabId }
  );
  return row?.maxPosition ?? -1;
}

export function insertCredential(params: VaultCredentialParams): void {
  withVaultSql(
    'credentials.insert',
    () =>
      getDatabase()
        .prepare<VaultCredentialParams>(
          `
            INSERT INTO vault_credentials (
              id,
              tab_id,
              username,
              password,
              hash,
              hash_type,
              device,
              position
            ) VALUES (
              @id,
              @tabId,
              @username,
              @password,
              @hash,
              @hashType,
              @device,
              @position
            )
          `
        )
        .run(params),
    params
  );
}

export function getCredentialInTab(
  tabId: string,
  credentialId: string
): VaultCredentialRow | undefined {
  return withVaultSql(
    'credentials.getInTab',
    () =>
      getDatabase()
        .prepare<CredentialLookupParams, VaultCredentialRow>(
          `
            SELECT
              id,
              tab_id,
              username,
              password,
              hash,
              hash_type,
              device,
              position
            FROM vault_credentials
            WHERE tab_id = @tabId AND id = @credentialId
          `
        )
        .get({ tabId, credentialId }),
    { tabId, credentialId }
  );
}

export function updateCredentialIfChanged(params: CredentialUpdateParams): number {
  return withVaultSql(
    'credentials.updateIfChanged',
    () =>
      getDatabase()
        .prepare<CredentialUpdateParams>(
          `
            UPDATE vault_credentials
            SET
              username = @username,
              password = @password,
              hash = @hash,
              hash_type = @hashType,
              device = @device
            WHERE tab_id = @tabId AND id = @credentialId
              AND (
                username <> @username OR
                password <> @password OR
                hash <> @hash OR
                COALESCE(hash_type, -1) <> COALESCE(@hashType, -1) OR
                device <> @device
              )
          `
        )
        .run(params).changes,
    params
  );
}

export function deleteCredentialInTab(tabId: string, credentialId: string): number {
  return withVaultSql(
    'credentials.deleteInTab',
    () =>
      getDatabase()
        .prepare<CredentialLookupParams>(
          'DELETE FROM vault_credentials WHERE tab_id = @tabId AND id = @credentialId'
        )
        .run({ tabId, credentialId }).changes,
    { tabId, credentialId }
  );
}

export function deleteCredentialsForTab(tabId: string): number {
  return withVaultSql(
    'credentials.deleteForTab',
    () =>
      getDatabase()
        .prepare<TabIdParams>('DELETE FROM vault_credentials WHERE tab_id = @tabId')
        .run({ tabId }).changes,
    { tabId }
  );
}

export function deleteAllCredentials(): number {
  return withVaultSql(
    'credentials.deleteAll',
    () => getDatabase().prepare('DELETE FROM vault_credentials').run().changes
  );
}

export function deleteAllTabs(): number {
  return withVaultSql(
    'tabs.deleteAll',
    () => getDatabase().prepare('DELETE FROM vault_tabs').run().changes
  );
}

export function getBlankPasswordCredentialsByHashType(hashType: number): CredentialHashRow[] {
  return withVaultSql(
    'credentials.getBlankPasswordByHashType',
    () =>
      getDatabase()
        .prepare<HashTypeParams, CredentialHashRow>(
          `
            SELECT id, hash
            FROM vault_credentials
            WHERE hash_type = @hashType AND TRIM(password) = ''
          `
        )
        .all({ hashType }),
    { hashType }
  );
}

export function updateCredentialPasswordById(id: string, password: string): number {
  return withVaultSql(
    'credentials.updatePasswordById',
    () =>
      getDatabase()
        .prepare<UpdateCredentialPasswordParams>(
          'UPDATE vault_credentials SET password = @password WHERE id = @id'
        )
        .run({ id, password }).changes,
    { id }
  );
}
