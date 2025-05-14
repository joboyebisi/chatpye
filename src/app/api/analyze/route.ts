import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getVideoInfo, extractVideoId } from '@/lib/youtube';

// Initialize Gemini with proper error handling
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(request: Request) {
  try {
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

    // Get video info and transcript
    const videoInfo = await getVideoInfo(videoId);

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
          
          let result;
          if (videoInfo.hasTranscript) {
            // Use transcript for analysis
            result = await model.generateContent(
              `Based on the following video transcript and the user's question, provide a detailed response:
              Title: ${videoInfo.title}
              Description: ${videoInfo.description}
              Transcript: ${videoInfo.transcript}
              User Question: ${prompt}
              
              Please provide a comprehensive answer that:
              1. Directly addresses the user's question
              2. References specific parts of the transcript when relevant
              3. Maintains a professional and helpful tone
              4. Includes context and explanations where needed`
            );
          } else {
            // Use direct YouTube URL analysis
            result = await model.generateContent([
              `Based on the video content, please answer the following question:\n${prompt}\n\nPlease provide a comprehensive answer that:\n1. Directly addresses the question\n2. References specific parts of the video when relevant\n3. Maintains a professional and helpful tone\n4. Includes context and explanations where needed`,
              {
                fileData: {
                  fileUri: youtubeUrl,
                  mimeType: 'video/youtube'
                }
              }
            ]);
          }

          const response = result.response.text();
          
          // Send the response in chunks
          const chunks = response.split('\n');
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk + '\n'));
            await new Promise(resolve => setTimeout(resolve, 50)); // Add small delay between chunks
          }
          
          controller.close();
        } catch (error) {
          console.error('Error generating response:', error);
          controller.enqueue(encoder.encode(`Error: ${error instanceof Error ? error.message : 'Failed to generate response. Please try again.'}`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 