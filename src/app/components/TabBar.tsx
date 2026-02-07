'use client';

interface TabBarProps {
  activeTab: string;
  tabs: string[];
  onTabChange: (tab: string) => void;
}

export default function TabBar({ activeTab, tabs, onTabChange }: TabBarProps) {
  return (
    <div className="flex gap-1 bg-gray-800/50 backdrop-blur-sm p-1 rounded-xl border border-gray-700">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={[
            'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === tab
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700',
          ].join(' ')}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
