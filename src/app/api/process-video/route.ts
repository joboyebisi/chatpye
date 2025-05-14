import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Simple in-memory cache (replace with Redis or similar in production)
const videoCache = new Map();

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

    // Get video info using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // First, get video metadata
    const metadataResult = await model.generateContent([
      "Extract the title, description, view count, and publish date from this video. Format the response as JSON with these fields: title, description, views, publishedAt",
      {
        fileData: {
          fileUri: youtubeUrl,
          mimeType: 'video/youtube'
        }
      }
    ]);

    const videoInfo = JSON.parse(metadataResult.response.text());

    // Return video info immediately
    const response = {
      status: 'processing',
      message: 'Initial analysis in progress',
      videoInfo,
      hasTranscript: false
    };

    // Start analysis in the background
    try {
      // Get detailed analysis
      const analysisResult = await model.generateContent([
        "Please analyze this video and provide key insights. Include:\n1. Main topics covered\n2. Key points\n3. Technical concepts (if any)\n4. Potential questions users might ask\n5. Whether this video has a transcript available",
        {
          fileData: {
            fileUri: youtubeUrl,
            mimeType: 'video/youtube'
          }
        }
      ]);

      const analysis = analysisResult.response.text();
      const hasTranscript = analysis.toLowerCase().includes('transcript available');

      // Cache the analysis
      videoCache.set(youtubeUrl, {
        ...response,
        initialAnalysis: analysis,
        hasTranscript,
        timestamp: Date.now()
      });

      return NextResponse.json({
        ...response,
        initialAnalysis: analysis,
        hasTranscript
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