import { spawn } from 'child_process';
import * as child_process from 'child_process';
import EventEmitter from 'events';
import * as fsSync from 'fs';
import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import readline from 'readline';

import { DebugInfo, JobStatus } from './jobQueue';
import { logger } from './logger';

import config from '@/config';
import { HashcatMode } from '@/config/config';
import { HashType } from '@/config/hashTypes';

export interface CrackedHash {
  hash: string;
  password: string;
}

export interface HashcatStatusJson {
  session: string;
  guess: {
    guess_base: string;
    guess_base_count: number;
    guess_base_offset: number;
    guess_base_percent: number;
    guess_mask_length: number;
    guess_mod: null | string;
    guess_mod_count: number;
    guess_mod_offset: number;
    guess_mod_percent: number;
    guess_mode: number;
  };
  status: number; // 3 = running, 5 = exhausted, 6 = cracked, 7 = aborted, 8 = quit
  target: string;
  progress: number[];
  restore_point: number;
  recovered_hashes: number[];
  recovered_salts: number[];
  rejected: number;
  devices: Array<{
    device_id: number;
    device_name: string;
    device_type: string;
    speed: number;
    temp: number;
    util: number;
  }>;
  time_start: number;
  estimated_stop: number;
}

function getPrettyCommand(command: string, args: string[]): string {
  return [command, ...args].join(' ').replace(/\\/g, '/');
}

export function readCrackedHashes(): CrackedHash[] {
  const crackedFile = path.join(config.hashcat.dirs.hashes, 'cracked.txt');

  if (!fsSync.existsSync(crackedFile)) {
    return [];
  }

  try {
    const content = fsSync.readFileSync(crackedFile, 'utf8');
    const results = content
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [hash, password] = line.split(':');
        return { hash, password };
      });

    return results;
  } catch (error) {
    logger.error('Error reading cracked file:', error);
    return [];
  }
}

function findInCrackedFileOrPotfile(hashes: string[]): CrackedHash[] {
  const crackedFile = path.join(config.hashcat.dirs.hashes, 'cracked.txt');
  const potfilePath =
    config.hashcat.potfilePath || path.join(config.hashcat.dirs.hashes, 'hashcat.potfile');
  const hashesSet = new Set(hashes.map(h => h.toLowerCase()));

  if (!fsSync.existsSync(crackedFile) && !fsSync.existsSync(potfilePath)) {
    return [];
  }

  try {
    const crackedContent = fsSync.readFileSync(crackedFile, 'utf8');
    const potfileContent = fsSync.readFileSync(potfilePath, 'utf8');
    const results = [
      ...crackedContent
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [crackedHash, password] = line.split(':');
          return { hash: crackedHash, password } as CrackedHash;
        }),
      ...potfileContent
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [potfileHash, password] = line.split(':');
          return { hash: potfileHash, password } as CrackedHash;
        }),
    ];

    // Filter results and remove duplicates
    const filteredResults = results.filter(r => hashesSet.has(r.hash.toLowerCase()));
    // Remove duplicates by creating a Map keyed by hash
    const uniqueResults = Array.from(
      new Map(filteredResults.map(item => [item.hash.toLowerCase(), item])).values()
    );

    return uniqueResults;
  } catch (error) {
    logger.error('Error reading cracked file:', error);
    return [];
  }
}

function addHashesToCrackedFile(crackedHashes: CrackedHash[]): void {
  const crackedFile = path.join(config.hashcat.dirs.hashes, 'cracked.txt');
  const existingHashes = new Set(readCrackedHashes().map(h => h.hash));
  const newHashes = crackedHashes.filter(h => !existingHashes.has(h.hash));
  if (newHashes.length > 0) {
    fsSync.appendFileSync(
      crackedFile,
      '\n' + newHashes.map(h => `${h.hash}:${h.password}`).join('\n')
    );
  }
}

export interface HashResult {
  hash: string;
  password: string | null;
}

export interface CrackResult {
  results: HashResult[];
  status: JobStatus;
  debugInfo: DebugInfo;
}

