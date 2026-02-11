export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-400';
    case 'failed':
      return 'text-red-400';
    case 'running':
      return 'text-blue-400';
    case 'queued':
      return 'text-yellow-400';
    case 'cancelled':
      return 'text-gray-400';
    case 'exhausted':
      return 'text-orange-400';
    default:
      return 'text-gray-400';
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'running':
      return 'Running';
    case 'pending':
      return 'Queued';
    case 'cancelled':
      return 'Cancelled';
    case 'exhausted':
      return 'Exhausted';
    default:
      return status;
  }
}
