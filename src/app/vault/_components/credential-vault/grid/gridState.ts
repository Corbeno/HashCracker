import { GridApi } from 'ag-grid-community';

import { GRID_STATE_STORAGE_KEY } from '../constants';

import { Credential } from '@/types/credential';

export interface CredentialVaultGridState {
  columnState: ReturnType<GridApi<Credential>['getColumnState']>;
  filterModel: ReturnType<GridApi<Credential>['getFilterModel']>;
}

export function loadGridState(): CredentialVaultGridState | null {
  try {
    const raw = localStorage.getItem(GRID_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CredentialVaultGridState>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.columnState) || typeof parsed.filterModel !== 'object') return null;
    return {
      columnState: parsed.columnState,
      filterModel: parsed.filterModel,
    };
  } catch {
    return null;
  }
}

export function persistGridState(gridApi: GridApi<Credential> | null): void {
  if (!gridApi) return;
  const state: CredentialVaultGridState = {
    columnState: gridApi.getColumnState(),
    filterModel: gridApi.getFilterModel(),
  };
  localStorage.setItem(GRID_STATE_STORAGE_KEY, JSON.stringify(state));
}
