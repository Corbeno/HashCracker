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
  ICellEditorParams,
  ModuleRegistry,
  RowSelectedEvent,
  RowSelectionOptions,
  SortChangedEvent,
  themeAlpine,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import LogImportModal from './LogImportModal';
import SearchableDropdown, { DropdownOption } from './SearchableDropdown';

import config from '@/config';
import useCredentialVault from '@/hooks/useCredentialVault';
import { Credential } from '@/types/credential';
import { LogImportType } from '@/types/logImport';

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeAlpine.withPart(colorSchemeDark);
const GRID_STATE_STORAGE_KEY = 'credentialVault.gridState';
const PENDING_CRACKER_TRANSFER_KEY = 'pendingCrackerVaultTransfer';

interface HashTypeOption extends DropdownOption {
  id: number;
  name: string;
}

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

function hasAnyCredentialData(credential: Record<string, unknown>): boolean {
  return [
    credential.username,
    credential.password,
    credential.hash,
    credential.hashType,
    credential.device,
  ].some(value => String(value ?? '').trim() !== '');
}

const HashTypeDropdownCellEditor = forwardRef<
  { getValue: () => number | null },
  ICellEditorParams<Credential, number | null> & {
    options: HashTypeOption[];
    onCommit: (credentialId: string, value: number | null) => void;
  }
>(function HashTypeDropdownCellEditorInner(
  {
    value,
    data,
    options,
    onCommit,
    stopEditing,
  }: ICellEditorParams<Credential, number | null> & {
    options: HashTypeOption[];
    onCommit: (credentialId: string, value: number | null) => void;
  },
  ref
) {
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(() => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });
  const selectedValueRef = useRef<number | null>(selectedValue);

  useEffect(() => {
    selectedValueRef.current = selectedValue;
  }, [selectedValue]);

  useImperativeHandle(
    ref,
    () => ({
      getValue: () => selectedValueRef.current,
      afterGuiAttached: () => {
        requestAnimationFrame(() => {
          const searchInput = editorRootRef.current?.querySelector<HTMLInputElement>(
            'input[data-searchable-dropdown-search="true"]'
          );
          if (searchInput) {
            searchInput.focus();
            return;
          }

          const triggerInput = editorRootRef.current?.querySelector<HTMLInputElement>(
            'input[data-searchable-dropdown-trigger="true"]'
          );
          triggerInput?.focus();
        });
      },
    }),
    []
  );

  return (
    <div ref={editorRootRef} className="w-full h-full min-w-[220px] bg-gray-900/90 p-1">
      <SearchableDropdown
        options={options}
        value={selectedValue}
        onChange={option => {
          const nextValue = option.id as number;
          selectedValueRef.current = nextValue;
          setSelectedValue(nextValue);
          if (data?.id) {
            onCommit(data.id, nextValue);
          }
          stopEditing();
        }}
        placeholder="Select"
        searchPlaceholder="Search hash type..."
        className="text-xs"
        compact
        defaultOpen
        renderInPortal
        portalClassName="ag-custom-component-popup"
        prioritizedOptionIds={[1000]}
      />
      {selectedValue !== null && (
        <button
          type="button"
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            selectedValueRef.current = null;
            setSelectedValue(null);
            if (data?.id) {
              onCommit(data.id, null);
            }
            stopEditing();
          }}
          className="mt-1 text-[11px] text-gray-400 hover:text-gray-200"
        >
          Clear
        </button>
      )}
    </div>
  );
});

