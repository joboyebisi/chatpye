import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const youtube = google.youtube('v3');

export async function POST(req: Request) {
  try {
    const { youtubeUrl } = await req.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoId = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];

    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Get video details
    const response = await youtube.videos.list({
      part: ['snippet', 'statistics'],
      id: [videoId],
      key: process.env.YOUTUBE_API_KEY,
    });

    const video = response.data.items?.[0];
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const { snippet, statistics } = video;

    return NextResponse.json({
      title: snippet?.title,
      description: snippet?.description,
      views: new Intl.NumberFormat().format(Number(statistics?.viewCount || 0)),
      publishedAt: new Date(snippet?.publishedAt || '').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    });
  } catch (error) {
    console.error('Error fetching video info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video information' },
      { status: 500 }
    );
  }
} 