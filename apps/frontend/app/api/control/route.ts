import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const url = `${backend.replace(/\/$/, '')}/api/v1/control`;

  const auth = req.headers.get('authorization');
  const body = await req.text();

  console.log('[API Route /api/control] Proxying request to:', url);
  console.log('[API Route /api/control] Request body:', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
    body,
  });

  const text = await res.text();
  console.log('[API Route /api/control] Response status:', res.status);
  console.log('[API Route /api/control] Response body:', text);

  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
  });
}
