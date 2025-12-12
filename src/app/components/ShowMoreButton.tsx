'use client';

interface ShowMoreButtonProps {
  expanded: boolean;
  toggleExpanded: () => void;
  totalCount: number;
  visibleCount: number;
  itemName?: string; // Optional item name (e.g., "hashes")
}

export default function ShowMoreButton({
  expanded,
  toggleExpanded,
  totalCount,
  visibleCount,
  itemName = 'items', // Default to "items" if not specified
}: ShowMoreButtonProps) {
  const hiddenCount = totalCount - visibleCount;

  return (
    <div className="relative">
      {/* Gradient overlay to indicate there's more content (only when not expanded) */}
      {!expanded && (
        <div className="absolute bottom-full left-0 right-0 h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
      )}

      <div className="mt-2 pt-2 border-t border-gray-700">
        <button
          onClick={toggleExpanded}
          className="px-4 py-1.5 text-sm bg-blue-500/30 border border-blue-500/50 rounded-md text-blue-300 hover:text-blue-200 hover:bg-blue-500/40 transition-colors flex items-center shadow-sm"
        >
          {expanded ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
              Show Less
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              Show {hiddenCount} More {itemName}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
