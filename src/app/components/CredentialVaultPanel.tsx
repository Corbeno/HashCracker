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
  RowSelectionOptions,
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

  const defaultColDef = useMemo<ColDef<Credential>>(
    () => ({
      editable: true,
      sortable: true,
      resizable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      minWidth: 120,
    }),
    []
  );

  const rowSelection = useMemo<RowSelectionOptions<Credential>>(
    () => ({
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: false,
      enableSelectionWithoutKeys: true,
      copySelectedRows: true,
      selectAll: 'filtered',
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent<Credential>) => {
    gridApiRef.current = params.api;
    params.api.sizeColumnsToFit();
  }, []);

  // After credentials updates, if there's a pending new row, scroll to it and start editing
  useEffect(() => {
    if (!pendingNewRowId.current || !gridApiRef.current) return;
    const api = gridApiRef.current;
    const newRowId = pendingNewRowId.current;
    const rowNode = api.getRowNode(newRowId);
    if (!rowNode) return;
    pendingNewRowId.current = null;
    // Small delay to let the grid finish rendering the new row
    setTimeout(() => {
      const latestNode = api.getRowNode(newRowId);
      const rowIndex = latestNode?.rowIndex;
      if (rowIndex == null) return;
      api.ensureIndexVisible(rowIndex, 'bottom');
      api.startEditingCell({ rowIndex, colKey: 'username' });
    }, 0);
  }, [credentials]);

  const handleAddRow = useCallback(() => {
    const newId = crypto.randomUUID();
    pendingNewRowId.current = newId;
    setQuickFilterText('');
    addCredential(newId);
  }, [addCredential]);

  const columnDefs = useMemo<ColDef<Credential>[]>(
    () => [
      {
        headerName: 'Username',
        field: 'username',
        flex: 1,
      },
      {
        headerName: 'Password',
        field: 'password',
        flex: 1,
      },
      { headerName: 'Hash', field: 'hash', flex: 2 },
      { headerName: 'Team', field: 'team', flex: 1 },
      {
        headerName: 'Device',
        field: 'device',
        flex: 1,
      },
      {
        headerName: 'Shared',
        field: 'shared',
        width: 110,
        editable: true,
        filter: false,
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
    <div className="w-full max-w-[1800px] mx-auto h-full bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 flex flex-col gap-4">
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

      <div className="flex-1 min-h-[300px]" style={{ width: '100%' }}>
        <AgGridReact<Credential>
          rowData={credentials}
          defaultColDef={defaultColDef}
          columnDefs={columnDefs}
          getRowId={params => params.data.id}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          onRowSelected={onRowSelected}
          rowSelection={rowSelection}
          singleClickEdit={true}
          rowNumbers={true}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={100}
          copyHeadersToClipboard={true}
          suppressCopyRowsToClipboard={false}
          animateRows={true}
          theme={theme}
          quickFilterText={quickFilterText}
        />
      </div>
    </div>
  );
}
