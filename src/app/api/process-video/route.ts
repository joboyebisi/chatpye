import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getVideoInfo, extractVideoId } from '@/lib/youtube';

// Initialize Gemini with proper error handling
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Simple in-memory cache (replace with Redis or similar in production)
const videoCache = new Map();

export async function POST(request: Request) {
  try {
    const { youtubeUrl } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Check cache first
    if (videoCache.has(youtubeUrl)) {
      const cachedData = videoCache.get(youtubeUrl);
      return NextResponse.json({
        status: 'completed',
        message: 'Video analysis retrieved from cache',
        ...cachedData
      });
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

    // Return video info immediately
    const response = {
      status: 'processing',
      message: videoInfo.hasTranscript 
        ? 'Initial analysis complete using video transcript'
        : 'Initial analysis complete using video content analysis',
      hasTranscript: videoInfo.hasTranscript,
      videoInfo: {
        title: videoInfo.title,
        description: videoInfo.description,
        views: videoInfo.views,
        publishedAt: videoInfo.publishedAt
      }
    };

    // Start analysis in the background
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      let result;
      if (videoInfo.hasTranscript) {
        // Use transcript for analysis
        result = await model.generateContent(
          `Analyze this YouTube video transcript and provide key insights:
          Title: ${videoInfo.title}
          Description: ${videoInfo.description}
          Transcript: ${videoInfo.transcript}
          
          Please provide:
          1. Main topics covered
          2. Key points
          3. Technical concepts (if any)
          4. Potential questions users might ask`
        );
      } else {
        // Use direct YouTube URL analysis
        result = await model.generateContent([
          "Please analyze this video and provide key insights. Include:\n1. Main topics covered\n2. Key points\n3. Technical concepts (if any)\n4. Potential questions users might ask",
          {
            fileData: {
              fileUri: youtubeUrl,
              mimeType: 'video/youtube'
            }
          }
        ]);
      }

      const analysis = result.response.text();

      // Cache the analysis
      videoCache.set(youtubeUrl, {
        ...response,
        initialAnalysis: analysis,
        timestamp: Date.now()
      });

      return NextResponse.json({
        ...response,
        initialAnalysis: analysis
      });
    } catch (analysisError) {
      console.error('Error in analysis:', analysisError);
      // Still return video info even if analysis fails
      return NextResponse.json({
        ...response,
        error: 'Failed to generate analysis. Please try again.',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processVideoInBackground(youtubeUrl: string) {
  try {
    // Here you would:
    // 1. Extract video transcript
    // 2. Perform detailed analysis
    // 3. Update cache with complete analysis
    // 4. Notify client of completion (via WebSocket or polling)
    
    // Simulate background processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Update cache with complete analysis
    const currentCache = videoCache.get(youtubeUrl);
    if (currentCache) {
      videoCache.set(youtubeUrl, {
        ...currentCache,
        completeAnalysis: true,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Error in background processing:', error);
  }
} 