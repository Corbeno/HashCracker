import { ICellEditorParams } from 'ag-grid-community';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import SearchableDropdown, { DropdownOption } from '@/components/ui/searchable-dropdown';
import { Credential } from '@/types/credential';

export interface HashTypeOption extends DropdownOption {
  id: number;
  name: string;
}

export const HashTypeDropdownCellEditor = forwardRef<
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

export function HashTypeTextCellRenderer({
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
