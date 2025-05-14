import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Handle chatpyeyoutube.com redirects
  if (hostname.includes('chatpyeyoutube.com')) {
    const path = url.pathname;
    const searchParams = url.searchParams;
    
    // Extract video ID from various formats
    let videoId = searchParams.get('v');
    
    if (!videoId) {
      const pathParts = path.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        if (pathParts[0] === 'v' && pathParts[1]) {
          videoId = pathParts[1];
        } else if (pathParts[0].startsWith('watch')) {
          videoId = pathParts[0].replace('watch', '');
        } else {
          videoId = pathParts[0];
        }
      }
    }

    if (videoId) {
      return NextResponse.redirect(`https://app.chatpye.com?videoId=${videoId}`);
    }
  }

  // Handle chatpye.com redirect to app.chatpye.com
  if (hostname === 'chatpye.com') {
    return NextResponse.redirect(`https://app.chatpye.com${url.pathname}${url.search}`);
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