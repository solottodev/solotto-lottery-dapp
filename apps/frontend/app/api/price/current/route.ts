import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const url = `${backend.replace(/\/$/, '')}/api/v1/price/current`;

  const auth = req.headers.get('authorization');

  console.log('[API Route /api/price/current] Proxying request to:', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
  });

  const text = await res.text();
  console.log('[API Route /api/price/current] Response status:', res.status);
  console.log('[API Route /api/price/current] Response body:', text);

  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
  });
}
