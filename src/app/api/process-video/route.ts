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
    
    // First, get video metadata with a more specific prompt
    const metadataResult = await model.generateContent([
      `Extract the following information from this YouTube video (${youtubeUrl}):
      1. Title: The exact video title
      2. Description: The full video description
      3. Views: The view count in a readable format (e.g., "1.2M views")
      4. PublishedAt: The publish date in ISO format
      
      Format the response as a JSON object with these exact fields:
      {
        "title": "string",
        "description": "string",
        "views": "string",
        "publishedAt": "string"
      }`,
      {
        fileData: {
          fileUri: youtubeUrl,
          mimeType: 'video/youtube'
        }
      }
    ]);

    let videoInfo;
    try {
      const responseText = metadataResult.response.text();
      videoInfo = JSON.parse(responseText);
      
      // Validate required fields
      if (!videoInfo.title || !videoInfo.description || !videoInfo.views || !videoInfo.publishedAt) {
        throw new Error('Missing required video information');
      }
    } catch (parseError) {
      console.error('Error parsing video metadata:', parseError);
      return NextResponse.json(
        { error: 'Failed to extract video information' },
        { status: 500 }
      );
    }

    // Return video info immediately
    const response = {
      status: 'processing',
      message: 'Initial analysis in progress',
      videoInfo,
      hasTranscript: false
    };

    // Start analysis in the background
    try {
      // Get detailed analysis with a more structured prompt
      const analysisResult = await model.generateContent([
        `Analyze this YouTube video (${youtubeUrl}) and provide a structured response:
        1. Main Topics: List the main topics covered
        2. Key Points: List the most important points
        3. Technical Concepts: List any technical terms or concepts discussed
        4. Potential Questions: List common questions viewers might have
        5. Transcript Status: Indicate if a transcript is available
        
        Format the response in a clear, structured way.`,
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