import { spawn } from 'child_process';
import path from 'path';

import { NextResponse } from 'next/server';

import config from '@/config';
import { parseHashcatMachineReadableBenchmark } from '@/utils/hashcatBenchmark';
import { logger } from '@/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const hashTypeParam = url.searchParams.get('hashType');
    const hashType = hashTypeParam ? parseInt(hashTypeParam, 10) : null;

    if (!config.hashcat.path) {
      return NextResponse.json(
        { error: 'Hashcat path not configured. Please set HASHCAT_PATH in .env' },
        { status: 500 }
      );
    }

    const hashcatPath = config.hashcat.path;
    const hashcatDir = path.dirname(hashcatPath);

    // Build command args for benchmarking
    const args = [
      '--benchmark',
      '-O', // Optimized kernel
      '--machine-readable',
    ];

    // If a specific hash type is requested, add it to the args
    if (hashType !== null) {
      args.push('-m', hashType.toString());
    }

    logger.debug(`Starting hashcat benchmark with command: ${args.join(' ')}`);

    return new Promise<NextResponse>(resolve => {
      const hashcat = spawn(hashcatPath, args, {
        cwd: hashcatDir,
        env: {
          ...process.env,
          PATH: `${hashcatDir}${path.delimiter}${process.env.PATH || ''}`,
        },
      });

      let stdout = '';
      let stderr = '';

      hashcat.stdout.on('data', data => {
        stdout += data.toString();
      });

      hashcat.stderr.on('data', data => {
        stderr += data.toString();
      });

      hashcat.on('close', code => {
        logger.debug(`hashcat benchmark completed with code ${code}`);

        // Hashcat returns code 1 sometimes for benchmarks, so we accept both 0 and 1
        if (code !== 0 && code !== 1) {
          resolve(
            NextResponse.json(
              { error: `Benchmark failed with exit code ${code}`, stderr },
              { status: 500 }
            )
          );
          return;
        }

        try {
          logger.debug(`Benchmark stdout: ${stdout}`);
          const results = parseHashcatMachineReadableBenchmark(stdout);

          // Log the results for debugging
          logger.debug(`Parsed benchmark results: ${JSON.stringify(results)}`);

          resolve(NextResponse.json({ results }));
        } catch (error) {
          logger.error('Error parsing benchmark results:', error);
          resolve(
            NextResponse.json(
              { error: 'Failed to parse benchmark results', stdout, stderr },
              { status: 500 }
            )
          );
        }
      });

      hashcat.on('error', error => {
        logger.error('Error starting hashcat benchmark:', error);
        resolve(
          NextResponse.json({ error: `Failed to start hashcat: ${error.message}` }, { status: 500 })
        );
      });
    });
  } catch (error) {
    logger.error('Unexpected error in benchmark API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
