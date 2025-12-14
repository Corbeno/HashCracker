'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownOption {
  id: string | number;
  name: string;
  description?: string;
  [key: string]: any; // Allow additional properties
}

interface SearchableDropdownProps {
  options: DropdownOption[];
  value: string | number | null;
  onChange: (option: DropdownOption) => void;
  placeholder?: string;
  label?: string;
  searchPlaceholder?: string;
  renderOption?: (option: DropdownOption, isSelected: boolean, isHighlighted: boolean) => ReactNode;
  getFilteredOptions?: (options: DropdownOption[], searchTerm: string) => DropdownOption[];
  className?: string;
  disabled?: boolean;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  searchPlaceholder = 'Search...',
  renderOption,
  getFilteredOptions,
  className = '',
  disabled = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default filter function if not provided
  const defaultFilterOptions = (options: DropdownOption[], term: string) => {
    if (!term) return options;

    const searchLower = term.toLowerCase();
    return options.filter(
      option =>
        option.name.toLowerCase().includes(searchLower) ||
        option.id.toString().toLowerCase().includes(searchLower) ||
        (option.description && option.description.toLowerCase().includes(searchLower))
    );
  };

  // Use custom filter function if provided, otherwise use default
  const filterFunction = getFilteredOptions || defaultFilterOptions;

  // Filter options based on search term
  const filteredOptions = filterFunction(options, searchTerm);

  // Find the selected option
  const selectedOption = options.find(option => option.id === value);

  // Set initial selected index based on current value when dropdown opens
  useEffect(() => {
    if (isOpen && value !== null) {
      const index = filteredOptions.findIndex(option => option.id === value);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    }
  }, [isOpen, filteredOptions, value]);

  // Update dropdown position when it's opened
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });

      // Focus the search input when dropdown opens
      if (searchInputRef.current) {
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
          // Reset dropdown scroll position to top when opened
          if (dropdownRef.current) {
            dropdownRef.current.scrollTop = 0;
          }
        }, 0); // Small delay to ensure dropdown is rendered.
        //I was having a weird issue where the dropdown was getting shifted to the left a bit... This seems to solve it lol
      }
    }
  }, [isOpen]);

  // Scroll selected item into view when navigating
  useEffect(() => {
    if (isOpen && filteredOptions.length > 0 && selectedIndex >= 0) {
      const selectedElement = document.getElementById(
        `dropdown-option-${filteredOptions[selectedIndex]?.id}`
      );
      if (selectedElement && dropdownRef.current) {
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const selectedRect = selectedElement.getBoundingClientRect();

        // Check if the element is outside the visible area
        if (selectedRect.top < dropdownRect.top || selectedRect.bottom > dropdownRect.bottom) {
          selectedElement.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }, [selectedIndex, isOpen, filteredOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Don't close if clicking on the search input
      if (searchInputRef.current && searchInputRef.current.contains(event.target as Node)) {
        return;
      }

      // Don't close if clicking inside the dropdown
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }

      // Close if clicking outside the container and dropdown
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions.length > 0 && selectedIndex >= 0) {
          const selected = filteredOptions[selectedIndex];
          selectOption(selected);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  // Function to select an option
  const selectOption = (option: DropdownOption) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Default render function for dropdown options
  const defaultRenderOption = (
    option: DropdownOption,
    _isSelected: boolean,
    _isHighlighted: boolean
  ) => (
    <div className="flex flex-col group relative w-full">
      <div className="break-words">{option.name}</div>
      {option.description && (
        <>
          <div className="text-xs text-gray-400 break-words">{option.description}</div>
        </>
      )}
    </div>
  );

  // Use custom render function if provided, otherwise use default
  const renderOptionFn = renderOption || defaultRenderOption;

  return (
    <div className={`relative ${className}`}>
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}

      <div className="relative" ref={containerRef}>
        <div className="flex group relative">
          <input
            type="text"
            placeholder={placeholder}
            value={selectedOption ? selectedOption.name : ''}
            onClick={() => !disabled && setIsOpen(true)}
            readOnly
            className="w-full bg-gray-900/50 rounded-xl border border-gray-700 p-3 pr-8 cursor-pointer truncate"
            disabled={disabled}
          />
          <div className="absolute right-3 top-3 pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* Popover that appears on hover when dropdown is closed */}
          {selectedOption && !isOpen && (
            <div className="absolute left-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-gray-900 text-white rounded-md py-2 px-3 shadow-lg max-w-xs">
                <div className="font-medium">{selectedOption.name}</div>
                {selectedOption.description && (
                  <div className="text-sm text-gray-300 mt-1">{selectedOption.description}</div>
                )}
              </div>
              {/* Arrow */}
              <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute -bottom-1 left-3"></div>
            </div>
          )}
        </div>

        {isOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div>
              <div
                className="fixed inset-0 z-[998]"
                onClick={e => {
                  // Don't close if clicking on the search input or dropdown
                  if (
                    (searchInputRef.current && searchInputRef.current.contains(e.target as Node)) ||
                    (dropdownRef.current && dropdownRef.current.contains(e.target as Node))
                  ) {
                    e.stopPropagation();
                    return;
                  }
                  setIsOpen(false);
                }}
              />
              <div
                ref={dropdownRef}
                className="max-h-80 overflow-y-auto overflow-x-hidden bg-gray-800 border border-gray-700 rounded-xl shadow-lg z-[999]"
                style={{
                  position: 'absolute',
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  width: `${dropdownPosition.width}px`,
                  zIndex: 9999,
                  transform: 'translateZ(0)', // Force GPU acceleration
                }}
                role="listbox"
                aria-labelledby="dropdown-button"
                onAnimationStart={() => {
                  // Force a reflow when the dropdown appears
                  if (dropdownRef.current) {
                    void dropdownRef.current.offsetHeight;
                  }
                }}
              >
                <div className="sticky top-0 bg-gray-800 p-2 border-b border-gray-700 z-10">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={e => {
                      e.stopPropagation();
                    }}
                    className="w-full bg-gray-900/50 rounded-lg border border-gray-700 p-2 text-sm"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-controls="dropdown-listbox"
                  />
                </div>

                <div id="dropdown-listbox">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option, index) => (
                      <div
                        key={option.id}
                        className={`p-2 px-3 cursor-pointer hover:bg-gray-700/50 ${
                          value === option.id ? 'bg-blue-900/30' : ''
                        } ${selectedIndex === index ? 'bg-blue-700' : ''}`}
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectOption(option);
                        }}
                        role="option"
                        aria-selected={selectedIndex === index}
                        id={`dropdown-option-${option.id}`}
                      >
                        {renderOptionFn(option, value === option.id, selectedIndex === index)}
                      </div>
                    ))
                  ) : (
                    <div className="p-2 px-3 text-gray-400">No options found</div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