export class HashCracker extends EventEmitter {
  async execute(hashes: string[], type: HashType, mode: HashcatMode): Promise<CrackResult> {
    if (!config.hashcat.path) {
      throw new Error('Hashcat path not configured. Please set HASHCAT_PATH in .env');
    }
    //TODO ideally want to get rid of this and just let hashcat figure it out
    // Check if hashes are already cracked
    const existingResults = findInCrackedFileOrPotfile(hashes);
    const hashesToCrack = hashes.filter(h => !existingResults.some(r => r.hash === h));
    if (existingResults.length === hashes.length) {
      // Add hashes that aren't there already to cracked.txt manually
      addHashesToCrackedFile(existingResults);
      return {
        results: existingResults,
        status: 'completed',
        debugInfo: {
          command: 'N/A',
          output: [
            `Hashes found in cracked.txt or potfile: ${existingResults
              .map(r => `${r.hash}:${r.password}`)
              .join('\n')}`,
          ],
          error: [],
        },
      } as CrackResult;
    }
    // Replace with this?
    // const hashesToCrack = hashes;
    // const existingResults = findInCrackedFileOrPotfile(hashes);

    const hashcatPath = config.hashcat.path;
    const hashcatDir = path.dirname(hashcatPath);
    const hashesDir = config.hashcat.dirs.hashes;
    const crackedFile = path.join(hashesDir, 'cracked.txt');

    // Ensure directories exist
    fsSync.mkdirSync(hashesDir, { recursive: true });
    fsSync.mkdirSync(path.dirname(crackedFile), { recursive: true });

    // Write hashes to temporary file
    const hashFile = path.join(hashesDir, `${crypto.randomUUID()}.hash`);
    fsSync.writeFileSync(hashFile, hashesToCrack.join('\n'));
    logger.debug(`Hashes written to temporary file: ${hashFile}`);

    // Build base command
    let args = [
      '-m',
      type.id.toString(),
      '-a',
      (mode.attackMode ?? 0).toString(),
      '-o',
      crackedFile,
      '--potfile-path',
      config.hashcat.potfilePath || path.join(hashesDir, 'hashcat.potfile'),
      '--status',
      '--status-json',
      `--status-timer=${config.hashcat.statusTimer}`,
      hashFile,
    ];

    // Add mode-specific arguments
    if (mode.wordlist) {
      const wordlistPath = path.join(config.hashcat.dirs.wordlists, mode.wordlist);
      if (!fsSync.existsSync(wordlistPath)) {
        throw new Error(`Wordlist not found: ${mode.wordlist}`);
      }
      args.push(wordlistPath);
    }

    if (mode.rules) {
      for (const rule of mode.rules) {
        if (!fsSync.existsSync(path.join(config.hashcat.dirs.rules, rule))) {
          throw new Error(`Rule not found: ${rule}`);
        }
        const rulePath = path.join(config.hashcat.dirs.rules, rule);
        args.push('-r', rulePath);
      }
    }

    if (mode.mask) {
      const maskPath = path.join(config.hashcat.dirs.masks, mode.mask);
      if (!fsSync.existsSync(maskPath)) {
        throw new Error(`Mask file not found: ${mode.mask}`);
      }
      const maskContent = fsSync
        .readFileSync(maskPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      // First line is the mask pattern
      const pattern = maskContent[0];
      args.push(pattern);

      // Remaining lines are custom charsets
      for (let i = 1; i < maskContent.length; i++) {
        const [index, charset] = maskContent[i].split(' ');
        args.push(index, charset);
      }
    }
    logger.debug(`Hashcat arguments built: ${args.join(' ')}`);

    // Kill any existing hashcat processes
    const { wasRunning, terminated, count: _count, errors } = await terminateHashcat();

    if (wasRunning && !terminated) {
      throw new Error(`Failed to kill existing hashcat processes: ${errors.join(', ')}`);
    }
    if (terminated) {
      logger.debug('Termiated existing hashcat process');
    } else {
      logger.debug('No existing hashcat processes found');
    }

    logger.debug(`Starting hashcat with command: ${args.join(' ')}`);

    return new Promise<CrackResult>((resolve, reject) => {
      // Start the hashcat process
      const hashcat = spawn(hashcatPath, args, {
        cwd: hashcatDir,
        env: {
          ...process.env,
          PATH: `${hashcatDir}${path.delimiter}${process.env.PATH || ''}`,
        },
        stdio: ['pipe', 'pipe', 'pipe'], // Explicitly define stdio to ensure stdin is available
      });

      const debugInfo = {
        command: `${hashcatPath} ${args.join(' ')}`,
        output: [],
        error: [],
        progress: 0,
        statusJson: undefined,
      } as DebugInfo;

      // Counter for regular output lines
      let outputLineCounter = 0;
      const outputBatchSize = 5;

      const stdoutReadLine = readline.createInterface({
        input: hashcat.stdout,
        crlfDelay: Infinity,
      });
      stdoutReadLine.on('line', line => {
        try {
          const cleanedJSON = line.replace(/([A-Z]:\\[^"]+?)(?="|,|})/g, match => {
            // Replace each single backslash with a double backslash
            return match.replace(/\\/g, '\\\\');
          });
          const json = JSON.parse(cleanedJSON);

          if (json.progress) {
            debugInfo.statusJson = json;
            // Always emit immediately for JSON status updates
            this.emit('debug', debugInfo);
          }
          return;
        } catch (e) {
          // Failed to parse as JSON, treat as regular output
          // logger.debug("Failed to parse JSON: " + e);
        }

        // Not JSON format, add to regular output
        if (
          line.trim() === '' ||
          line.trim().includes('[s]tatus [p]ause [b]ypass [c]heckpoint [f]inish [q]uit =>')
        ) {
          // Skip useless output
          return;
        }
        debugInfo.output.push(line);
        logger.debug(line);
        outputLineCounter++;

        // Only emit debug event every 5 lines for regular output
        if (outputLineCounter >= outputBatchSize) {
          this.emit('debug', debugInfo);
          outputLineCounter = 0;
        }
      });

      const stdErrReadLine = readline.createInterface({
        input: hashcat.stderr,
        crlfDelay: Infinity,
      });
      stdErrReadLine.on('line', line => {
        debugInfo.output.push(`[ERROR] ${line}`);
        logger.error(`Hashcat stderr: ${line}`);
        // Always emit immediately for error messages
        this.emit('debug', debugInfo);
      });

      hashcat.on('close', code => {
        logger.debug('hashcat closed with code: ' + code);
        // Make sure to emit any remaining buffered output
        if (outputLineCounter > 0) {
          this.emit('debug', debugInfo);
        }

        // Clean up temporary hash file
        try {
          fsSync.unlinkSync(hashFile);
        } catch (error) {
          logger.error(`Failed to delete hash file: ${hashFile}`, error);
        }

        const content = fsSync.readFileSync(crackedFile, 'utf8');
        const results = content
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => {
            const [crackedHash, password] = line.split(':');
            return { hash: crackedHash, password };
          });

        const crackedResults = results.filter(result =>
          hashesToCrack.includes(result.hash.toLowerCase())
        );
        if (code !== 0 && code !== 1) {
          reject(new Error(`Hashcat process exited with unexpected code ${code}`));
        }

        resolve({
          results: crackedResults,
          status: hashcatStatusToJobStatus(debugInfo.statusJson?.status || 0),
          debugInfo,
        });
      });
    });
  }
}

