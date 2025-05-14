import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getVideoInfo, extractVideoId } from '@/lib/youtube';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

    // Get video info, transcript, and vision analysis
    const videoInfo = await getVideoInfo(videoId);

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
          
          const analysisPrompt = videoInfo.hasTranscript
            ? `Based on the following video transcript and the user's question, provide a detailed response:
              Title: ${videoInfo.title}
              Description: ${videoInfo.description}
              Transcript: ${videoInfo.transcript}
              User Question: ${prompt}
              
              Please provide a comprehensive answer that:
              1. Directly addresses the user's question
              2. References specific parts of the transcript when relevant
              3. Maintains a professional and helpful tone
              4. Includes context and explanations where needed`
            : `Based on the following video metadata and the user's question, provide a detailed response:
              Title: ${videoInfo.title}
              Description: ${videoInfo.description}
              User Question: ${prompt}
              
              Please provide a comprehensive answer that:
              1. Directly addresses the user's question
              2. Uses the available metadata to provide context
              3. Maintains a professional and helpful tone
              4. Includes explanations where needed
              Note: This response is based on video metadata as no transcript is available.`;

          const result = await model.generateContent(analysisPrompt);
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
          controller.enqueue(encoder.encode('Error generating response. Please try again.'));
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