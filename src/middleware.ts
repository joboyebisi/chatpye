import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Function to extract video ID from various YouTube URL formats
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*&v=)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtube\.com\/watch\?.*feature=share.*v=([^&\n?#]+)/,
    /youtube\.com\/watch\?.*t=.*v=([^&\n?#]+)/,
    /youtube\.com\/watch\?.*list=.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Check for video ID in path segments
  const pathSegments = url.split('/').filter(Boolean);
  for (const segment of pathSegments) {
    if (/^[a-zA-Z0-9_-]{11}$/.test(segment)) {
      return segment;
    }
  }

  return null;
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Handle HTTP to HTTPS
  if (url.protocol === 'http:') {
    return NextResponse.redirect(new URL(`https://${hostname}${url.pathname}${url.search}`));
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
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