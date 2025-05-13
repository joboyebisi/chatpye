import { NextResponse } from 'next/server';
import { analyzeVideo } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { youtubeUrl, prompt } = await req.json();

    if (!youtubeUrl || !prompt) {
      return NextResponse.json(
        { error: 'YouTube URL and prompt are required' },
        { status: 400 }
      );
    }

    const stream = await analyzeVideo(youtubeUrl, prompt);
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in Gemini analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze video' },
      { status: 500 }
    );
  }
} 