'use client';

import Link from 'next/link';

interface TabBarProps {
  activePath: string;
  tabs: Array<{
    label: string;
    href: string;
  }>;
}

export default function TabBar({ activePath, tabs }: TabBarProps) {
  return (
    <div className="flex gap-1 bg-gray-800/50 backdrop-blur-sm p-1 rounded-xl border border-gray-700">
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={[
            'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center',
            activePath === tab.href
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700',
          ].join(' ')}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
