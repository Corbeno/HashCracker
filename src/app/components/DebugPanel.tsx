import { CrackedHash } from '@/utils/hashUtils';
import { HashJob } from '@/utils/jobQueue';

interface DebugPanelProps {
  job: HashJob;
}

export default function DebugPanel({ job }: DebugPanelProps) {
  if (!job.debugInfo) return null;

  // Calculate progress percentage from statusJson if available
  const progressPercentage = job.debugInfo.statusJson?.progress
    ? ((job.debugInfo.statusJson.progress[0] / job.debugInfo.statusJson.progress[1]) * 100).toFixed(
        2
      )
    : null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
      {job.debugInfo.command && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Command</h3>
          <pre className="bg-gray-900/50 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap break-all text-gray-300">
            {job.debugInfo.command}
          </pre>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">New hashes cracked this run</h3>
        <div className="space-y-2">
          {job.results?.map((result: CrackedHash, i: number) => (
            <div key={i} className="font-mono text-sm">
              <span className="text-gray-400">{result.hash}</span>
              {result.password && (
                <>
                  <span className="text-gray-500 mx-2">→</span>
                  <span className="text-green-400">{result.password}</span>
                </>
              )}
            </div>
          ))}
          {job.results?.length === 0 && <div className="text-white text-sm">Results</div>}
        </div>
      </div>

      {job.debugInfo.statusJson && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
          <div className="bg-gray-900/50 p-3 rounded-lg">
            {progressPercentage && (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress:</span>
                  <span className="text-blue-400">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${Math.min(parseFloat(progressPercentage), 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Total Passwords:</span>
                  <span className="text-gray-300">
                    {job.debugInfo.statusJson.progress
                      ? job.debugInfo.statusJson.progress[1].toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {job.debugInfo.statusJson.devices && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-400 mb-1">Device Information</h4>
                <div className="space-y-2">
                  {job.debugInfo.statusJson.devices.map((device: any, i: number) => (
                    <div key={i} className="text-sm grid grid-cols-2 gap-2">
                      <div className="text-gray-400">Device:</div>
                      <div className="text-gray-300">{device.device_name}</div>

                      <div className="text-gray-400">Speed:</div>
                      <div className="text-gray-300">
                        {(device.speed / 1000000).toFixed(2)} MH/s
                      </div>

                      <div className="text-gray-400">Temperature:</div>
                      <div className="text-gray-300">{device.temp}°C</div>

                      <div className="text-gray-400">Utilization:</div>
                      <div className="text-gray-300">{device.util}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job.debugInfo.statusJson.time_start && job.debugInfo.statusJson.estimated_stop && (
              <div className="text-sm grid grid-cols-2 gap-2">
                <div className="text-gray-400">Started:</div>
                <div className="text-gray-300">
                  {new Date(job.debugInfo.statusJson.time_start * 1000).toLocaleString()}
                </div>

                <div className="text-gray-400">Estimated Completion:</div>
                <div className="text-gray-300">
                  {new Date(job.debugInfo.statusJson.estimated_stop * 1000).toLocaleString()}
                </div>

                <div className="text-gray-400">Estimated Time Remaining:</div>
                <div className="text-gray-300">
                  {formatTimeRemaining(
                    job.debugInfo.statusJson.estimated_stop - Math.floor(Date.now() / 1000)
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {job.debugInfo.output?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Output</h3>
          <pre className="bg-gray-900/50 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto text-gray-300">
            {job.debugInfo.output.join('\n')}
          </pre>
        </div>
      )}

      {job.debugInfo.error?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-red-400 mb-2">Error</h3>
          <pre className="bg-gray-900/50 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap text-red-400">
            {typeof job.debugInfo.error === 'string'
              ? job.debugInfo.error
              : job.debugInfo.error.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
}

// Helper function to format time remaining in a human-readable format
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Complete';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
}
