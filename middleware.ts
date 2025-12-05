import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Middleware is optional - authentication is handled in individual API routes
  // This allows for more granular control per endpoint
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};