/**
From hashcat status.c: 
static const char *const  ST_0000 = "Initializing";
static const char *const  ST_0001 = "Autotuning";
static const char *const  ST_0002 = "Selftest";
static const char *const  ST_0003 = "Running";
static const char *const  ST_0004 = "Paused";
static const char *const  ST_0005 = "Exhausted";
static const char *const  ST_0006 = "Cracked";
static const char *const  ST_0007 = "Aborted";
static const char *const  ST_0008 = "Quit";
static const char *const  ST_0009 = "Bypass";
static const char *const  ST_0010 = "Aborted (Checkpoint)";
static const char *const  ST_0011 = "Aborted (Runtime)";
static const char *const  ST_0012 = "Running (Checkpoint Quit requested)";
static const char *const  ST_0013 = "Error";
static const char *const  ST_0014 = "Aborted (Finish)";
static const char *const  ST_0015 = "Running (Quit after attack requested)";
static const char *const  ST_0016 = "Autodetect";
static const char *const  ST_9999 = "Unknown! Bug!";
 */
function hashcatStatusToJobStatus(status: number): JobStatus {
  logger.debug('Hashcat final status: ' + status);
  switch (status) {
    case 5:
      return 'exhausted';
    case 6:
      return 'completed';
    case 7:
      return 'cancelled';
    case 8:
      return 'cancelled';
    default:
      return 'failed';
  }
}

/**
 * Checks if hashcat is running on the current system
 * @returns {Promise<boolean>} True if hashcat is running, false otherwise
 */
