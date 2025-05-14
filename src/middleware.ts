import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the hostname (e.g. chatpye.com, app.chatpye.com)
  const hostname = request.headers.get('host') || '';
  
  // If we're on the main domain, redirect to the app subdomain
  if (hostname === 'chatpye.com') {
    const url = request.nextUrl.clone();
    url.host = 'app.chatpye.com';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 