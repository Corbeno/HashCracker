import { HashcatMode } from '@/config/config';
import { HashType } from '@/config/hashTypes';
import { HashResult, HashcatStatusJson } from '@/utils/hashUtils';

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'queued'
  | 'cancelled'
  | 'exhausted';

export interface DebugInfo {
  command: string;
  output: string[];
  error: string | string[];
  statusJson?: HashcatStatusJson;
}

export interface Job {
  id: string;
  hashes: string[];
  type: HashType;
  mode: HashcatMode;
  status: JobStatus;
  startTime: string;
  endTime?: string;
  results?: HashResult[];
  debugInfo?: DebugInfo;
}
