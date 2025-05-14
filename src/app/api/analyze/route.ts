import { NextResponse } from 'next/server';
import { analyzeVideo } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { youtubeUrl, prompt } = await request.json();

    // Validate required fields
    if (!youtubeUrl || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: youtubeUrl and prompt' },
        { status: 400 }
      );
    }

    // Validate YouTube URL format
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(youtubeUrl)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    // Log environment variable status
    console.log('Environment variables status:');
    console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'Present' : 'Missing');

    // Check for required API keys
    if (!process.env.GOOGLE_API_KEY) {
      console.error('Missing GOOGLE_API_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API key' },
        { status: 500 }
      );
    }

    try {
      // Get streaming response from Gemini
      const stream = await analyzeVideo(youtubeUrl, prompt);
      
      // Return the stream
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (error: any) {
      console.error('Error analyzing video:', error);

      // Handle specific error cases
      if (error.message?.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a few minutes.' },
          { status: 429 }
        );
      }

      if (error.message?.includes('Invalid YouTube URL')) {
        return NextResponse.json(
          { error: 'Invalid YouTube URL format. Please provide a valid YouTube video URL.' },
          { status: 400 }
        );
      }

      // Return error response
      return NextResponse.json(
        { 
          error: 'Error analyzing video',
          details: error.message || 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 