function HashTypeTextCellRenderer({
  value,
  options,
}: {
  value: number | null;
  options: HashTypeOption[];
}) {
  if (value == null) return null;

  const option = options.find(nextOption => nextOption.id === Number(value));
  if (!option) return <span>{String(value)}</span>;

  return <span>{option.name}</span>;
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
    logImport,
  } = useCredentialVault();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickFilterText, setQuickFilterText] = useState('');
  const [isCreatingTab, setIsCreatingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameTabName, setRenameTabName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ tabId: string } | null>(null);
  const [isLogImportModalOpen, setIsLogImportModalOpen] = useState(false);
  const gridApiRef = useRef<GridApi<Credential> | null>(null);
  const pendingNewRowId = useRef<string | null>(null);
  const pendingAutoAppendFromRowId = useRef<string | null>(null);
  const cancelCreateTabOnBlurRef = useRef(false);
  const cancelRenameTabOnBlurRef = useRef(false);
  const activeTab = useMemo(
    () => tabs.find(tab => tab.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  );
  const contextMenuOpen = contextMenu !== null;
  const routeTabId = searchParams?.get('tab') ?? null;
  const hashTypeOptions = useMemo<HashTypeOption[]>(
    () =>
      Object.entries(config.hashcat.hashTypes)
        .map(([id, hashType]) => ({
          id: Number.parseInt(id, 10),
          name: `${id} - ${hashType.name}`,
          description: hashType.category || 'Other',
        }))
        .sort((a, b) => a.id - b.id),
    []
  );
  const hashTypeNameById = useMemo(
    () => new Map(hashTypeOptions.map(option => [option.id, option.name])),
    [hashTypeOptions]
  );

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
      floatingFilter: false,
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
    if (!pendingAutoAppendFromRowId.current) return;
    pendingAutoAppendFromRowId.current = null;
  }, [activeTab?.credentials.length]);

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

  const handleCommitHashType = useCallback(
    (credentialId: string, value: number | null) => {
      if (!activeTab) return;
      updateCredential(activeTab.id, credentialId, 'hashType', value);
    },
    [activeTab, updateCredential]
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
        headerName: 'Hash Type',
        field: 'hashType',
        flex: 1,
        editable: true,
        minWidth: 230,
        cellRenderer: HashTypeTextCellRenderer,
        cellEditor: HashTypeDropdownCellEditor,
        cellEditorPopup: false,
        suppressKeyboardEvent: params => params.editing,
        cellEditorParams: () => ({
          options: hashTypeOptions,
          onCommit: handleCommitHashType,
        }),
        cellRendererParams: {
          options: hashTypeOptions,
        },
        valueFormatter: params => {
          if (params.value == null) return '';
          const hashTypeId = Number(params.value);
          if (!Number.isFinite(hashTypeId)) return '';
          return hashTypeNameById.get(hashTypeId) ?? String(hashTypeId);
        },
      },
      {
        headerName: 'Device',
        field: 'device',
        flex: 1,
      },
    ],
    [handleCommitHashType, hashTypeNameById, hashTypeOptions]
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<Credential>) => {
      if (!event.data || !event.colDef.field) return;
      if (!activeTab) return;
      const field = event.colDef.field as keyof Credential;
      if (field === 'hashType') {
        return;
      }
      const nextValue = event.newValue;
      updateCredential(activeTab.id, event.data.id, field, nextValue);

      // Create a new row if this is the last row
      const credentials = activeTab.credentials;
      const lastCredential = credentials[credentials.length - 1];
      if (!lastCredential || lastCredential.id !== event.data.id) return;
      if (pendingAutoAppendFromRowId.current === event.data.id) return;

      const updatedRow = {
        ...event.data,
        [field]: nextValue,
      } as Record<string, unknown>;
      if (!hasAnyCredentialData(updatedRow)) return;

      const newId = crypto.randomUUID();
      pendingAutoAppendFromRowId.current = event.data.id;
      pendingNewRowId.current = newId;
      addCredential(activeTab.id, newId);
    },
    [activeTab, updateCredential, addCredential]
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

  const selectedCredentials = useMemo(() => {
    if (!activeTab) return [];
    return activeTab.credentials.filter(credential => selectedIds.has(credential.id));
  }, [activeTab, selectedIds]);

  const selectedCrackableRows = useMemo(
    () =>
      selectedCredentials.filter(
        (credential): credential is Credential & { hashType: number } =>
          credential.hash.trim() !== '' &&
          credential.hashType !== null &&
          credential.password.trim() === ''
      ),
    [selectedCredentials]
  );

  const selectedHashTypes = useMemo(
    () => Array.from(new Set(selectedCrackableRows.map(credential => credential.hashType))),
    [selectedCrackableRows]
  );

  const hasMixedSelectedHashTypes = selectedHashTypes.length > 1;
  const canSendSelectedToCracker =
    selectedIds.size > 0 && selectedCrackableRows.length > 0 && !hasMixedSelectedHashTypes;
  const sendDisabledReason = hasMixedSelectedHashTypes
    ? 'Selected rows contain multiple hash types. Choose rows with one hash type.'
    : '';

  const handleSendSelectedToCracker = useCallback(() => {
    if (!canSendSelectedToCracker || selectedHashTypes.length < 1) return;

    const hashType = selectedHashTypes[0];
    const hashes = Array.from(
      new Set(selectedCrackableRows.map(credential => credential.hash.trim()).filter(Boolean))
    );
    if (hashes.length === 0) return;

    localStorage.setItem(PENDING_CRACKER_TRANSFER_KEY, JSON.stringify({ hashes, hashType }));
    router.push('/cracker');
  }, [canSendSelectedToCracker, router, selectedCrackableRows, selectedHashTypes]);

  const handleLogImport = useCallback(
    async (logType: LogImportType, rawLog: string) => {
      if (!activeTab) return null;
      return logImport(activeTab.id, logType, rawLog);
    },
    [activeTab, logImport]
  );

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
          <button
            onClick={() => setIsLogImportModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            disabled={!activeTab}
          >
            Log Import
          </button>
          <button
            onClick={handleAddRow}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            disabled={!activeTab}
          >
            + Add Row
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pb-1">
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
      {selectedIds.size > 0 && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-gray-600 bg-gray-900/95 px-3 py-2 shadow-2xl backdrop-blur">
            <span className="text-sm text-gray-200 px-2">{selectedIds.size} selected</span>
            <button
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              Delete Selected
            </button>
            <div className="relative group">
              <button
                onClick={handleSendSelectedToCracker}
                className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canSendSelectedToCracker}
              >
                Crack Selected
              </button>
              {!canSendSelectedToCracker && sendDisabledReason && (
                <div className="pointer-events-none absolute right-0 bottom-full mb-2 z-30 hidden group-hover:block w-72 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 p-2 shadow-lg">
                  {sendDisabledReason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <LogImportModal
        isOpen={isLogImportModalOpen}
        onClose={() => setIsLogImportModalOpen(false)}
        onImport={handleLogImport}
      />
    </div>
  );
}
