'use client';

import { useEffect, useRef, useState } from 'react';

import PotfileModal from '@/app/cracker/_components/PotfileModal';
import SessionCrackedHashesModal from '@/app/cracker/_components/SessionCrackedHashesModal';

type OpenModal = 'session' | 'potfile' | null;

export default function HashDataMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  const open = (modal: Exclude<OpenModal, null>) => {
    setMenuOpen(false);
    setOpenModal(modal);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(current => !current)}
          className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
          aria-label="Hash data menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-testid="hash-data-menu-toggle"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => open('session')}
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-800"
              data-testid="open-session-cracked-hashes"
            >
              View Cracked Hashes
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => open('potfile')}
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-gray-800"
              data-testid="open-potfile"
            >
              View Potfile
            </button>
          </div>
        )}
      </div>

      {openModal === 'session' && <SessionCrackedHashesModal onClose={() => setOpenModal(null)} />}
      {openModal === 'potfile' && <PotfileModal onClose={() => setOpenModal(null)} />}
    </>
  );
}
