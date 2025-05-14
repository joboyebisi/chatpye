import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    // Check for API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set in environment variables' },
        { status: 500 }
      );
    }

    const { youtubeUrl, prompt } = await request.json();

    if (!youtubeUrl || !prompt) {
      return NextResponse.json(
        { error: 'YouTube URL and prompt are required' },
        { status: 400 }
      );
    }

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Create streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start processing in the background
    (async () => {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        // Send initial loading message
        await writer.write(encoder.encode('{"type":"loading","content":"Analyzing video..."}\n'));

        // Generate response
        const result = await model.generateContent([
          `You are a helpful AI assistant analyzing a YouTube video. The user asks: "${prompt}"\n\nPlease provide a detailed response that:\n1. Directly addresses the user's question\n2. References specific parts of the video when relevant\n3. Maintains a professional and educational tone\n4. Provides context and explanations\n5. Uses timestamps (MM:SS) when referring to specific moments\n\nVideo URL: ${youtubeUrl}`,
          {
            fileData: {
              fileUri: youtubeUrl,
              mimeType: 'video/youtube'
            }
          }
        ]);

        const response = result.response;
        const text = response.text();

        // Send the response in chunks
        const chunkSize = 50;
        for (let i = 0; i < text.length; i += chunkSize) {
          const chunk = text.slice(i, i + chunkSize);
          await writer.write(encoder.encode(`{"type":"content","content":"${chunk}"}\n`));
          // Add a small delay between chunks for better streaming effect
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Send completion message
        await writer.write(encoder.encode('{"type":"done"}\n'));
      } catch (error) {
        console.error('Error generating response:', error);
        await writer.write(encoder.encode(`{"type":"error","content":"Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}"}\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 