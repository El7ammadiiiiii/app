import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exchange = searchParams.get('exchange');
  const endpoint = searchParams.get('endpoint');

  if (!exchange || !endpoint) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // 🛠️ دعم طلب الـ Ping لفحص صحة المنصة
  if (endpoint === 'ping') {
    return NextResponse.json({ status: 'online', exchange });
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Exchange API responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`CEX Proxy Error (${exchange}):`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
