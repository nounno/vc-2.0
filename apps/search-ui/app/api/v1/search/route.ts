import { NextRequest, NextResponse } from 'next/server';

const DATACENTER_URL = process.env.NEXT_PUBLIC_DATACENTER_URL || 'http://vc2_datacenter:8003';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const limit = searchParams.get('limit') || '20';

  if (!q) {
    return NextResponse.json({ error: 'q parameter required' }, { status: 400 });
  }

  try {
    const url = `${DATACENTER_URL}/api/v1/search?q=${encodeURIComponent(q)}&limit=${limit}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Datacenter error' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[search-ui] Datacenter proxy error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
