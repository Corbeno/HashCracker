import React, { useEffect, useState } from 'react';

interface PotfileModalProps {
  onClose: () => void;
}

export default function PotfileModal({ onClose }: PotfileModalProps) {
  const [content, setContent] = useState<string | null>(null);

  const fetchPotfileContent = async () => {
    try {
      const response = await fetch('/api/potfile');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      console.error('Error fetching potfile content:', error);
      setContent(null);
    }
  };

  useEffect(() => {
    fetchPotfileContent();
  }, []);

  const displayContent = content === null ? 'Loading...' : content || 'No content in potfile yet.';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Potfile Contents</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-4 overflow-auto flex-grow">
          <pre className="font-mono text-sm whitespace-pre-wrap break-all bg-gray-900 p-4 rounded-lg h-full overflow-auto">
            {displayContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
