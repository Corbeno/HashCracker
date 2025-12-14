import { NextRequest, NextResponse } from 'next/server';

import { readPotfile } from '@/utils/hashUtils';

export async function GET(_req: NextRequest) {
  try {
    const potfileContent = await readPotfile();
    return NextResponse.json({ success: true, content: potfileContent });
  } catch (error) {
    console.error('Error reading potfile:', error);
    return NextResponse.json({ success: false, error: 'Failed to read potfile' }, { status: 500 });
  }
}
