import fs from 'fs';

import { NextResponse } from 'next/server';

import { logger } from '../../../utils/logger';

export async function GET() {
  try {
    const logs = await logger.getLogContent(1000); // Get last 1000 lines
    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    fs.writeFileSync('logs\hash-cracker.log', ''); // Clear the log file
    return NextResponse.json({ message: 'Logs cleared successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to clear logs' }, { status: 500 });
  }
}
