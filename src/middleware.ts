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
  const path = url.pathname;
  const search = url.search;

  // Handle www subdomain first
  if (hostname.startsWith('www.')) {
    const newHostname = hostname.replace('www.', '');
    return NextResponse.redirect(new URL(`https://${newHostname}${path}${search}`));
  }

  // Handle HTTP to HTTPS
  if (url.protocol === 'http:') {
    return NextResponse.redirect(new URL(`https://${hostname}${path}${search}`));
  }

  // Handle chatpye.com -> app.chatpye.com
  if (hostname === 'chatpye.com') {
    return NextResponse.redirect(new URL(`https://app.chatpye.com${path}${search}`));
  }

  // Handle chatpyeyoutube.com -> app.chatpye.com
  if (hostname === 'chatpyeyoutube.com') {
    // Check if there's a video ID in the URL
    const videoId = extractVideoId(url.toString());
    if (videoId) {
      // Redirect to app.chatpye.com with the video ID
      return NextResponse.redirect(new URL(`https://app.chatpye.com?videoId=${videoId}`));
    }
    // If no video ID, just redirect to main app
    return NextResponse.redirect(new URL(`https://app.chatpye.com${path}${search}`));
  }

  // Handle direct YouTube URLs on app.chatpye.com
  if (hostname === 'app.chatpye.com') {
    const videoId = extractVideoId(url.toString());
    if (videoId && !url.searchParams.has('videoId')) {
      return NextResponse.redirect(new URL(`https://app.chatpye.com?videoId=${videoId}`));
    }
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