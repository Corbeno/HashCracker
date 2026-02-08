'use client';

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import {
  AllCommunityModule,
  CellValueChangedEvent,
  ColDef,
  colorSchemeDark,
  ColumnMovedEvent,
  ColumnPinnedEvent,
  ColumnResizedEvent,
  ColumnVisibleEvent,
  FilterChangedEvent,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  RowSelectedEvent,
  RowSelectionOptions,
  SortChangedEvent,
  themeAlpine,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import useCredentialVault from '@/hooks/useCredentialVault';
import { Credential } from '@/types/credential';

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark);
const GRID_STATE_STORAGE_KEY = 'credentialVault.gridState';

interface CredentialVaultGridState {
  columnState: ReturnType<GridApi<Credential>['getColumnState']>;
  filterModel: ReturnType<GridApi<Credential>['getFilterModel']>;
}

function loadGridState(): CredentialVaultGridState | null {
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

export default function CredentialVaultPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    tabs,
    activeTabId,
    addTab,
    setActiveTab,
    renameTab,
    deleteTab,
    addCredential,
    updateCredential,
    deleteCredentials,
  } = useCredentialVault();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickFilterText, setQuickFilterText] = useState('');
  const [isCreatingTab, setIsCreatingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameTabName, setRenameTabName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ tabId: string } | null>(null);
  const gridApiRef = useRef<GridApi<Credential> | null>(null);
  const pendingNewRowId = useRef<string | null>(null);
  const cancelCreateTabOnBlurRef = useRef(false);
  const cancelRenameTabOnBlurRef = useRef(false);
  const activeTab = useMemo(
    () => tabs.find(tab => tab.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  );
  const contextMenuOpen = contextMenu !== null;
  const routeTabId = searchParams?.get('tab') ?? null;

  const setRouteTabParam = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleSelectTab = useCallback(
    (tabId: string) => {
      if (!tabs.some(tab => tab.id === tabId)) return;
      setActiveTab(tabId);
      if (routeTabId !== tabId) {
        setRouteTabParam(tabId);
      }
    },
    [tabs, setActiveTab, routeTabId, setRouteTabParam]
  );

  const { refs, floatingStyles, context } = useFloating({
    open: contextMenuOpen,
    onOpenChange: open => {
      if (!open) setContextMenu(null);
    },
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true,
  });
  const role = useRole(context, { role: 'menu' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

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
    const gridState = loadGridState();
    if (gridState) {
      params.api.applyColumnState({ state: gridState.columnState, applyOrder: true });
      params.api.setFilterModel(gridState.filterModel);
    }
    params.api.sizeColumnsToFit();
  }, []);

  const persistGridState = useCallback(() => {
    if (!gridApiRef.current) return;
    const state: CredentialVaultGridState = {
      columnState: gridApiRef.current.getColumnState(),
      filterModel: gridApiRef.current.getFilterModel(),
    };
    localStorage.setItem(GRID_STATE_STORAGE_KEY, JSON.stringify(state));
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
  }, [activeTab?.credentials]);

  useEffect(() => {
    setSelectedIds(new Set());
    setQuickFilterText('');
    pendingNewRowId.current = null;
  }, [activeTabId]);

  useEffect(() => {
    if (!routeTabId || !tabs.some(tab => tab.id === routeTabId)) return;
    if (routeTabId === activeTabId) return;
    setActiveTab(routeTabId);
  }, [routeTabId, activeTabId, tabs, setActiveTab]);

  useEffect(() => {
    if (!activeTabId) return;
    const hasValidRouteTab = !!routeTabId && tabs.some(tab => tab.id === routeTabId);
    if (hasValidRouteTab) return;
    setRouteTabParam(activeTabId);
  }, [activeTabId, routeTabId, tabs, setRouteTabParam]);

  const handleAddRow = useCallback(() => {
    if (!activeTab) return;
    const newId = crypto.randomUUID();
    pendingNewRowId.current = newId;
    setQuickFilterText('');
    addCredential(activeTab.id, newId);
  }, [activeTab, addCredential]);

  const handleAddTab = useCallback(() => {
    cancelCreateTabOnBlurRef.current = false;
    setContextMenu(null);
    setRenamingTabId(null);
    setIsCreatingTab(true);
    setNewTabName('');
  }, []);

  const handleCreateTab = useCallback(() => {
    if (newTabName.trim() === '') {
      setIsCreatingTab(false);
      setNewTabName('');
      return;
    }
    addTab(newTabName);
    setIsCreatingTab(false);
    setNewTabName('');
  }, [addTab, newTabName]);

  const handleNewTabInputBlur = useCallback(() => {
    if (cancelCreateTabOnBlurRef.current) {
      cancelCreateTabOnBlurRef.current = false;
      return;
    }
    handleCreateTab();
  }, [handleCreateTab]);

  const handleNewTabInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      cancelCreateTabOnBlurRef.current = true;
      setIsCreatingTab(false);
      setNewTabName('');
    }
  }, []);

  const handleStartRenameTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find(nextTab => nextTab.id === tabId);
      if (!tab) return;
      cancelRenameTabOnBlurRef.current = false;
      setContextMenu(null);
      setIsCreatingTab(false);
      setNewTabName('');
      setRenamingTabId(tab.id);
      setRenameTabName(tab.name);
    },
    [tabs]
  );

  const handleCommitRenameTab = useCallback(() => {
    if (!renamingTabId) return;
    renameTab(renamingTabId, renameTabName);
    setRenamingTabId(null);
    setRenameTabName('');
  }, [renamingTabId, renameTabName, renameTab]);

  const handleRenameTabInputBlur = useCallback(() => {
    if (cancelRenameTabOnBlurRef.current) {
      cancelRenameTabOnBlurRef.current = false;
      return;
    }
    handleCommitRenameTab();
  }, [handleCommitRenameTab]);

  const handleRenameTabInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      cancelRenameTabOnBlurRef.current = true;
      setRenamingTabId(null);
      setRenameTabName('');
    }
  }, []);

  const handleOpenTabContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, tabId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const x = event.clientX;
      const y = event.clientY;
      refs.setPositionReference({
        getBoundingClientRect: () =>
          ({
            x,
            y,
            top: y,
            left: x,
            right: x,
            bottom: y,
            width: 0,
            height: 0,
            toJSON: () => ({}),
          }) as DOMRect,
      });
      setContextMenu({ tabId });
    },
    [refs]
  );

  const handleDeleteTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      setContextMenu(null);
      setRenamingTabId(null);
      setRenameTabName('');
      deleteTab(tabId);
    },
    [tabs.length, deleteTab]
  );

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
      {
        headerName: 'Device',
        field: 'device',
        flex: 1,
      },
    ],
    []
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<Credential>) => {
      if (!event.data || !event.colDef.field) return;
      if (!activeTab) return;
      const field = event.colDef.field as keyof Credential;
      updateCredential(activeTab.id, event.data.id, field, event.newValue);
    },
    [activeTab, updateCredential]
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

  const onFilterChanged = useCallback(
    (_event: FilterChangedEvent<Credential>) => {
      persistGridState();
    },
    [persistGridState]
  );

  const onSortChanged = useCallback(
    (_event: SortChangedEvent<Credential>) => {
      persistGridState();
    },
    [persistGridState]
  );

  const onColumnMoved = useCallback(
    (_event: ColumnMovedEvent<Credential>) => {
      persistGridState();
    },
    [persistGridState]
  );

  const onColumnPinned = useCallback(
    (_event: ColumnPinnedEvent<Credential>) => {
      persistGridState();
    },
    [persistGridState]
  );

  const onColumnVisible = useCallback(
    (_event: ColumnVisibleEvent<Credential>) => {
      persistGridState();
    },
    [persistGridState]
  );

  const onColumnResized = useCallback(
    (event: ColumnResizedEvent<Credential>) => {
      if (!event.finished) return;
      persistGridState();
    },
    [persistGridState]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!activeTab || selectedIds.size === 0) return;
    deleteCredentials(activeTab.id, Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [activeTab, selectedIds, deleteCredentials]);

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
            disabled={!activeTab}
          >
            + Add Row
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const isRenaming = tab.id === renamingTabId;
          return isRenaming ? (
            <input
              key={tab.id}
              autoFocus
              value={renameTabName}
              onChange={event => setRenameTabName(event.target.value)}
              onBlur={handleRenameTabInputBlur}
              onKeyDown={handleRenameTabInputKeyDown}
              className="px-3 py-1.5 rounded-lg text-sm border border-blue-500 bg-gray-800 text-white placeholder-gray-400 focus:outline-none w-32"
              aria-label="Rename tab"
            />
          ) : (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              onContextMenu={event => handleOpenTabContextMenu(event, tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap border transition-colors ${
                isActive
                  ? 'bg-blue-600/80 border-blue-500 text-white'
                  : 'bg-gray-700/60 border-gray-600 text-gray-200 hover:bg-gray-700'
              }`}
            >
              {tab.name}
            </button>
          );
        })}
        {isCreatingTab ? (
          <input
            autoFocus
            value={newTabName}
            onChange={event => setNewTabName(event.target.value)}
            onBlur={handleNewTabInputBlur}
            onKeyDown={handleNewTabInputKeyDown}
            placeholder="New tab"
            className="px-3 py-1.5 rounded-lg text-sm border border-blue-500 bg-gray-800 text-white placeholder-gray-400 focus:outline-none w-32"
            aria-label="New tab name"
          />
        ) : (
          <button
            onClick={handleAddTab}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-600 text-gray-100 bg-gray-700/50 hover:bg-gray-700 transition-colors"
            aria-label="Add vault tab"
          >
            +
          </button>
        )}
      </div>

      {contextMenu && (
        <div
          ref={refs.setFloating}
          className="fixed z-50 min-w-36 rounded-lg border border-gray-600 bg-gray-900/95 shadow-xl"
          style={floatingStyles}
          {...getFloatingProps()}
        >
          <button
            onClick={() => handleStartRenameTab(contextMenu.tabId)}
            className="w-full text-left px-3 py-2 text-sm text-gray-100 hover:bg-gray-700/80"
          >
            Rename Tab
          </button>
          <button
            onClick={() => handleDeleteTab(contextMenu.tabId)}
            disabled={tabs.length <= 1}
            className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-900/30 disabled:text-gray-500 disabled:hover:bg-transparent"
          >
            Delete Tab
          </button>
        </div>
      )}

      <div className="flex-1 min-h-[300px]" style={{ width: '100%' }}>
        <AgGridReact<Credential>
          rowData={activeTab?.credentials ?? []}
          defaultColDef={defaultColDef}
          columnDefs={columnDefs}
          getRowId={params => params.data.id}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          onRowSelected={onRowSelected}
          onFilterChanged={onFilterChanged}
          onSortChanged={onSortChanged}
          onColumnMoved={onColumnMoved}
          onColumnPinned={onColumnPinned}
          onColumnVisible={onColumnVisible}
          onColumnResized={onColumnResized}
          rowSelection={rowSelection}
          singleClickEdit={true}
          stopEditingWhenCellsLoseFocus={true}
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
