import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('v');

  if (!videoId) {
    return NextResponse.redirect('https://app.chatpye.com');
  }

  // Redirect to the main app with the video ID
  return NextResponse.redirect(`https://app.chatpye.com?videoId=${videoId}`);
} 