async function isHashcatRunning(): Promise<boolean> {
  const platform = os.platform();

  return new Promise(resolve => {
    let command: string;
    let args: string[];

    // Determine command based on platform
    if (platform === 'win32') {
      command = 'tasklist';
      args = ['/FI', 'IMAGENAME eq hashcat*', '/NH'];
    } else if (platform === 'linux' || platform === 'darwin') {
      command = 'pgrep';
      args = ['-l', 'hashcat'];
    } else {
      console.error(`Unsupported platform: ${platform}`);
      resolve(false);
      return;
    }

    // Execute the command
    const childProcess = child_process.spawn(command, args);
    let stdout = '';

    childProcess.stdout.on('data', data => {
      stdout += data.toString();
    });

    childProcess.on('close', code => {
      if (platform === 'win32') {
        // On Windows, check if the output contains information about hashcat
        resolve(stdout.toLowerCase().includes('hashcat'));
      } else {
        // On Linux/macOS, check if pgrep returned any processes
        resolve(stdout.trim().length > 0);
      }
    });

    childProcess.on('error', err => {
      console.error(`Error executing command: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * Gets the process IDs of running hashcat instances
 * @returns {Promise<string[]>} Array of process IDs
 */
async function getHashcatProcessIds(): Promise<string[]> {
  const platform = os.platform();

  return new Promise(resolve => {
    let command: string;
    let args: string[];

    if (platform === 'win32') {
      command = 'wmic';
      args = ['process', 'where', "name like '%hashcat%'", 'get', 'processid', '/FORMAT:CSV'];
    } else if (platform === 'linux' || platform === 'darwin') {
      command = 'pgrep';
      args = ['hashcat'];
    } else {
      console.error(`Unsupported platform: ${platform}`);
      resolve([]);
      return;
    }

    const childProcess = child_process.spawn(command, args);
    let stdout = '';

    childProcess.stdout.on('data', data => {
      stdout += data.toString();
    });

    childProcess.on('close', code => {
      if (platform === 'win32') {
        // Parse Windows WMIC CSV output
        const lines = stdout.trim().split('\n');
        const pids: string[] = [];

        // Skip the header line
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 2) {
            const pid = parts[parts.length - 1].trim();
            if (pid && /^\d+$/.test(pid)) {
              pids.push(pid);
            }
          }
        }
        resolve(pids);
      } else {
        // Parse Linux/macOS pgrep output
        const pids = stdout
          .trim()
          .split('\n')
          .filter(line => line.length > 0);
        resolve(pids);
      }
    });

    childProcess.on('error', err => {
      console.error(`Error getting process IDs: ${err.message}`);
      resolve([]);
    });
  });
}

/**
 * Kills all running hashcat processes
 * @returns {Promise<{success: boolean, count: number, errors: string[]}>} Result of the operation
 */
async function killHashcatProcesses(): Promise<{
  success: boolean;
  count: number;
  errors: string[];
}> {
  const platform = os.platform();
  const pids = await getHashcatProcessIds();
  const errors: string[] = [];
  let killedCount = 0;

  if (pids.length === 0) {
    return { success: true, count: 0, errors: [] };
  }

  const killPromises = pids.map(pid => {
    return new Promise<boolean>(resolve => {
      let command: string;
      let args: string[];

      if (platform === 'win32') {
        command = 'taskkill';
        args = ['/F', '/PID', pid];
      } else {
        command = 'kill';
        args = ['-9', pid];
      }

      const childProcess = child_process.spawn(command, args);

      childProcess.on('close', code => {
        if (code === 0) {
          killedCount++;
          resolve(true);
        } else {
          errors.push(`Failed to kill process ${pid} (exit code: ${code})`);
          resolve(false);
        }
      });

      childProcess.on('error', err => {
        errors.push(`Error killing process ${pid}: ${err.message}`);
        resolve(false);
      });
    });
  });

  await Promise.all(killPromises);

  return {
    success: errors.length === 0,
    count: killedCount,
    errors,
  };
}

/**
 * Main function to detect and kill hashcat processes
 */
export async function terminateHashcat(): Promise<{
  wasRunning: boolean;
  terminated: boolean;
  count: number;
  errors: string[];
}> {
  try {
    const running = await isHashcatRunning();

    if (!running) {
      return {
        wasRunning: false,
        terminated: false,
        count: 0,
        errors: [],
      };
    }

    const killResult = await killHashcatProcesses();

    return {
      wasRunning: true,
      terminated: killResult.success,
      count: killResult.count,
      errors: killResult.errors,
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      wasRunning: false,
      terminated: false,
      count: 0,
      errors: [`Unexpected error: ${errorMessage}`],
    };
  }
}

export async function readPotfile(): Promise<string> {
  try {
    const potfilePath =
      config.hashcat.potfilePath || path.join(config.hashcat.dirs.hashes, 'hashcat.potfile');

    // Create the file if it doesn't exist
    if (!fsSync.existsSync(potfilePath)) {
      fsSync.writeFileSync(potfilePath, '');
    }

    // Read the potfile
    const content = await fs.promises.readFile(potfilePath, 'utf8');
    return content;
  } catch (error) {
    logger.error(`Error reading potfile: ${error}`);
    return '';
  }
}
