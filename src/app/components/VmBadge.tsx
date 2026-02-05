'use client';

import { VM } from '@/types/teamVault';

interface VmBadgeProps {
  vm: VM;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

/**
 * VM Badge Component
 * Displays a VM with color coding based on scope
 * - Global VMs: Blue badge
 * - Team-specific VMs: Green badge
 */
export default function VmBadge({ vm, size = 'sm', showTooltip = true }: VmBadgeProps) {
  const isGlobal = vm.scope === 'global';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const colorClasses = isGlobal
    ? 'bg-blue-900/60 text-blue-200 border-blue-700'
    : 'bg-green-900/60 text-green-200 border-green-700';

  const tooltipContent = [
    vm.name,
    vm.ipAddress && `IP: ${vm.ipAddress}`,
    vm.osType && `OS: ${vm.osType}`,
    isGlobal ? 'Global VM' : `Team-specific: ${vm.teamId}`,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <span
      className={`inline-flex items-center rounded border ${sizeClasses[size]} ${colorClasses} font-medium cursor-default transition-all hover:opacity-80`}
      title={showTooltip ? tooltipContent : undefined}
    >
      <span className="mr-1.5">
        {isGlobal ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
      <span className="truncate max-w-[120px]">{vm.id}</span>
    </span>
  );
}

/**
 * VM Badge Group Component
 * Displays multiple VM badges in a row with overflow handling
 */
interface VmBadgeGroupProps {
  vms: VM[];
  maxVisible?: number;
  size?: 'sm' | 'md';
}

export function VmBadgeGroup({ vms, maxVisible = 3, size = 'sm' }: VmBadgeGroupProps) {
  if (!vms || vms.length === 0) {
    return <span className="text-gray-500 text-xs italic">No VMs assigned</span>;
  }

  const visible = vms.slice(0, maxVisible);
  const hidden = vms.slice(maxVisible);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map(vm => (
        <VmBadge key={vm.id} vm={vm} size={size} />
      ))}
      {hidden.length > 0 && (
        <span
          className="inline-flex items-center px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300 border border-gray-600 cursor-default"
          title={hidden.map(vm => `${vm.id} (${vm.scope})`).join(', ')}
        >
          +{hidden.length} more
        </span>
      )}
    </div>
  );
}
