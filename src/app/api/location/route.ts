import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Vercel automatically sets these headers in production.
  // In local dev they'll be null, which is fine.
  const country  = request.headers.get('x-vercel-ip-country')       ?? null;
  const region   = request.headers.get('x-vercel-ip-country-region') ?? null;
  const city     = request.headers.get('x-vercel-ip-city')           ?? null;
  const timezone = request.headers.get('x-vercel-ip-timezone')       ?? null;

  return NextResponse.json({ country, region, city, timezone });
}
