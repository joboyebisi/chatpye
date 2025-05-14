import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getVideoInfo, extractVideoId } from '@/lib/youtube';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
      return NextResponse.json({
        status: 'completed',
        message: 'Video analysis retrieved from cache',
        analysis: videoCache.get(youtubeUrl)
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

    // Get video info, transcript, and vision analysis
    const videoInfo = await getVideoInfo(videoId);

    // Start instant analysis with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Generate initial analysis based on available data
    const prompt = videoInfo.hasTranscript
      ? `Analyze this YouTube video transcript and provide key insights:
        Title: ${videoInfo.title}
        Description: ${videoInfo.description}
        Transcript: ${videoInfo.transcript}
        
        Please provide:
        1. Main topics covered
        2. Key points
        3. Technical concepts (if any)
        4. Potential questions users might ask`
      : `Analyze this YouTube video based on the vision analysis and metadata:
        Title: ${videoInfo.title}
        Description: ${videoInfo.description}
        Vision Analysis: ${videoInfo.visionAnalysis}
        
        Please provide:
        1. Main topics covered (based on vision analysis and metadata)
        2. Key points that were identified
        3. Technical concepts that were shown
        4. Potential questions users might ask
        Note: This analysis is based on video content analysis and metadata as no transcript is available.`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    // Cache the analysis
    videoCache.set(youtubeUrl, {
      analysis,
      videoInfo,
      timestamp: Date.now()
    });

    return NextResponse.json({ 
      status: 'processing',
      message: videoInfo.hasTranscript 
        ? 'Initial analysis complete using video transcript'
        : 'Initial analysis complete using video content analysis',
      initialAnalysis: analysis,
      hasTranscript: videoInfo.hasTranscript,
      videoInfo: {
        title: videoInfo.title,
        description: videoInfo.description,
        views: videoInfo.views,
        publishedAt: videoInfo.publishedAt
      }
    });
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: 'Failed to process video' },
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