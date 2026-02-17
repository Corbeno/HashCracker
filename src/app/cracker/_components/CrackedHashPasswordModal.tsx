import { HashVaultEntry } from '@/types/hashVault';

interface CrackedHashPasswordModalProps {
  crackedHashes: HashVaultEntry[];
  onClose: () => void;
}

function buildHashPasswordText(crackedHashes: HashVaultEntry[]): string {
  if (crackedHashes.length === 0) {
    return 'No cracked hashes yet.';
  }

  return crackedHashes.map(entry => `${entry.hash} -> ${entry.password}`).join('\n');
}

export default function CrackedHashPasswordModal({
  crackedHashes,
  onClose,
}: CrackedHashPasswordModalProps) {
  const content = buildHashPasswordText(crackedHashes);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
      data-testid="cracked-pairs-modal"
    >
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Cracked Hashes and Passwords</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded-md border border-gray-600"
            aria-label="Close"
            data-testid="cracked-pairs-close"
          >
            Close
          </button>
        </div>
        <div className="p-4 overflow-auto flex-grow">
          <textarea
            readOnly
            value={content}
            className="w-full h-[55vh] font-mono text-sm whitespace-pre bg-gray-900 p-4 rounded-lg text-gray-100"
            data-testid="cracked-pairs-content"
          />
        </div>
      </div>
    </div>
  );
}
