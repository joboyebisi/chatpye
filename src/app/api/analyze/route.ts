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
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the analysis in the background
    (async () => {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const analysisPrompt = videoInfo.hasTranscript
          ? `Analyze this YouTube video transcript based on the user's question:
            Title: ${videoInfo.title}
            Description: ${videoInfo.description}
            Transcript: ${videoInfo.transcript}
            
            User's Question: ${prompt}
            
            Please provide a detailed analysis that:
            1. Directly addresses the user's question
            2. Uses specific examples from the transcript
            3. Provides context and explanations
            4. Maintains a professional but engaging tone`
          : `Analyze this YouTube video based on the user's question:
            Title: ${videoInfo.title}
            Description: ${videoInfo.description}
            Vision Analysis: ${videoInfo.visionAnalysis}
            
            User's Question: ${prompt}
            
            Please provide a detailed analysis that:
            1. Directly addresses the user's question based on the video content analysis
            2. Uses specific examples from the vision analysis
            3. Provides context and explanations
            4. Maintains a professional but engaging tone
            Note: This analysis is based on video content analysis as no transcript is available.`;

        const result = await model.generateContent(analysisPrompt);
        const analysis = result.response.text();
        
        await writer.write(encoder.encode(analysis));
        await writer.close();
      } catch (error) {
        console.error('Error in analysis:', error);
        await writer.write(encoder.encode('Error analyzing video. Please try again.'));
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { error: 'Failed to analyze video' },
      { status: 500 }
    );
  }
} 