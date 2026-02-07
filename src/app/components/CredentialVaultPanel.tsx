'use client';

import {
  AllCommunityModule,
  CellValueChangedEvent,
  ColDef,
  colorSchemeDark,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  RowSelectedEvent,
  themeAlpine,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useCredentialVault from '@/hooks/useCredentialVault';
import { Credential } from '@/types/credential';

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark);

export default function CredentialVaultPanel() {
  const { credentials, addCredential, updateCredential, deleteCredentials } = useCredentialVault();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickFilterText, setQuickFilterText] = useState('');
  const gridApiRef = useRef<GridApi<Credential> | null>(null);
  const pendingNewRowId = useRef<string | null>(null);

  const onGridReady = useCallback((params: GridReadyEvent<Credential>) => {
    gridApiRef.current = params.api;
  }, []);

  // After credentials updates, if there's a pending new row, scroll to it and start editing
  useEffect(() => {
    if (!pendingNewRowId.current || !gridApiRef.current) return;
    const api = gridApiRef.current;
    const rowIndex = credentials.findIndex(c => c.id === pendingNewRowId.current);
    if (rowIndex === -1) return;
    pendingNewRowId.current = null;
    // Small delay to let the grid finish rendering the new row
    setTimeout(() => {
      api.ensureIndexVisible(rowIndex, 'bottom');
      api.startEditingCell({ rowIndex, colKey: 'username' });
    }, 0);
  }, [credentials]);

  const handleAddRow = useCallback(() => {
    const newId = crypto.randomUUID();
    pendingNewRowId.current = newId;
    addCredential(newId);
  }, [addCredential]);

  const columnDefs = useMemo<ColDef<Credential>[]>(
    () => [
      {
        headerName: '',
        field: 'id',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 48,
        editable: false,
        resizable: false,
      },
      {
        headerName: 'Username',
        field: 'username',
        flex: 1,
        editable: true,
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Password',
        field: 'password',
        flex: 1,
        editable: true,
        filter: 'agTextColumnFilter',
      },
      { headerName: 'Hash', field: 'hash', flex: 2, editable: true, filter: 'agTextColumnFilter' },
      { headerName: 'Team', field: 'team', flex: 1, editable: true, filter: 'agTextColumnFilter' },
      {
        headerName: 'Device',
        field: 'device',
        flex: 1,
        editable: true,
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Shared',
        field: 'shared',
        width: 80,
        editable: true,
        cellRenderer: (params: { value: boolean }) => {
          return params.value ? 'Yes' : 'No';
        },
      },
    ],
    []
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<Credential>) => {
      if (!event.data || !event.colDef.field) return;
      const field = event.colDef.field as keyof Credential;
      updateCredential(event.data.id, field, event.newValue);
    },
    [updateCredential]
  );

  const onRowSelected = useCallback((event: RowSelectedEvent<Credential>) => {
    if (!event.data) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (event.node.isSelected()) {
        next.add(event.data!.id);
      } else {
        next.delete(event.data!.id);
      }
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    deleteCredentials(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [selectedIds, deleteCredentials]);

  return (
    <div className="w-full max-w-[1800px] mx-auto bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Credential Vault</h2>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search all columns..."
            value={quickFilterText}
            onChange={e => setQuickFilterText(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-48"
          />
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleAddRow}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Add Row
          </button>
        </div>
      </div>

      <div style={{ height: 400, width: '100%' }}>
        <AgGridReact<Credential>
          rowData={credentials}
          columnDefs={columnDefs}
          getRowId={params => params.data.id}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          onRowSelected={onRowSelected}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          singleClickEdit={true}
          animateRows={true}
          theme={theme}
          quickFilterText={quickFilterText}
        />
      </div>
    </div>
  );
}
