import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Extract video ID from various formats:
    // 1. chatpyeyoutube.com/watch?v=VIDEO_ID
    // 2. chatpyeyoutube.com/v/VIDEO_ID
    // 3. chatpyeyoutube.com/VIDEO_ID
    // 4. chatpyeyoutube.com/watchVIDEO_ID
    // 5. youtu.be/VIDEO_ID
    let videoId = url.searchParams.get('v');
    
    if (!videoId) {
      // Try to extract from path
      const pathParts = path.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        // Handle /v/VIDEO_ID format
        if (pathParts[0] === 'v' && pathParts[1]) {
          videoId = pathParts[1];
        } 
        // Handle /watchVIDEO_ID format
        else if (pathParts[0].startsWith('watch')) {
          videoId = pathParts[0].replace('watch', '');
        }
        // Handle direct VIDEO_ID format
        else {
          videoId = pathParts[0];
        }
      }
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID not found in URL' },
        { status: 400 }
      );
    }

    // Redirect to the main app with the video ID
    return NextResponse.redirect(`https://app.chatpye.com?videoId=${videoId}`);
  } catch (error) {
    console.error('Error handling YouTube redirect:', error);
    return NextResponse.json(
      { error: 'Failed to process redirect' },
      { status: 500 }
    );
  }
} 